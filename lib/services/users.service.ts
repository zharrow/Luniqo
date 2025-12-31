import { createClient } from '@/lib/supabase/client'
import { hashPin } from '@/lib/utils/auth.client'
import { Profile } from '@/types/database.types'

// ============================================================================
// TYPES
// ============================================================================

export interface ProfileWithRooms extends Profile {
  accessible_rooms: string[] // room IDs for Employees
  accessible_nurseries?: string[] // nursery IDs for Employees
}

export interface CreateEmployeeInput {
  email: string
  password: string  // For Supabase Auth (dashboard login)
  pin: string        // 4-digit PIN for tablet login (will be hashed)
  first_name: string
  last_name: string
  avatar_url?: string
  nursery_ids?: string[] // Nurseries to grant access to
  room_ids?: string[] // Rooms to grant access to
}

export interface UpdateEmployeeInput {
  first_name?: string
  last_name?: string
  email?: string
  pin?: string // Plain PIN for tablet, will be hashed if provided
  avatar_url?: string
  is_active?: boolean
}

export interface CreateOwnerInput {
  email: string
  password: string
  first_name: string
  last_name: string
}

// ============================================================================
// USERS SERVICE - Unified Profiles Architecture
// ============================================================================

export class UsersService {
  private supabase: any

  constructor() {
    this.supabase = createClient()
  }

  // ==========================================================================
  // EMPLOYEE METHODS (profiles where role='Employee')
  // ==========================================================================

