import { createClient } from '@/lib/supabase/client'

export type TaskType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'OCCASIONAL'

export interface TaskTemplate {
  id: string
  enterprise_id: string
  name: string
  description: string | null
  default_duration: number | null
  estimated_duration: number | null
  type: TaskType
  category: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateTaskInput {
  name: string
  description?: string
  default_duration?: number
  estimated_duration?: number
  type: TaskType
  category?: string
}

export interface UpdateTaskInput {
  name?: string
  description?: string
  default_duration?: number
  estimated_duration?: number
  type?: TaskType
  category?: string
  is_active?: boolean
}

export class TasksService {
  private supabase = createClient()

  /**
   * Get all task templates for an enterprise
   */
  async getAll(enterpriseId: string): Promise<TaskTemplate[]> {
    const { data, error } = await this.supabase
      .from('task_template')
      .select('*')
      .eq('enterprise_id', enterpriseId)
      .order('name', { ascending: true })

    if (error) throw error
    return (data as any[]) || []
  }

  /**
   * Get active tasks only
   */
  async getActive(enterpriseId: string): Promise<TaskTemplate[]> {
    const { data, error } = await this.supabase
      .from('task_template')
      .select('*')
      .eq('enterprise_id', enterpriseId)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) throw error
    return (data as any[]) || []
  }

  /**
   * Get tasks by type
   */
  async getByType(enterpriseId: string, type: TaskType): Promise<TaskTemplate[]> {
    const { data, error } = await this.supabase
      .from('task_template')
      .select('*')
      .eq('enterprise_id', enterpriseId)
      .eq('type', type)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) throw error
    return (data as any[]) || []
  }

  /**
   * Get tasks by category
   */
  async getByCategory(enterpriseId: string, category: string): Promise<TaskTemplate[]> {
    const { data, error } = await this.supabase
      .from('task_template')
      .select('*')
      .eq('enterprise_id', enterpriseId)
      .eq('category', category)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) throw error
    return (data as any[]) || []
  }

  /**
   * Get a single task by ID
   */
  async getById(id: string, enterpriseId: string): Promise<TaskTemplate | null> {
    const { data, error } = await this.supabase
      .from('task_template')
      .select('*')
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
        default_duration: input.default_duration || null,
        estimated_duration: input.estimated_duration || null,
        type: input.type,
        category: input.category || null,
        is_active: true
      })
      .select()
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
      .select()
      .single()

    if (error) throw error
    return data as any
  }

  /**
   * Soft delete a task
   */
  async softDelete(id: string, enterpriseId: string): Promise<void> {
    const { error } = await this.supabase
      .from('task_template')
      .update({ is_active: false })
      .eq('id', id)
      .eq('enterprise_id', enterpriseId)

    if (error) throw error
  }

  /**
   * Hard delete a task
   */
  async hardDelete(id: string, enterpriseId: string): Promise<void> {
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
      .from('cleaning_log')
      .select('assigned_task!inner(*)', { count: 'exact', head: true })
      .eq('assigned_task.task_template_id', taskId)
      .eq('status', 'FAIT')

    return {
      assignedToRooms: assignedCount || 0,
      timesCompleted: completedCount || 0
    }
  }

  /**
   * Get all unique categories
   */
  async getCategories(enterpriseId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('task_template')
      .select('category')
      .eq('enterprise_id', enterpriseId)
      .not('category', 'is', null)

    if (error) throw error

    const categories = Array.from(
      new Set((data as any[]).map(t => t.category).filter(Boolean))
    )

    return categories.sort()
  }
}

export const tasksService = new TasksService()
