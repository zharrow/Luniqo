'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { sendGuardianInvitation } from '@/lib/services/email.service'

// ============================================================================
// SERVER ACTIONS FOR GUARDIAN INVITATION & DATA REPAIR
// These actions require admin privileges and use the service role
// ============================================================================

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Invite a guardian to the parent portal
 * Creates an invitation token and sends an email via Resend
 */
export async function inviteGuardianToPortal(input: {
  guardianId: string
  invitedById: string
  nurseryId: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getAdminClient()
    const { guardianId, invitedById, nurseryId } = input

    // 1. Fetch guardian with family info
    const { data: guardian, error: guardianError } = await supabase
      .from('guardian')
      .select('id, first_name, last_name, email, family_id')
      .eq('id', guardianId)
      .single()

    if (guardianError || !guardian) {
      return { success: false, error: 'Tuteur introuvable' }
    }

    if (!guardian.email) {
      return { success: false, error: 'Ce tuteur n\'a pas d\'adresse email renseignee' }
    }

    // 2. Check if guardian already has a portal account
    const { data: existingUser } = await supabase
      .from('guardian_user')
      .select('guardian_id')
      .eq('guardian_id', guardianId)
      .maybeSingle()

    if (existingUser) {
      return { success: false, error: 'Ce tuteur a deja un compte sur le portail' }
    }

    // 3. Invalidate any previous pending invitations for this guardian
    await supabase
      .from('guardian_invitation')
      .update({ used_at: new Date().toISOString() })
      .eq('guardian_id', guardianId)
      .is('used_at', null)

    // 4. Generate cryptographic token (64 hex chars = 32 bytes)
    const token = crypto.randomBytes(32).toString('hex')

    // 5. Insert invitation (expires in 7 days)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const { error: insertError } = await supabase
      .from('guardian_invitation')
      .insert({
        guardian_id: guardianId,
        email: guardian.email,
        token,
        expires_at: expiresAt.toISOString(),
        invited_by_id: invitedById,
        nursery_id: nurseryId,
      })

    if (insertError) {
      console.error('Error creating invitation:', insertError)
      return { success: false, error: 'Erreur lors de la creation de l\'invitation' }
    }

    // 6. Get nursery name for the email
    const { data: nursery } = await supabase
      .from('nursery')
      .select('name')
      .eq('id', nurseryId)
      .single()

    const nurseryName = nursery?.name || 'Votre creche'

    // 7. Build invitation URL and send email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const invitationUrl = `${appUrl}/portal/register?guardian_id=${guardianId}&token=${token}`

    const emailResult = await sendGuardianInvitation({
      to: guardian.email,
      guardianFirstName: guardian.first_name,
      guardianLastName: guardian.last_name,
      nurseryName,
      invitationUrl,
    })

    if (!emailResult.success) {
      console.error('Email send failed:', emailResult.error)
      // Invitation is created but email failed — still return success
      // Owner can re-send later
      return { success: true, error: 'Invitation creee mais l\'email n\'a pas pu etre envoye' }
    }

    return { success: true }
  } catch (error) {
    console.error('Unexpected error in inviteGuardianToPortal:', error)
    return { success: false, error: 'Erreur inattendue' }
  }
}

/**
 * Validate an invitation token
 * Returns the guardian's email if valid, or an error
 */
export async function validateInvitationToken(input: {
  token: string
  guardianId: string
}): Promise<{ valid: boolean; email?: string; guardianName?: string; error?: string }> {
  try {
    const supabase = getAdminClient()
    const { token, guardianId } = input

    // Find the invitation
    const { data: invitation, error } = await supabase
      .from('guardian_invitation')
      .select('id, guardian_id, email, expires_at, used_at')
      .eq('token', token)
      .eq('guardian_id', guardianId)
      .single()

    if (error || !invitation) {
      return { valid: false, error: 'Lien d\'invitation invalide' }
    }

    // Check if already used
    if (invitation.used_at) {
      return { valid: false, error: 'Cette invitation a deja ete utilisee' }
    }

    // Check expiration
    if (new Date(invitation.expires_at) < new Date()) {
      return { valid: false, error: 'Cette invitation a expire. Contactez votre creche pour en recevoir une nouvelle.' }
    }

    // Get guardian name
    const { data: guardian } = await supabase
      .from('guardian')
      .select('first_name, last_name')
      .eq('id', guardianId)
      .single()

    return {
      valid: true,
      email: invitation.email,
      guardianName: guardian ? `${guardian.first_name} ${guardian.last_name}` : undefined,
    }
  } catch (error) {
    console.error('Unexpected error in validateInvitationToken:', error)
    return { valid: false, error: 'Erreur de validation' }
  }
}

