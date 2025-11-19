// Client-side authentication utilities
import { createClient } from '@/lib/supabase/client'
import type { AuthResponse, PinCredentials } from '@/types/auth.types'
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
 * Login with PIN (for User/Employee)
 * Uses Supabase database directly (no Supabase Auth)
 */
export async function loginWithPin(credentials: PinCredentials): Promise<AuthResponse> {
  try {
    const supabase = createClient()

    // Find user by enterprise and active status
    const { data: users, error } = await supabase
      .from('user')
      .select('*, enterprise:enterprise_id(*)')
      .eq('enterprise_id', credentials.enterprise_id)
      .eq('is_active', true)

    if (error) {
      return { success: false, error: 'Database error' }
    }

    if (!users || users.length === 0) {
      return { success: false, error: 'Invalid credentials' }
    }

    // Find user with matching PIN
    let authenticatedUser: any = null
    for (const user of users as any[]) {
      const isValid = await verifyPin(credentials.pin, user.pin_code)
      if (isValid) {
        authenticatedUser = user
        break
      }
    }

    if (!authenticatedUser) {
      return { success: false, error: 'Invalid PIN' }
    }

    // Get accessible rooms for this user
    const { data: userRooms } = await supabase
      .from('user_rooms')
      .select('room_id')
      .eq('user_id', authenticatedUser.id)

    const accessibleRooms = (userRooms as any[])?.map(ur => ur.room_id) || []

    return {
      success: true,
      data: authenticatedUser,
      enterprise: authenticatedUser.enterprise,
      role: 'User',
      accessibleRooms
    }
  } catch (error) {
    console.error('Login error:', error)
    return { success: false, error: 'Login failed' }
  }
}

/**
 * Login with email/password (for Developer/Admin)
 * Uses Supabase Auth
 */
export async function loginWithEmail(email: string, password: string): Promise<AuthResponse> {
  try {
    const supabase = createClient()

    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (authError || !authData.user) {
      return { success: false, error: 'Invalid credentials' }
    }

    const userEmail = authData.user.email

    if (!userEmail) {
      return { success: false, error: 'Email not found' }
    }

    // Check if Developer
    const { data: developer, error: devError } = await supabase
      .from('developer')
      .select('*')
      .eq('email', userEmail)
      .single()

    if (developer && !devError) {
      return {
        success: true,
        data: developer as any,
        role: 'Developer'
      }
    }

    // Check if Admin
    const { data: admin, error: adminError } = await supabase
      .from('admin')
      .select('*, enterprise!admin_id(*)')
      .eq('email', userEmail)
      .eq('is_active', true)
      .single()

    if (admin && !adminError) {
      return {
        success: true,
        data: admin as any,
        enterprise: (admin as any).enterprise,
        role: 'Admin'
      }
    }

    return { success: false, error: 'User not found' }
  } catch (error) {
    console.error('Login error:', error)
    return { success: false, error: 'Login failed' }
  }
}

/**
 * Logout
 */
export async function logout() {
  const supabase = createClient()
  await supabase.auth.signOut()
}

/**
 * Login employee with PIN (new flow: admin login -> select employee -> enter PIN)
 * @param userId - The specific user ID to authenticate
 * @param pin - The 4-digit PIN code
 */
export async function loginEmployeeWithPin(userId: string, pin: string): Promise<AuthResponse> {
  try {
    const supabase = createClient()

    // Get the specific user
    const { data: user, error: userError } = await supabase
      .from('user')
      .select('*, enterprise:enterprise_id(*)')
      .eq('id', userId)
      .eq('is_active', true)
      .single()

    if (userError || !user) {
      return { success: false, error: 'Employé non trouvé' }
    }

    // Verify PIN
    const isValidPin = await verifyPin(pin, (user as any).pin_code)

    if (!isValidPin) {
      return { success: false, error: 'Code PIN incorrect' }
    }

    // Get accessible rooms
    const { data: userRooms } = await supabase
      .from('user_rooms')
      .select('room_id')
      .eq('user_id', userId)

    const accessibleRooms = (userRooms as any[])?.map(ur => ur.room_id) || []

    return {
      success: true,
      data: user as any,
      enterprise: (user as any).enterprise,
      role: 'User',
      accessibleRooms
    }
  } catch (error) {
    console.error('Employee login error:', error)
    return { success: false, error: 'Échec de la connexion' }
  }
}

/**
 * Get all active employees for an enterprise (for employee selection)
 */
export async function getEnterpriseEmployees(enterpriseId: string): Promise<Array<{
  id: string
  first_name: string
  last_name: string
  email: string | null
}>> {
  try {
    const supabase = createClient()

    const { data: employees, error } = await supabase
      .from('user')
      .select('id, first_name, last_name, email')
      .eq('enterprise_id', enterpriseId)
      .eq('is_active', true)
      .order('first_name')

    if (error) {
      console.error('Error fetching employees:', error)
      return []
    }

    return ((employees || []) as unknown) as Array<{
      id: string
      first_name: string
      last_name: string
      email: string | null
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
export function getUserDisplayName(user: any): string {
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`
  }
  return user.email || 'User'
}
