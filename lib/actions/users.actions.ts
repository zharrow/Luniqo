'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import type { Profile } from '@/types/database.types'

// ============================================================================
// SERVER ACTIONS FOR USER MANAGEMENT
// These actions require admin privileges and use the service role
// ============================================================================

// Helper to create admin client with service role
function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createSupabaseClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export interface CreateEmployeeInput {
  email: string
  password: string  // For Supabase Auth (dashboard login)
  first_name: string
  last_name: string
  avatar_url?: string
  room_ids?: string[] // Rooms to grant access to
}

export interface CreateOwnerInput {
  email: string
  password: string
  first_name: string
  last_name: string
}

/**
 * Create a new employee with Supabase Auth + Profile
 * This requires server-side execution with service role
 */
export async function createEmployee(
  enterpriseId: string,
  createdById: string,
  input: CreateEmployeeInput
): Promise<{ success: boolean; data?: Profile; error?: string }> {
  try {
    const supabase = getAdminClient()

    // 1. Create user in Supabase Auth (triggers auto-creation of profile)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: input.first_name,
        last_name: input.last_name,
        role: 'Employee'
      }
    })

    if (authError || !authData.user) {
      console.error('Error creating auth user:', authError)
      return { success: false, error: authError?.message || 'Failed to create user' }
    }

    const userId = authData.user.id

    // 2. Generate unique username (e.g., "Marie D")
    const username = await generateUniqueUsername(input.first_name, input.last_name, supabase)

    // 3. Update the auto-created profile with enterprise_id, username, and created_by
    // Use type assertion to bypass TypeScript strict checks with admin client
    const profileUpdate = await (supabase as any)
      .from('profiles')
      .update({
        enterprise_id: enterpriseId,
        username: username,
        created_by_id: createdById,
        avatar_url: input.avatar_url || null
      })
      .eq('id', userId)
      .select()
      .single()

    const profile = profileUpdate.data
    const profileError = profileUpdate.error

    if (profileError) {
      console.error('Error updating profile:', profileError)
      // Rollback: delete the auth user if profile update fails
      await supabase.auth.admin.deleteUser(userId)
      return { success: false, error: 'Failed to update profile' }
    }

    // 4. Assign rooms if provided
    if (input.room_ids && input.room_ids.length > 0) {
      const assignments = input.room_ids.map(room_id => ({
        employee_id: userId,
        room_id
      }))

      const { error: roomError } = await (supabase as any)
        .from('employee_room_access')
        .insert(assignments)

      if (roomError) {
        console.error('Error assigning rooms:', roomError)
        // Note: We don't rollback here, just log the error
      }
    }

    return { success: true, data: profile }
  } catch (error) {
    console.error('Unexpected error in createEmployee:', error)
    return { success: false, error: 'Unexpected error occurred' }
  }
}

/**
 * Create a new owner with Supabase Auth + Profile
 * This requires server-side execution with service role
 */
export async function createOwner(
  input: CreateOwnerInput
): Promise<{ success: boolean; data?: Profile; error?: string }> {
  try {
    const supabase = getAdminClient()

    // 1. Create user in Supabase Auth (triggers auto-creation of profile)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: input.first_name,
        last_name: input.last_name,
        role: 'Owner'
      }
    })

    if (authError || !authData.user) {
      console.error('Error creating auth user:', authError)
      return { success: false, error: authError?.message || 'Failed to create user' }
    }

    const userId = authData.user.id

    // 2. The profile is auto-created by the trigger with basic info
    // Fetch the created profile
    const { data: profile, error: profileError } = await (supabase as any)
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return { success: false, error: 'Failed to fetch profile' }
    }

    return { success: true, data: profile }
  } catch (error) {
    console.error('Unexpected error in createOwner:', error)
    return { success: false, error: 'Unexpected error occurred' }
  }
}

/**
 * Generate unique username for employee
 * Format: "Prénom N" where N is first letter(s) of last name
 */
async function generateUniqueUsername(
  firstName: string,
  lastName: string,
  supabase: any
): Promise<string> {
  let suffixLength = 1
  let username = `${firstName} ${lastName.substring(0, suffixLength).toUpperCase()}`

  while (true) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single()

    if (error?.code === 'PGRST116') {
      // Not found = username is available
      return username
    }

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    // Collision - add more letters
    suffixLength++
    if (suffixLength > lastName.length) {
      // Fallback: add random number
      username = `${firstName} ${lastName[0].toUpperCase()}${Math.floor(Math.random() * 100)}`
      break
    }
    username = `${firstName} ${lastName.substring(0, suffixLength).toUpperCase()}`
  }

  return username
}