/**
 * Register a guardian user account (admin-created, email auto-confirmed)
 * This skips email verification since the user proved email access via invitation link
 */
export async function registerGuardianUser(input: {
  email: string
  password: string
  guardianId: string
  token: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getAdminClient()
    const { email, password, guardianId, token } = input

    // 1. Validate the invitation token first
    const validation = await validateInvitationToken({ token, guardianId })
    if (!validation.valid) {
      return { success: false, error: validation.error || 'Invitation invalide' }
    }

    // 2. Check if user already exists with this email
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === email)

    if (existingUser) {
      // Check if they already have guardian_user record
      const { data: existingGuardianUser } = await supabase
        .from('guardian_user')
        .select('id')
        .eq('user_id', existingUser.id)
        .maybeSingle()

      if (existingGuardianUser) {
        return { success: false, error: 'Un compte existe deja avec cet email' }
      }

      // User exists but no guardian_user record - link them
      const { error: linkError } = await supabase
        .from('guardian_user')
        .insert({
          guardian_id: guardianId,
          user_id: existingUser.id,
          can_view_photos: true,
          can_receive_messages: true,
          can_update_info: false,
          terms_accepted_at: new Date().toISOString(),
          privacy_policy_accepted_at: new Date().toISOString(),
        })

      if (linkError) {
        console.error('Error linking existing user to guardian:', linkError)
        return { success: false, error: 'Erreur lors de la liaison du compte' }
      }

      await markInvitationUsed(token)
      return { success: true }
    }

    // 3. Create new user with admin API (email auto-confirmed)
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email since they proved access via invitation
      user_metadata: {
        role: 'Guardian',
      },
    })

    if (createError || !newUser.user) {
      console.error('Error creating user:', createError)
      return { success: false, error: 'Erreur lors de la creation du compte' }
    }

    // 4. Create guardian_user record
    const { error: guardianUserError } = await supabase
      .from('guardian_user')
      .insert({
        guardian_id: guardianId,
        user_id: newUser.user.id,
        can_view_photos: true,
        can_receive_messages: true,
        can_update_info: false,
        terms_accepted_at: new Date().toISOString(),
        privacy_policy_accepted_at: new Date().toISOString(),
      })

    if (guardianUserError) {
      console.error('Error creating guardian_user:', guardianUserError)
      // Clean up auth user on failure
      await supabase.auth.admin.deleteUser(newUser.user.id)
      return { success: false, error: 'Erreur lors de la creation du profil' }
    }

    // 5. Mark invitation as used
    await markInvitationUsed(token)

    return { success: true }
  } catch (error) {
    console.error('Unexpected error in registerGuardianUser:', error)
    return { success: false, error: 'Erreur inattendue' }
  }
}

/**
 * Mark an invitation token as used after successful registration
 */
export async function markInvitationUsed(token: string): Promise<{ success: boolean }> {
  try {
    const supabase = getAdminClient()

    const { error } = await supabase
      .from('guardian_invitation')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token)

    if (error) {
      console.error('Error marking invitation as used:', error)
      return { success: false }
    }

    return { success: true }
  } catch (error) {
    console.error('Unexpected error in markInvitationUsed:', error)
    return { success: false }
  }
}

/**
 * Debug function to check guardian-child data for a specific guardian
 */
