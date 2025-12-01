import { createClient } from '@/lib/supabase/client'

export interface Room {
  id: string
  enterprise_id: string
  name: string
  description: string | null
  display_order: number | null
  image_key: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateRoomInput {
  name: string
  description?: string
  display_order?: number
  image_key?: string
}

export interface UpdateRoomInput {
  name?: string
  description?: string
  display_order?: number
  image_key?: string
  is_active?: boolean
}

export class RoomsService {
  private getClient() {
    return createClient()
  }

  /**
   * Get all rooms for an enterprise
   */
  async getAll(enterpriseId: string): Promise<Room[]> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('room')
      .select('*')
      .eq('enterprise_id', enterpriseId)
      .order('display_order', { ascending: true })

    if (error) throw error
    return (data as any[]) || []
  }

  /**
   * Get active rooms only
   */
  async getActive(enterpriseId: string): Promise<Room[]> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('room')
      .select('*')
      .eq('enterprise_id', enterpriseId)
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) throw error
    return (data as any[]) || []
  }

  /**
   * Get a single room by ID
   */
  async getById(id: string, enterpriseId: string): Promise<Room | null> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('room')
      .select('*')
      .eq('id', id)
      .eq('enterprise_id', enterpriseId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }

    return data as any
  }

  /**
   * Create a new room
   */
  async create(enterpriseId: string, input: CreateRoomInput): Promise<Room> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('room')
      .insert({
        enterprise_id: enterpriseId,
        name: input.name,
        description: input.description || null,
        display_order: input.display_order || null,
        image_key: input.image_key || null,
        is_active: true
      })
      .select()
      .single()

    if (error) throw error
    return data as any
  }

  /**
   * Update a room
   */
  async update(id: string, enterpriseId: string, input: UpdateRoomInput): Promise<Room> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('room')
      .update(input)
      .eq('id', id)
      .eq('enterprise_id', enterpriseId)
      .select()
      .single()

    if (error) throw error
    return data as any
  }

  /**
   * Delete a room (soft delete - sets is_active to false)
   */
  async softDelete(id: string, enterpriseId: string): Promise<void> {
    const supabase = this.getClient()
    const { error } = await supabase
      .from('room')
      .update({ is_active: false })
      .eq('id', id)
      .eq('enterprise_id', enterpriseId)

    if (error) throw error
  }

  /**
   * Hard delete a room (permanent)
   */
  async hardDelete(id: string, enterpriseId: string): Promise<void> {
    const supabase = this.getClient()
    const { error } = await supabase
      .from('room')
      .delete()
      .eq('id', id)
      .eq('enterprise_id', enterpriseId)

    if (error) throw error
  }

  /**
   * Reorder rooms
   */
  async reorder(enterpriseId: string, roomOrders: { id: string; display_order: number }[]): Promise<void> {
    const supabase = this.getClient()
    const promises = roomOrders.map(({ id, display_order }) =>
      supabase
        .from('room')
        .update({ display_order })
        .eq('id', id)
        .eq('enterprise_id', enterpriseId)
    )

    await Promise.all(promises)
  }

  /**
   * Get room statistics
   */
  async getStats(roomId: string, enterpriseId: string): Promise<{
    totalTasks: number
    completedToday: number
  }> {
    const supabase = this.getClient()
    // Get total tasks assigned to this room
    const { count: totalTasks } = await supabase
      .from('assigned_task')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', roomId)
      .eq('is_active', true)

    // Get today's session
    const today = new Date().toISOString().split('T')[0]
    const { data: session } = await supabase
      .from('cleaning_session')
      .select('id')
      .eq('enterprise_id', enterpriseId)
      .eq('date', today)
      .single()

    let completedToday = 0
    if (session) {
      const { count } = await supabase
        .from('cleaning_log')
        .select('assigned_task!inner(*)', { count: 'exact', head: true })
        .eq('session_id', (session as any).id)
        .eq('status', 'FAIT')
        .eq('assigned_task.room_id', roomId)

      completedToday = count || 0
    }

    return {
      totalTasks: totalTasks || 0,
      completedToday
    }
  }
}

export const roomsService = new RoomsService()
