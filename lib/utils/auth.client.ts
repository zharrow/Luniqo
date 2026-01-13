// Client-side authentication utilities
// Updated for Unified Profiles Architecture (2025-12-07)
import { createClient } from '@/lib/supabase/client'
import type { AuthResponse, UsernameCredentials, Profile, UserRole } from '@/types/auth.types'
import bcrypt from 'bcryptjs'

/**
 * Hash a PIN code
 */
export async function hashPin(pin: string): Promise<string> {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(pin, salt)
}

/**
 * Verify a PIN code against a hash
 */
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash)
}

/**
 * Login with Username + PIN (for Employee tablet interface)
 * Uses profiles table with role='Employee'
 */
export async function loginWithPin(credentials: UsernameCredentials): Promise<AuthResponse> {
  try {
    const supabase: any = createClient()

    // Find employee by username
    const { data: employee, error } = await supabase
      .from('profiles')
      .select('*, enterprise:enterprise_id(*)')
      .eq('username', credentials.username)
      .eq('role', 'Employee')
      .eq('is_active', true)
      .single()

    if (error || !employee) {
      return { success: false, error: 'Utilisateur non trouvé' }
    }

    // Verify PIN
    if (!employee.pin_hash) {
      return { success: false, error: 'PIN non configuré. Connectez-vous d\'abord via le dashboard.' }
    }

    const isValidPin = await verifyPin(credentials.pin, employee.pin_hash)
    if (!isValidPin) {
      return { success: false, error: 'Code PIN incorrect' }
    }

    // Get accessible rooms for this employee
    const { data: employeeRoomAccess } = await supabase
      .from('employee_room_access')
      .select('room_id')
      .eq('employee_id', employee.id)

    const accessibleRooms = (employeeRoomAccess || []).map((era: { room_id: string }) => era.room_id)

    return {
      success: true,
      data: employee as Profile,
      enterprise: employee.enterprise,
      role: 'Employee',
      accessibleRooms
    }
  } catch (error) {
    console.error('Login error:', error)
    return { success: false, error: 'Échec de la connexion' }
  }
}

/**
 * Login with email/password (for Developer/Owner/Employee dashboard)
 * Uses Supabase Auth + profiles table
 */
export async function loginWithEmail(email: string, password: string): Promise<AuthResponse> {
  try {
    console.log('🔑 loginWithEmail called with:', { email })
    const supabase: any = createClient()

    // Sign in with Supabase Auth
    console.log('📡 Calling Supabase Auth...')
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (authError || !authData.user) {
      console.error('❌ Supabase Auth failed:', authError)
      return { success: false, error: 'Identifiants invalides' }
    }

    console.log('✅ Supabase Auth successful')

    // Get profile from unified profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .eq('is_active', true)
      .single()

    if (profileError || !profile) {
      console.error('❌ Profile not found:', profileError)
      return { success: false, error: 'Profil non trouvé' }
    }

    console.log('✅ Profile found, role:', profile.role)

    // For Owner and Employee, fetch enterprise
    let enterprise = null
    let accessibleRooms: string[] = []
    let accessibleModules: string[] = []

    if (profile.role === 'Owner') {
      const { data: ent } = await supabase
        .from('enterprise')
        .select('*')
        .eq('owner_id', profile.id)
        .single()
      enterprise = ent
      console.log('✅ Enterprise found:', enterprise?.id)

      // Load accessible modules for this enterprise
      if (enterprise?.id) {
        const { data: modules } = await supabase
          .from('enterprise_module_access')
          .select('module_id')
          .eq('enterprise_id', enterprise.id)
          .eq('is_active', true)

        accessibleModules = (modules || []).map((m: any) => m.module_id)
        console.log('✅ Accessible modules loaded:', accessibleModules.length)
      }
    } else if (profile.role === 'Employee') {
      if (profile.enterprise_id) {
        const { data: ent } = await supabase
          .from('enterprise')
          .select('*')
          .eq('id', profile.enterprise_id)
          .single()
        enterprise = ent

        // Get accessible rooms
        const { data: rooms } = await supabase
          .from('employee_room_access')
          .select('room_id')
          .eq('employee_id', profile.id)
        accessibleRooms = (rooms || []).map((r: { room_id: string }) => r.room_id)
      }
    }

    return {
      success: true,
      data: profile as Profile,
      enterprise: enterprise || undefined,
      role: profile.role as UserRole,
      accessibleRooms: profile.role === 'Employee' ? accessibleRooms : undefined,
      accessibleModules: profile.role === 'Owner' ? accessibleModules : undefined
    }
  } catch (error) {
    console.error('❌ Login error:', error)
    return { success: false, error: 'Échec de la connexion' }
  }
}

