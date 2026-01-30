'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { sendGuardianInvitation } from '@/lib/services/email.service'

// ============================================================================
// SERVER ACTIONS FOR GUARDIAN INVITATION
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
