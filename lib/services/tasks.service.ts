import { createClient } from '@/lib/supabase/client'
import { TaskCategory } from './task-categories.service'

export interface TaskTemplate {
  id: string
  enterprise_id: string
  name: string
  description: string | null
  estimated_duration: number | null
  category_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  // Relations (optional, loaded with select)
  task_category?: TaskCategory | null
}

export interface CreateTaskInput {
  name: string
  description?: string
  estimated_duration?: number
  category_id?: string | null
}

export interface UpdateTaskInput {
  name?: string
  description?: string
  estimated_duration?: number
  category_id?: string | null
  is_active?: boolean
}

export class TasksService {
  private supabase: any = createClient()

  /**
   * Get all task templates for an enterprise (with category relation)
   */
  async getAll(enterpriseId: string): Promise<TaskTemplate[]> {
    const { data, error } = await this.supabase
      .from('task_template')
      .select('*, task_category(*)')
      .eq('enterprise_id', enterpriseId)
      .order('name', { ascending: true })

    if (error) throw error
    return (data as any[]) || []
  }

  /**
   * Get active tasks only (with category relation)
   */
  async getActive(enterpriseId: string): Promise<TaskTemplate[]> {
    const { data, error } = await this.supabase
      .from('task_template')
      .select('*, task_category(*)')
      .eq('enterprise_id', enterpriseId)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) throw error
    return (data as any[]) || []
  }

  /**
   * Get tasks by category ID
   */
  async getByCategoryId(enterpriseId: string, categoryId: string): Promise<TaskTemplate[]> {
    const { data, error } = await this.supabase
      .from('task_template')
      .select('*, task_category(*)')
      .eq('enterprise_id', enterpriseId)
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) throw error
    return (data as any[]) || []
  }

  /**
   * Get a single task by ID (with category relation)
   */
  async getById(id: string, enterpriseId: string): Promise<TaskTemplate | null> {
    const { data, error } = await this.supabase
      .from('task_template')
      .select('*, task_category(*)')
      .eq('id', id)
      .eq('enterprise_id', enterpriseId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data as any
  }

  /**
   * Create a new task template
   */
  async create(enterpriseId: string, input: CreateTaskInput): Promise<TaskTemplate> {
    const { data, error } = await this.supabase
      .from('task_template')
      .insert({
        enterprise_id: enterpriseId,
        name: input.name,
        description: input.description || null,
        estimated_duration: input.estimated_duration || null,
        category_id: input.category_id || null,
        is_active: true
      })
      .select('*, task_category(*)')
      .single()

    if (error) throw error
    return data as any
  }

  /**
   * Update a task template
   */
  async update(id: string, enterpriseId: string, input: UpdateTaskInput): Promise<TaskTemplate> {
    const { data, error } = await this.supabase
      .from('task_template')
      .update(input)
      .eq('id', id)
      .eq('enterprise_id', enterpriseId)
      .select('*, task_category(*)')
      .single()

    if (error) throw error
    return data as any
  }

  /**
   * Delete a task
   */
  async delete(id: string, enterpriseId: string): Promise<void> {
    const { error } = await this.supabase
      .from('task_template')
      .delete()
      .eq('id', id)
      .eq('enterprise_id', enterpriseId)

    if (error) throw error
  }

  /**
   * Get task statistics
   */
  async getStats(taskId: string, enterpriseId: string): Promise<{
    assignedToRooms: number
    timesCompleted: number
  }> {
    // Count how many rooms this task is assigned to
    const { count: assignedCount } = await this.supabase
      .from('assigned_task')
      .select('*', { count: 'exact', head: true })
      .eq('task_template_id', taskId)
      .eq('is_active', true)

    // Count how many times this task has been completed
    const { count: completedCount } = await this.supabase
      .from('task_completion')
      .select('assigned_task!inner(*)', { count: 'exact', head: true })
      .eq('assigned_task.task_template_id', taskId)
      .eq('status', 'FAIT')

    return {
      assignedToRooms: assignedCount || 0,
      timesCompleted: completedCount || 0
    }
  }

}

export const tasksService = new TasksService()
