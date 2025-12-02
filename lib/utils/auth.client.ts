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
 * Login with PIN (for Employee)
 * Uses Supabase database directly (no Supabase Auth)
 */
export async function loginWithPin(credentials: PinCredentials): Promise<AuthResponse> {
  try {
    const supabase = createClient()

    // Find employee by enterprise and active status
    const { data: employees, error } = await supabase
      .from('employee')
      .select('*, enterprise:enterprise_id(*)')
      .eq('enterprise_id', credentials.enterprise_id)
      .eq('is_active', true)

    if (error) {
      return { success: false, error: 'Database error' }
    }

    if (!employees || employees.length === 0) {
      return { success: false, error: 'Invalid credentials' }
    }

    // Find employee with matching PIN
    let authenticatedEmployee: any = null
    for (const employee of employees as any[]) {
      const isValid = await verifyPin(credentials.pin, employee.pin_code)
      if (isValid) {
        authenticatedEmployee = employee
        break
      }
    }

    if (!authenticatedEmployee) {
      return { success: false, error: 'Invalid PIN' }
    }

    // Get accessible rooms for this employee
    const { data: employeeRoomAccess } = await supabase
      .from('employee_room_access')
      .select('room_id')
      .eq('employee_id', authenticatedEmployee.id)

    const accessibleRooms = (employeeRoomAccess as any[])?.map(era => era.room_id) || []

    return {
      success: true,
      data: authenticatedEmployee,
      enterprise: authenticatedEmployee.enterprise,
      role: 'User',
      accessibleRooms
    }
  } catch (error) {
    console.error('Login error:', error)
    return { success: false, error: 'Login failed' }
  }
}

/**
 * Login with email/password (for Super Admin/Admin)
 * Uses Supabase Auth
 */
export async function loginWithEmail(email: string, password: string): Promise<AuthResponse> {
  try {
    console.log('🔑 loginWithEmail called with:', { email })
    const supabase = createClient()

    // Sign in with Supabase Auth
    console.log('📡 Calling Supabase Auth...')
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (authError || !authData.user) {
      console.error('❌ Supabase Auth failed:', authError)
      return { success: false, error: 'Invalid credentials' }
    }

    console.log('✅ Supabase Auth successful')
    const userEmail = authData.user.email

    if (!userEmail) {
      console.error('❌ No email in auth data')
      return { success: false, error: 'Email not found' }
    }

    // Check if Super Admin
    console.log('🔍 Checking for Super Admin role...')
    const { data: superAdmin, error: superAdminError } = await supabase
      .from('super_admin')
      .select('*')
      .eq('email', userEmail)
      .single()

    if (superAdmin && !superAdminError) {
      console.log('✅ Super Admin found')
      return {
        success: true,
        data: superAdmin as any,
        role: 'Developer'
      }
    }

    // Check if Admin
    console.log('🔍 Checking for Admin role...')
    const { data: admin, error: adminError } = await supabase
      .from('admin')
      .select('*')
      .eq('email', userEmail)
      .eq('is_active', true)
      .single()

    if (admin && !adminError) {
      console.log('✅ Admin found, fetching enterprise...')
      // Fetch enterprise linked to this admin
      const { data: enterprise, error: enterpriseError } = await supabase
        .from('enterprise')
        .select('*')
        .eq('admin_id', (admin as any).id)
        .single()

      if (enterpriseError) {
        console.warn('⚠️ No enterprise found for admin:', enterpriseError)
      } else {
        console.log('✅ Enterprise found:', (enterprise as any)?.id)
      }

      return {
        success: true,
        data: admin as any,
        enterprise: (enterprise as any) || undefined,
        role: 'Admin'
      }
    }

    console.error('❌ No Super Admin or Admin found for email:', userEmail)
    return { success: false, error: 'User not found' }
  } catch (error) {
    console.error('❌ Login error:', error)
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
 * @param employeeId - The specific employee ID to authenticate
 * @param pin - The 4-digit PIN code
 */
export async function loginEmployeeWithPin(employeeId: string, pin: string): Promise<AuthResponse> {
  try {
    const supabase = createClient()

    // Get the specific employee
    const { data: employee, error: employeeError } = await supabase
      .from('employee')
      .select('*, enterprise:enterprise_id(*)')
      .eq('id', employeeId)
      .eq('is_active', true)
      .single()

    if (employeeError || !employee) {
      return { success: false, error: 'Employé non trouvé' }
    }

    // Verify PIN
    const isValidPin = await verifyPin(pin, (employee as any).pin_code)

    if (!isValidPin) {
      return { success: false, error: 'Code PIN incorrect' }
    }

    // Get accessible rooms
    const { data: employeeRoomAccess } = await supabase
      .from('employee_room_access')
      .select('room_id')
      .eq('employee_id', employeeId)

    const accessibleRooms = (employeeRoomAccess as any[])?.map(era => era.room_id) || []

    return {
      success: true,
      data: employee as any,
      enterprise: (employee as any).enterprise,
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
      .from('employee')
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
