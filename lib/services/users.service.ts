import { createClient } from '@/lib/supabase/client'
import { hashPin } from '@/lib/utils/auth.client'

export interface User {
  id: string
  email: string | null
  first_name: string
  last_name: string
  pin_code: string
  enterprise_id: string
  is_active: boolean
  created_by_id: string | null
  created_at: string
  updated_at: string
}

export interface UserWithRooms extends User {
  accessible_rooms: string[] // room IDs
}

export interface CreateUserInput {
  first_name: string
  last_name: string
  email?: string
  pin: string // Plain PIN, will be hashed
  room_ids?: string[] // Rooms to grant access to
}

export interface UpdateUserInput {
  first_name?: string
  last_name?: string
  email?: string
  pin?: string // Plain PIN, will be hashed if provided
  is_active?: boolean
}

export class UsersService {
  private supabase = createClient()

  /**
   * Get all users for an enterprise
   */
  async getAll(enterpriseId: string): Promise<UserWithRooms[]> {
    const { data: users, error } = await this.supabase
      .from('user')
      .select('*')
      .eq('enterprise_id', enterpriseId)
      .order('last_name', { ascending: true })

    if (error) throw error

    // Get room assignments for each user
    const usersWithRooms = await Promise.all(
      (users as any[] || []).map(async (user) => {
        const { data: rooms } = await this.supabase
          .from('user_rooms')
          .select('room_id')
          .eq('user_id', user.id)

        return {
          ...user,
          accessible_rooms: (rooms as any[] || []).map(r => r.room_id)
        }
      })
    )

    return usersWithRooms
  }

  /**
   * Get active users only
   */
  async getActive(enterpriseId: string): Promise<UserWithRooms[]> {
    const allUsers = await this.getAll(enterpriseId)
    return allUsers.filter(u => u.is_active)
  }

  /**
   * Get a single user by ID
   */
  async getById(id: string, enterpriseId: string): Promise<UserWithRooms | null> {
    const { data: user, error } = await this.supabase
      .from('user')
      .select('*')
      .eq('id', id)
      .eq('enterprise_id', enterpriseId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    // Get room assignments
    const { data: rooms } = await this.supabase
      .from('user_rooms')
      .select('room_id')
      .eq('user_id', id)

    return {
      ...(user as any),
      accessible_rooms: (rooms as any[] || []).map(r => r.room_id)
    }
  }

  /**
   * Create a new user
   */
  async create(enterpriseId: string, createdById: string, input: CreateUserInput): Promise<User> {
    // Hash the PIN
    const hashedPin = await hashPin(input.pin)

    // Create user
    const { data: user, error: userError } = await this.supabase
      .from('user')
      .insert({
        enterprise_id: enterpriseId,
        created_by_id: createdById,
        first_name: input.first_name,
        last_name: input.last_name,
        email: input.email || null,
        pin_code: hashedPin,
        is_active: true
      })
      .select()
      .single()

    if (userError) throw userError

    // Assign rooms if provided
    if (input.room_ids && input.room_ids.length > 0) {
      const roomAssignments = input.room_ids.map(room_id => ({
        user_id: (user as any).id,
        room_id
      }))

      const { error: roomsError } = await this.supabase
        .from('user_rooms')
        .insert(roomAssignments)

      if (roomsError) throw roomsError
    }

    return user as any
  }

  /**
   * Update a user
   */
  async update(id: string, enterpriseId: string, input: UpdateUserInput): Promise<User> {
    const updateData: any = { ...input }

    // Hash PIN if provided
    if (input.pin) {
      updateData.pin_code = await hashPin(input.pin)
      delete updateData.pin
    }

    const { data, error } = await this.supabase
      .from('user')
      .update(updateData)
      .eq('id', id)
      .eq('enterprise_id', enterpriseId)
      .select()
      .single()

    if (error) throw error
    return data as any
  }

  /**
   * Update user room assignments
   */
  async updateRoomAccess(userId: string, roomIds: string[]): Promise<void> {
    // Delete existing assignments
    await this.supabase
      .from('user_rooms')
      .delete()
      .eq('user_id', userId)

    // Insert new assignments
    if (roomIds.length > 0) {
      const assignments = roomIds.map(room_id => ({
        user_id: userId,
        room_id
      }))

      const { error } = await this.supabase
        .from('user_rooms')
        .insert(assignments)

      if (error) throw error
    }
  }

  /**
   * Soft delete a user
   */
  async softDelete(id: string, enterpriseId: string): Promise<void> {
    const { error } = await this.supabase
      .from('user')
      .update({ is_active: false })
      .eq('id', id)
      .eq('enterprise_id', enterpriseId)

    if (error) throw error
  }

  /**
   * Hard delete a user
   */
  async hardDelete(id: string, enterpriseId: string): Promise<void> {
    // First delete room assignments
    await this.supabase
      .from('user_rooms')
      .delete()
      .eq('user_id', id)

    // Then delete user
    const { error } = await this.supabase
      .from('user')
      .delete()
      .eq('id', id)
      .eq('enterprise_id', enterpriseId)

    if (error) throw error
  }

  /**
   * Check if PIN is unique within enterprise
   */
  async isPinUnique(enterpriseId: string, pin: string, excludeUserId?: string): Promise<boolean> {
    const hashedPin = await hashPin(pin)

    let query = this.supabase
      .from('user')
      .select('id')
      .eq('enterprise_id', enterpriseId)
      .eq('pin_code', hashedPin)

    if (excludeUserId) {
      query = query.neq('id', excludeUserId)
    }

    const { data, error } = await query

    if (error) throw error
    return !data || data.length === 0
  }

  /**
   * Get user statistics
   */
  async getStats(userId: string): Promise<{
    tasksCompleted: number
    roomsAccessible: number
  }> {
    // Count completed tasks
    const { count: tasksCount } = await this.supabase
      .from('cleaning_log')
      .select('*', { count: 'exact', head: true })
      .eq('performed_by_id', userId)
      .eq('status', 'FAIT')

    // Count accessible rooms
    const { count: roomsCount } = await this.supabase
      .from('user_rooms')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    return {
      tasksCompleted: tasksCount || 0,
      roomsAccessible: roomsCount || 0
    }
  }
}

export const usersService = new UsersService()