export async function debugGuardianChildData(guardianId: string): Promise<{
  guardian: any
  family: any
  childrenInFamily: any[]
  guardianChildLinks: any[]
  guardianUser: any
}> {
  const supabase = getAdminClient()

  // Get guardian info
  const { data: guardian } = await supabase
    .from('guardian')
    .select('*')
    .eq('id', guardianId)
    .single()

  // Get family info if guardian exists
  let family = null
  let childrenInFamily: any[] = []
  if (guardian?.family_id) {
    const { data: familyData } = await supabase
      .from('family')
      .select('*')
      .eq('id', guardian.family_id)
      .single()
    family = familyData

    // Get children in this family
    const { data: children } = await supabase
      .from('child')
      .select('id, first_name, last_name, family_id, nursery_id')
      .eq('family_id', guardian.family_id)
    childrenInFamily = children || []
  }

  // Get guardian_child links
  const { data: links } = await supabase
    .from('guardian_child')
    .select('*, child:child_id(id, first_name, last_name)')
    .eq('guardian_id', guardianId)

  // Get guardian_user record
  const { data: guardianUser } = await supabase
    .from('guardian_user')
    .select('*')
    .eq('guardian_id', guardianId)
    .maybeSingle()

  return {
    guardian,
    family,
    childrenInFamily,
    guardianChildLinks: links || [],
    guardianUser
  }
}

/**
 * Repair missing guardian-child links for a nursery
 * Links all guardians to children in the same family where links don't exist
 */
export async function repairGuardianChildLinks(nurseryId: string): Promise<{
  success: boolean
  linksCreated: number
  error?: string
}> {
  try {
    const supabase = getAdminClient()

    // Get all children in this nursery with their family_id
    const { data: children, error: childrenError } = await supabase
      .from('child')
      .select('id, family_id, first_name, last_name')
      .eq('nursery_id', nurseryId)
      .not('family_id', 'is', null)

    if (childrenError) {
      console.error('Error fetching children:', childrenError)
      return { success: false, linksCreated: 0, error: 'Erreur lors de la récupération des enfants' }
    }

    if (!children || children.length === 0) {
      return { success: true, linksCreated: 0 }
    }

    // Get unique family IDs
    const familyIds = [...new Set(children.map(c => c.family_id).filter(Boolean))]

    // Get all guardians for these families
    const { data: guardians, error: guardiansError } = await supabase
      .from('guardian')
      .select('id, family_id, first_name, last_name, relationship_to_child, has_custody')
      .in('family_id', familyIds)
      .eq('is_active', true)

    if (guardiansError) {
      console.error('Error fetching guardians:', guardiansError)
      return { success: false, linksCreated: 0, error: 'Erreur lors de la récupération des tuteurs' }
    }

    if (!guardians || guardians.length === 0) {
      return { success: true, linksCreated: 0 }
    }

    // Get existing guardian_child links
    const childIds = children.map(c => c.id)
    const { data: existingLinks } = await supabase
      .from('guardian_child')
      .select('guardian_id, child_id')
      .in('child_id', childIds)

    const existingLinkSet = new Set(
      (existingLinks || []).map(l => `${l.guardian_id}-${l.child_id}`)
    )

    // Build new links
    const newLinks: any[] = []

    for (const child of children) {
      const familyGuardians = guardians.filter(g => g.family_id === child.family_id)

      for (let i = 0; i < familyGuardians.length; i++) {
        const guardian = familyGuardians[i]
        const linkKey = `${guardian.id}-${child.id}`

        if (!existingLinkSet.has(linkKey)) {
          newLinks.push({
            guardian_id: guardian.id,
            child_id: child.id,
            relationship: guardian.relationship_to_child || null,
            is_primary_contact: i === 0, // First guardian is primary
            can_authorize_medical: guardian.has_custody ?? false
          })
        }
      }
    }

    if (newLinks.length === 0) {
      return { success: true, linksCreated: 0 }
    }

    // Insert new links
    const { error: insertError } = await supabase
      .from('guardian_child')
      .insert(newLinks)

    if (insertError) {
      console.error('Error inserting guardian_child links:', insertError)
      return { success: false, linksCreated: 0, error: 'Erreur lors de la création des liens' }
    }

    console.log(`Created ${newLinks.length} guardian-child links for nursery ${nurseryId}`)
    return { success: true, linksCreated: newLinks.length }
  } catch (error) {
    console.error('Unexpected error in repairGuardianChildLinks:', error)
    return { success: false, linksCreated: 0, error: 'Erreur inattendue' }
  }
}
