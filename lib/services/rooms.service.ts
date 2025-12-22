import { createClient } from '@/lib/supabase/client'

const supabase: any = createClient()

export interface Room {
  id: string
  nursery_id: string
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
  private getClient(): any {
    return createClient()
  }

  /**
   * Get all rooms for a nursery
   */
  async getAll(nurseryId: string): Promise<Room[]> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('room')
      .select('*')
      .eq('nursery_id', nurseryId)
      .order('display_order', { ascending: true })

    if (error) throw error
    return (data as any[]) || []
  }

  /**
   * Get active rooms only
   */
  async getActive(nurseryId: string): Promise<Room[]> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('room')
      .select('*')
      .eq('nursery_id', nurseryId)
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) throw error
    return (data as any[]) || []
  }

  /**
   * Get a single room by ID
   */
  async getById(id: string, nurseryId: string): Promise<Room | null> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('room')
      .select('*')
      .eq('id', id)
      .eq('nursery_id', nurseryId)
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
  async create(nurseryId: string, input: CreateRoomInput): Promise<Room> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('room')
      .insert({
        nursery_id: nurseryId,
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
  async update(id: string, nurseryId: string, input: UpdateRoomInput): Promise<Room> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('room')
      .update(input)
      .eq('id', id)
      .eq('nursery_id', nurseryId)
      .select()
      .single()

    if (error) throw error
    return data as any
  }

  /**
   * Delete a room
   */
  async delete(id: string, nurseryId: string): Promise<void> {
    const supabase = this.getClient()
    const { error } = await supabase
      .from('room')
      .delete()
      .eq('id', id)
      .eq('nursery_id', nurseryId)

    if (error) throw error
  }

  /**
   * Reorder rooms
   */
  async reorder(nurseryId: string, roomOrders: { id: string; display_order: number }[]): Promise<void> {
    const supabase = this.getClient()
    const promises = roomOrders.map(({ id, display_order }) =>
      supabase
        .from('room')
        .update({ display_order })
        .eq('id', id)
        .eq('nursery_id', nurseryId)
    )

    await Promise.all(promises)
  }

  /**
   * Get room statistics
   */
  async getStats(roomId: string, nurseryId: string): Promise<{
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
      .from('daily_cleaning_session')
      .select('id')
      .eq('nursery_id', nurseryId)
      .eq('date', today)
      .single()

    let completedToday = 0
    if (session) {
      const { count } = await supabase
        .from('task_completion')
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