  /**
   * Get all employees for an enterprise
   */
  async getEmployees(enterpriseId: string): Promise<ProfileWithRooms[]> {
    const { data: employees, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('role', 'Employee')
      .eq('enterprise_id', enterpriseId)
      .order('last_name', { ascending: true })

    if (error) throw error

    // Get room and nursery assignments for each employee
    const employeesWithRooms = await Promise.all(
      (employees || []).map(async (employee: any) => {
        const [roomsResult, nurseriesResult] = await Promise.all([
          this.supabase
            .from('employee_room_access')
            .select('room_id')
            .eq('employee_id', employee.id),
          this.supabase
            .from('employee_nursery_access')
            .select('nursery_id')
            .eq('employee_id', employee.id)
        ])

        return {
          ...employee,
          accessible_rooms: (roomsResult.data || []).map((r: any) => r.room_id),
          accessible_nurseries: (nurseriesResult.data || []).map((n: any) => n.nursery_id)
        } as ProfileWithRooms
      })
    )

    return employeesWithRooms
  }

  /**
   * Get active employees only
   */
  async getActiveEmployees(enterpriseId: string): Promise<ProfileWithRooms[]> {
    const employees = await this.getEmployees(enterpriseId)
    return employees.filter(e => e.is_active)
  }

  /**
   * Get employees assigned to a specific nursery
   */
  async getEmployeesByNursery(nurseryId: string): Promise<ProfileWithRooms[]> {
    // Get employee IDs assigned to this nursery via employee_nursery_access
    const { data: assignments, error: assignmentError } = await this.supabase
      .from('employee_nursery_access')
      .select('employee_id')
      .eq('nursery_id', nurseryId)

    if (assignmentError) throw assignmentError

    const employeeIds = (assignments || []).map((a: any) => a.employee_id)

    if (employeeIds.length === 0) {
      return []
    }

    // Get employee profiles
    const { data: employees, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('role', 'Employee')
      .in('id', employeeIds)
      .order('last_name', { ascending: true })

    if (error) throw error

    // Get room and nursery assignments for each employee
    const employeesWithRooms = await Promise.all(
      (employees || []).map(async (employee: any) => {
        const [roomsResult, nurseriesResult] = await Promise.all([
          this.supabase
            .from('employee_room_access')
            .select('room_id')
            .eq('employee_id', employee.id),
          this.supabase
            .from('employee_nursery_access')
            .select('nursery_id')
            .eq('employee_id', employee.id)
        ])

        return {
          ...employee,
          accessible_rooms: (roomsResult.data || []).map((r: any) => r.room_id),
          accessible_nurseries: (nurseriesResult.data || []).map((n: any) => n.nursery_id)
        } as ProfileWithRooms
      })
    )

    return employeesWithRooms
  }

  /**
   * Get active employees assigned to a specific nursery
   */
  async getActiveEmployeesByNursery(nurseryId: string): Promise<ProfileWithRooms[]> {
    const employees = await this.getEmployeesByNursery(nurseryId)
    return employees.filter(e => e.is_active)
  }

  /**
   * Get a single employee by ID
   */
  async getEmployeeById(id: string, enterpriseId: string): Promise<ProfileWithRooms | null> {
    const { data: employee, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .eq('role', 'Employee')
      .eq('enterprise_id', enterpriseId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    // Get room and nursery assignments
    const [roomsResult, nurseriesResult] = await Promise.all([
      this.supabase
        .from('employee_room_access')
        .select('room_id')
        .eq('employee_id', id),
      this.supabase
        .from('employee_nursery_access')
        .select('nursery_id')
        .eq('employee_id', id)
    ])

    return {
      ...employee,
      accessible_rooms: (roomsResult.data || []).map((r: any) => r.room_id),
      accessible_nurseries: (nurseriesResult.data || []).map((n: any) => n.nursery_id)
    } as ProfileWithRooms
  }

  /**
   * Get a single employee by ID (without enterprise check)
   */
  async getEmployee(id: string): Promise<ProfileWithRooms> {
    const { data: employee, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .eq('role', 'Employee')
      .single()

    if (error) throw error

    // Get room and nursery assignments
    const [roomsResult, nurseriesResult] = await Promise.all([
      this.supabase
        .from('employee_room_access')
        .select('room_id')
        .eq('employee_id', id),
      this.supabase
        .from('employee_nursery_access')
        .select('nursery_id')
        .eq('employee_id', id)
    ])

    return {
      ...employee,
      accessible_rooms: (roomsResult.data || []).map((r: any) => r.room_id),
      accessible_nurseries: (nurseriesResult.data || []).map((n: any) => n.nursery_id)
    } as ProfileWithRooms
  }

  /**
   * Get employee by username (for tablet login)
   */
  async getEmployeeByUsername(username: string): Promise<Profile | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .eq('role', 'Employee')
      .eq('is_active', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data
  }

  /**
   * Update an employee's profile
   */
  async updateEmployee(id: string, enterpriseId: string, input: UpdateEmployeeInput): Promise<Profile> {
    const updateData: Record<string, unknown> = {}

    if (input.first_name !== undefined) updateData.first_name = input.first_name
    if (input.last_name !== undefined) updateData.last_name = input.last_name
    if (input.email !== undefined) updateData.email = input.email
    if (input.avatar_url !== undefined) updateData.avatar_url = input.avatar_url
    if (input.is_active !== undefined) updateData.is_active = input.is_active

    // Hash PIN if provided (for tablet login)
    if (input.pin) {
      updateData.pin_hash = await hashPin(input.pin)
    }

    const { data, error } = await this.supabase
      .from('profiles')
      .update(updateData)
      .eq('id', id)
      .eq('role', 'Employee')
      .eq('enterprise_id', enterpriseId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Set employee PIN (for tablet login)
   */
  async setEmployeePin(employeeId: string, pin: string): Promise<void> {
    const hashedPin = await hashPin(pin)

    const { error } = await this.supabase
      .from('profiles')
      .update({ pin_hash: hashedPin })
      .eq('id', employeeId)
      .eq('role', 'Employee')

    if (error) throw error
  }

  /**
   * Create a new employee (requires admin privileges)
   * This wraps the server action
   */
  async createEmployee(
    enterpriseId: string,
    createdById: string,
    input: CreateEmployeeInput
  ): Promise<Profile> {
    // Import dynamically to avoid client-side issues
    const { createEmployee: createEmployeeAction } = await import('@/lib/actions/users.actions')

    const result = await createEmployeeAction(enterpriseId, createdById, input)

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to create employee')
    }

    return result.data
  }

  /**
   * Update employee nursery assignments
   */
  async updateNurseryAccess(employeeId: string, nurseryIds: string[]): Promise<void> {
    // Delete existing assignments
    await this.supabase
      .from('employee_nursery_access')
      .delete()
      .eq('employee_id', employeeId)

    // Insert new assignments
    if (nurseryIds.length > 0) {
      const assignments = nurseryIds.map(nursery_id => ({
        employee_id: employeeId,
        nursery_id
      }))

      const { error } = await this.supabase
        .from('employee_nursery_access')
        .insert(assignments)

      if (error) throw error
    }
  }

  /**
   * Get nursery IDs accessible by an employee
   */
  async getEmployeeNurseries(employeeId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('employee_nursery_access')
      .select('nursery_id')
      .eq('employee_id', employeeId)

    if (error) throw error
    return (data || []).map((n: any) => n.nursery_id)
  }

  /**
   * Update employee room assignments
   */
  async updateRoomAccess(employeeId: string, roomIds: string[]): Promise<void> {
    // Delete existing assignments
    await this.supabase
      .from('employee_room_access')
      .delete()
      .eq('employee_id', employeeId)

    // Insert new assignments
    if (roomIds.length > 0) {
      const assignments = roomIds.map(room_id => ({
        employee_id: employeeId,
        room_id
      }))

      const { error } = await this.supabase
        .from('employee_room_access')
        .insert(assignments)

      if (error) throw error
    }
  }

  /**
   * Get room IDs accessible by an employee
   */
  async getEmployeeRooms(employeeId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('employee_room_access')
      .select('room_id')
      .eq('employee_id', employeeId)

    if (error) throw error
    return (data || []).map((r: any) => r.room_id)
  }

  /**
   * Soft delete an employee (deactivate)
   */
  async softDeleteEmployee(id: string, enterpriseId: string): Promise<void> {
    const { error } = await this.supabase
      .from('profiles')
      .update({ is_active: false })
      .eq('id', id)
      .eq('role', 'Employee')
      .eq('enterprise_id', enterpriseId)

    if (error) throw error
  }

  /**
   * Alias for softDeleteEmployee (backwards compatibility)
   */
  async softDelete(id: string, enterpriseId: string): Promise<void> {
    return this.softDeleteEmployee(id, enterpriseId)
  }

  /**
   * Reactivate an employee (set is_active = true)
   */
  async reactivateEmployee(id: string, enterpriseId: string): Promise<void> {
    const { error } = await this.supabase
      .from('profiles')
      .update({ is_active: true })
      .eq('id', id)
      .eq('role', 'Employee')
      .eq('enterprise_id', enterpriseId)

    if (error) throw error
  }

  /**
   * Hard delete an employee (permanent deletion)
   * WARNING: This will delete all associated data (room access, tasks, etc.)
   */
  async hardDeleteEmployee(id: string, enterpriseId: string): Promise<void> {
    // Delete room access assignments
    await this.supabase
      .from('employee_room_access')
      .delete()
      .eq('employee_id', id)

    // Delete the profile (this will cascade to auth.users via ON DELETE CASCADE)
    const { error } = await this.supabase
      .from('profiles')
      .delete()
      .eq('id', id)
      .eq('role', 'Employee')
      .eq('enterprise_id', enterpriseId)

    if (error) throw error
  }

  /**
   * Get employee statistics
   */
  async getEmployeeStats(employeeId: string): Promise<{
    tasksCompleted: number
    roomsAccessible: number
  }> {
    // Count completed tasks
    const { count: tasksCount } = await this.supabase
      .from('task_completion')
      .select('*', { count: 'exact', head: true })
      .eq('performed_by_id', employeeId)
      .eq('status', 'FAIT')

    // Count accessible rooms
    const { count: roomsCount } = await this.supabase
      .from('employee_room_access')
      .select('*', { count: 'exact', head: true })
      .eq('employee_id', employeeId)

    return {
      tasksCompleted: tasksCount || 0,
      roomsAccessible: roomsCount || 0
    }
  }

  // ==========================================================================
  // OWNER METHODS (profiles where role='Owner')
  // ==========================================================================

  /**
   * Create a new owner (requires admin privileges - Developer only)
   * This wraps the server action
   */
  async createOwner(input: CreateOwnerInput): Promise<Profile> {
    // Import dynamically to avoid client-side issues
    const { createOwner: createOwnerAction } = await import('@/lib/actions/users.actions')

    const result = await createOwnerAction(input)

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to create owner')
    }

    return result.data
  }

  /**
   * Get all owners (Developer only)
   */
  async getOwners(): Promise<Profile[]> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('role', 'Owner')
      .order('last_name', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * Get owner by ID
   */
  async getOwnerById(id: string): Promise<Profile | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .eq('role', 'Owner')
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data
  }

  /**
   * Update owner profile
   */
  async updateOwner(id: string, input: {
    first_name?: string
    last_name?: string
    avatar_url?: string
  }): Promise<Profile> {
    const { data, error } = await this.supabase
      .from('profiles')
      .update(input)
      .eq('id', id)
      .eq('role', 'Owner')
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ==========================================================================
  // DEVELOPER METHODS (profiles where role='Developer')
  // ==========================================================================

  /**
   * Get developer by ID
   */
  async getDeveloperById(id: string): Promise<Profile | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .eq('role', 'Developer')
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data
  }

  // ==========================================================================
  // GENERIC PROFILE METHODS
  // ==========================================================================

  /**
   * Get profile by ID (any role)
   */
  async getProfileById(id: string): Promise<Profile | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data
  }

  /**
   * Get profile by email (any role)
   */
  async getProfileByEmail(email: string): Promise<Profile | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data
  }

  /**
   * Check if username exists (for collision detection)
   */
  async isUsernameAvailable(username: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single()

    if (error?.code === 'PGRST116') return true // Not found = available
    if (error) throw error
    return !data
  }

  /**
   * Generate unique username for employee
   * Format: "Prénom N" where N is first letter(s) of last name
   */
  async generateUniqueUsername(firstName: string, lastName: string): Promise<string> {
    let suffixLength = 1
    let username = `${firstName} ${lastName.substring(0, suffixLength).toUpperCase()}`

    while (!(await this.isUsernameAvailable(username))) {
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
}

export const usersService = new UsersService()

// ============================================================================
// LEGACY EXPORTS (for backwards compatibility)
// ============================================================================

// Re-export Profile as Employee for existing code
export type Employee = Profile
export type EmployeeWithRooms = ProfileWithRooms
