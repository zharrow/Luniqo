import { createClient } from '@/lib/supabase/client'

export interface AssignedTask {
  id: string
  room_id: string | null
  task_template_id: string | null
  default_performer_id: string | null
  frequency: Record<string, any> | null
  suggested_time: string | null
  expected_duration: number | null
  order_in_room: number | null
  is_active: boolean
  created_at: string
  updated_at: string
  // Relations
  task_template?: {
    id: string
    name: string
    category: string | null
    estimated_duration: number | null
  }
  room?: {
    id: string
    name: string
  }
  default_performer?: {
    id: string
    first_name: string
    last_name: string
  }
}

export interface CreateAssignedTaskInput {
  room_id: string
  task_template_id: string
  default_performer_id?: string | null
  frequency?: Record<string, any> | null
  suggested_time?: string | null
  expected_duration?: number | null
  order_in_room?: number | null
}

export interface UpdateAssignedTaskInput {
  room_id?: string
  task_template_id?: string
  default_performer_id?: string | null
  frequency?: Record<string, any> | null
  suggested_time?: string | null
  expected_duration?: number | null
  order_in_room?: number | null
  is_active?: boolean
}

export class AssignedTasksService {
  private supabase: any = createClient()

  /**
   * Get all assigned tasks for a room
   */
  async getByRoom(roomId: string): Promise<AssignedTask[]> {
    const { data, error } = await this.supabase
      .from('assigned_task')
      .select(`
        *,
        task_template:task_template_id (
          id,
          name,
          category,
          estimated_duration
        )
      `)
      .eq('room_id', roomId)
      .order('order_in_room', { ascending: true, nullsFirst: false })

    if (error) throw error
    return (data as any[]) || []
  }

  /**
   * Get active assigned tasks for a room
   */
  async getActiveByRoom(roomId: string): Promise<AssignedTask[]> {
    const { data, error } = await this.supabase
      .from('assigned_task')
      .select(`
        *,
        task_template:task_template_id (
          id,
          name,
          category,
          estimated_duration
        )
      `)
      .eq('room_id', roomId)
      .eq('is_active', true)
      .order('order_in_room', { ascending: true, nullsFirst: false })

    if (error) throw error
    return (data as any[]) || []
  }

  /**
   * Get all assigned tasks for an enterprise (via rooms)
   */
  async getByEnterprise(enterpriseId: string): Promise<AssignedTask[]> {
    const { data, error } = await this.supabase
      .from('assigned_task')
      .select(`
        *,
        task_template:task_template_id (
          id,
          name,
          category,
          estimated_duration
        ),
        room:room_id!inner (
          id,
          name,
          enterprise_id
        )
      `)
      .eq('room.enterprise_id', enterpriseId)
      .order('order_in_room', { ascending: true, nullsFirst: false })

    if (error) throw error
    return (data as any[]) || []
  }

  /**
   * Get a single assigned task by ID
   */
  async getById(id: string): Promise<AssignedTask | null> {
    const { data, error } = await this.supabase
      .from('assigned_task')
      .select(`
        *,
        task_template:task_template_id (
          id,
          name,
          category,
          estimated_duration
        ),
        room:room_id (
          id,
          name
        ),
        default_performer:default_performer_id (
          id,
          first_name,
          last_name
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data as any
  }

  /**
   * Create a new assigned task
   */
  async create(input: CreateAssignedTaskInput): Promise<AssignedTask> {
    const { data, error } = await (this.supabase
      .from('assigned_task')
      .insert({
        room_id: input.room_id,
        task_template_id: input.task_template_id,
        default_performer_id: input.default_performer_id || null,
        frequency: input.frequency || null,
        suggested_time: input.suggested_time || null,
        expected_duration: input.expected_duration || null,
        order_in_room: input.order_in_room || null,
        is_active: true
      } as any)
      .select(`
        *,
        task_template:task_template_id (
          id,
          name,
          category,
          estimated_duration
        )
      `)
      .single() as any)

    if (error) throw error
    return data as any
  }

  /**
   * Assign multiple tasks to a room at once
   */
  async bulkAssign(roomId: string, taskTemplateIds: string[]): Promise<AssignedTask[]> {
    const inserts = taskTemplateIds.map((taskTemplateId, index) => ({
      room_id: roomId,
      task_template_id: taskTemplateId,
      order_in_room: index + 1,
      is_active: true
    }))

    const { data, error } = await (this.supabase
      .from('assigned_task')
      .insert(inserts as any)
      .select(`
        *,
        task_template:task_template_id (
          id,
          name,
          category,
          estimated_duration
        )
      `) as any)

    if (error) throw error
    return (data as any[]) || []
  }

  /**
   * Update an assigned task
   */
  async update(id: string, input: UpdateAssignedTaskInput): Promise<AssignedTask> {
    const supabase = this.supabase as any
    const { data, error } = await supabase
      .from('assigned_task')
      .update(input)
      .eq('id', id)
      .select(`
        *,
        task_template:task_template_id (
          id,
          name,
          category,
          estimated_duration
        )
      `)
      .single()

    if (error) throw error
    return data as any
  }

  /**
   * Soft delete an assigned task
   */
  async softDelete(id: string): Promise<void> {
    const supabase = this.supabase as any
    const { error } = await supabase
      .from('assigned_task')
      .update({ is_active: false })
      .eq('id', id)

    if (error) throw error
  }

  /**
   * Hard delete an assigned task
   */
  async hardDelete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('assigned_task')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  /**
   * Remove a task assignment from a room
   */
  async unassign(roomId: string, taskTemplateId: string): Promise<void> {
    const { error } = await this.supabase
      .from('assigned_task')
      .delete()
      .eq('room_id', roomId)
      .eq('task_template_id', taskTemplateId)

    if (error) throw error
  }

  /**
   * Reorder assigned tasks in a room
   */
  async reorder(taskOrders: { id: string; order_in_room: number }[]): Promise<void> {
    const supabase = this.supabase as any
    const promises = taskOrders.map(({ id, order_in_room }) =>
      supabase
        .from('assigned_task')
        .update({ order_in_room })
        .eq('id', id)
    )

    await Promise.all(promises)
  }

  /**
   * Check if a task is already assigned to a room
   */
  async isAssigned(roomId: string, taskTemplateId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('assigned_task')
      .select('id')
      .eq('room_id', roomId)
      .eq('task_template_id', taskTemplateId)
      .eq('is_active', true)
      .maybeSingle()

    if (error) throw error
    return !!data
  }

  /**
   * Get count of tasks assigned to a room
   */
  async getCountByRoom(roomId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('assigned_task')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', roomId)
      .eq('is_active', true)

    if (error) throw error
    return count || 0
  }
}

export const assignedTasksService = new AssignedTasksService()
