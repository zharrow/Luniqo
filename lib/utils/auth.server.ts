// Server-side authentication utilities
// Updated for Unified Profiles Architecture (2025-12-07)
import { createClient } from '@/lib/supabase/server'
import type { UserRole, Profile, AuthSession } from '@/types/auth.types'

/**
 * Get current session (server-side only)
 * Returns the full AuthSession with profile, role, and enterprise
 */
export async function getCurrentSession(): Promise<AuthSession | null> {
  const supabase: any = await createClient()

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return null
  }

  // Get profile from unified profiles table using auth.users.id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .eq('is_active', true)
    .single()

  if (profileError || !profile) {
    return null
  }

  // Build session based on role
  const authSession: AuthSession = {
    user: profile as Profile,
    role: profile.role as UserRole
  }

  // For Owner, fetch their enterprise
  if (profile.role === 'Owner') {
    const { data: enterprise } = await supabase
      .from('enterprise')
      .select('*')
      .eq('owner_id', profile.id)
      .single()

    authSession.enterprise = enterprise || null
  }

  // For Employee, fetch their enterprise and accessible rooms
  if (profile.role === 'Employee' && profile.enterprise_id) {
    const { data: enterprise } = await supabase
      .from('enterprise')
      .select('*')
      .eq('id', profile.enterprise_id)
      .single()

    authSession.enterprise = enterprise || null

    // Get accessible rooms
    const { data: rooms } = await supabase
      .from('employee_room_access')
      .select('room_id')
      .eq('employee_id', profile.id)

    authSession.accessibleRooms = (rooms || []).map((r: { room_id: string }) => r.room_id)
  }

  return authSession
}

/**
 * Get current user profile only (lighter query)
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase: any = await createClient()

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return null
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .eq('is_active', true)
    .single()

  if (error || !profile) {
    return null
  }

  return profile as Profile
}

/**
 * Check if current user has one of the required roles
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<AuthSession | null> {
  const session = await getCurrentSession()

  if (!session) {
    return null
  }

  if (!allowedRoles.includes(session.role)) {
    return null
  }

  return session
}

/**
 * Check if current user is a Developer
 */
export async function isDeveloper(): Promise<boolean> {
  const session = await getCurrentSession()
  return session?.role === 'Developer'
}

/**
 * Check if current user is an Owner
 */
export async function isOwner(): Promise<boolean> {
  const session = await getCurrentSession()
  return session?.role === 'Owner'
}

/**
 * Check if current user is an Employee
 */
export async function isEmployee(): Promise<boolean> {
  const session = await getCurrentSession()
  return session?.role === 'Employee'
}