/**
 * Logout
 */
export async function logout() {
  const supabase: any = createClient()
  await supabase.auth.signOut()
}

/**
 * Login employee with PIN (flow: select employee from list -> enter PIN)
 * Used on tablet when employee is selected from a list
 * @param employeeId - The specific employee ID to authenticate
 * @param pin - The 4-digit PIN code
 */
export async function loginEmployeeWithPin(employeeId: string, pin: string): Promise<AuthResponse> {
  try {
    const supabase: any = createClient()

    // Get the specific employee from profiles table
    const { data: employee, error: employeeError } = await supabase
      .from('profiles')
      .select('*, enterprise:enterprise_id(*)')
      .eq('id', employeeId)
      .eq('role', 'Employee')
      .eq('is_active', true)
      .single()

    if (employeeError || !employee) {
      return { success: false, error: 'Employé non trouvé' }
    }

    // Check if PIN is set
    if (!employee.pin_hash) {
      return { success: false, error: 'PIN non configuré' }
    }

    // Verify PIN
    const isValidPin = await verifyPin(pin, employee.pin_hash)
    if (!isValidPin) {
      return { success: false, error: 'Code PIN incorrect' }
    }

    // Get accessible rooms
    const { data: employeeRoomAccess } = await supabase
      .from('employee_room_access')
      .select('room_id')
      .eq('employee_id', employeeId)

    const accessibleRooms = (employeeRoomAccess || []).map((era: { room_id: string }) => era.room_id)

    return {
      success: true,
      data: employee as Profile,
      enterprise: employee.enterprise,
      role: 'Employee',
      accessibleRooms
    }
  } catch (error) {
    console.error('Employee login error:', error)
    return { success: false, error: 'Échec de la connexion' }
  }
}

/**
 * Get all active employees for an enterprise (for employee selection on tablet)
 */
export async function getEnterpriseEmployees(enterpriseId: string): Promise<Array<{
  id: string
  first_name: string
  last_name: string
  username: string | null
  avatar_url: string | null
}>> {
  try {
    const supabase: any = createClient()

    const { data: employees, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, username, avatar_url')
      .eq('enterprise_id', enterpriseId)
      .eq('role', 'Employee')
      .eq('is_active', true)
      .order('first_name')

    if (error) {
      console.error('Error fetching employees:', error)
      return []
    }

    return (employees || []) as Array<{
      id: string
      first_name: string
      last_name: string
      username: string | null
      avatar_url: string | null
    }>
  } catch (error) {
    console.error('Error fetching employees:', error)
    return []
  }
}

/**
 * Check if user has access to enterprise
 */
export function checkEnterpriseAccess(
  userEnterpriseId: string,
  resourceEnterpriseId: string
): boolean {
  return userEnterpriseId === resourceEnterpriseId
}

/**
 * Get user display name
 */
export function getUserDisplayName(user: Profile | { first_name?: string; last_name?: string; email?: string }): string {
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`
  }
  if (user.first_name) {
    return user.first_name
  }
  return (user as { email?: string }).email || 'Utilisateur'
}

/**
 * Get initials from user name
 */
export function getUserInitials(user: { first_name?: string; last_name?: string; email?: string }): string {
  if (user.first_name && user.last_name) {
    return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
  }
  if (user.first_name) {
    return user.first_name.substring(0, 2).toUpperCase()
  }
  if (user.email) {
    return user.email.substring(0, 2).toUpperCase()
  }
  return 'U'
}
