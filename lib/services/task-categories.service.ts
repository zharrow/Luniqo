import { createClient } from '@/lib/supabase/client'

export interface TaskCategory {
  id: string
  enterprise_id: string
  name: string
  color: string | null
  icon: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateTaskCategoryInput {
  name: string
  color?: string
  icon?: string
}

export interface UpdateTaskCategoryInput {
  name?: string
  color?: string
  icon?: string
  is_active?: boolean
}

export const taskCategoriesService = {
  /**
   * Get all active task categories for an enterprise
   */
  async getAll(enterpriseId: string): Promise<TaskCategory[]> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('task_category')
      .select('*')
      .eq('enterprise_id', enterpriseId)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) throw error
    return data || []
  },

  /**
   * Get all task categories (including inactive) for an enterprise
   */
  async getAllIncludingInactive(enterpriseId: string): Promise<TaskCategory[]> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('task_category')
      .select('*')
      .eq('enterprise_id', enterpriseId)
      .order('name', { ascending: true })

    if (error) throw error
    return data || []
  },

  /**
   * Get a single task category by ID
   */
  async getById(id: string, enterpriseId: string): Promise<TaskCategory | null> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('task_category')
      .select('*')
      .eq('id', id)
      .eq('enterprise_id', enterpriseId)
      .single()

    if (error) throw error
    return data
  },

  /**
   * Create a new task category
   */
  async create(
    enterpriseId: string,
    input: CreateTaskCategoryInput
  ): Promise<TaskCategory> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('task_category')
      .insert({
        enterprise_id: enterpriseId,
        name: input.name,
        color: input.color || '#84cc16',
        icon: input.icon || null,
        is_active: true
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Update a task category
   */
  async update(
    id: string,
    enterpriseId: string,
    input: UpdateTaskCategoryInput
  ): Promise<TaskCategory> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('task_category')
      .update({
        ...input,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('enterprise_id', enterpriseId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Soft delete a task category (set is_active to false)
   */
  async softDelete(id: string, enterpriseId: string): Promise<void> {
    const supabase = createClient()

    const { error } = await supabase
      .from('task_category')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('enterprise_id', enterpriseId)

    if (error) throw error
  },

  /**
   * Hard delete a task category
   * WARNING: This will set category_id to NULL for all associated tasks
   */
  async hardDelete(id: string, enterpriseId: string): Promise<void> {
    const supabase = createClient()

    const { error } = await supabase
      .from('task_category')
      .delete()
      .eq('id', id)
      .eq('enterprise_id', enterpriseId)

    if (error) throw error
  },

  /**
   * Check if a category name already exists for an enterprise
   */
  async exists(enterpriseId: string, name: string, excludeId?: string): Promise<boolean> {
    const supabase = createClient()

    let query = supabase
      .from('task_category')
      .select('id')
      .eq('enterprise_id', enterpriseId)
      .eq('name', name)

    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    const { data, error } = await query.single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      throw error
    }

    return !!data
  }
}
