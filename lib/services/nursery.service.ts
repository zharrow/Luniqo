import { createClient } from '@/lib/supabase/client'
import type { Nursery, NurseryInsert, NurseryUpdate } from '@/types/database.types'

export interface CreateNurseryInput {
  name: string
  address?: string
  city?: string
  postal_code?: string
  phone?: string
  email?: string
  capacity?: number
}

export interface UpdateNurseryInput {
  name?: string
  address?: string | null
  city?: string | null
  postal_code?: string | null
  phone?: string | null
  email?: string | null
  capacity?: number | null
  is_active?: boolean
}

export interface NurseryStats {
  childCount: number
  roomCount: number
  employeeCount: number
}

export class NurseryService {
  private getClient(): any {
    return createClient()
  }

  /**
   * Get all nurseries for an enterprise
   */
  async getAll(enterpriseId: string): Promise<Nursery[]> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('nursery')
      .select('*')
      .eq('enterprise_id', enterpriseId)
      .order('is_default', { ascending: false }) // Default first
      .order('name')

    if (error) throw error
    return (data as Nursery[]) || []
  }

  /**
   * Get active nurseries only
   */
  async getActive(enterpriseId: string): Promise<Nursery[]> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('nursery')
      .select('*')
      .eq('enterprise_id', enterpriseId)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('name')

    if (error) throw error
    return (data as Nursery[]) || []
  }

  /**
   * Get a single nursery by ID
   */
  async getById(id: string, enterpriseId: string): Promise<Nursery | null> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('nursery')
      .select('*')
      .eq('id', id)
      .eq('enterprise_id', enterpriseId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }

    return data as Nursery
  }

  /**
   * Get default nursery for an enterprise
   */
  async getDefault(enterpriseId: string): Promise<Nursery | null> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('nursery')
      .select('*')
      .eq('enterprise_id', enterpriseId)
      .eq('is_default', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data as Nursery
  }

  /**
   * Create a new nursery
   */
  async create(enterpriseId: string, input: CreateNurseryInput, isDefault = false): Promise<Nursery> {
    const supabase = this.getClient()

    // If this is the first nursery for the enterprise, make it default
    const existingNurseries = await this.getAll(enterpriseId)
    const shouldBeDefault = isDefault || existingNurseries.length === 0

    const nurseryData: NurseryInsert = {
      enterprise_id: enterpriseId,
      name: input.name,
      address: input.address || null,
      city: input.city || null,
      postal_code: input.postal_code || null,
      phone: input.phone || null,
      email: input.email || null,
      capacity: input.capacity || null,
      is_default: shouldBeDefault,
      is_active: true
    }

    const { data, error } = await supabase
      .from('nursery')
      .insert(nurseryData)
      .select()
      .single()

    if (error) throw error
    return data as Nursery
  }

  /**
   * Update a nursery
   */
  async update(id: string, enterpriseId: string, input: UpdateNurseryInput): Promise<Nursery> {
    const supabase = this.getClient()

    const updateData: NurseryUpdate = {
      ...input,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('nursery')
      .update(updateData)
      .eq('id', id)
      .eq('enterprise_id', enterpriseId)
      .select()
      .single()

    if (error) throw error
    return data as Nursery
  }

  /**
   * Soft delete a nursery (set is_active = false)
   */
  async delete(id: string, enterpriseId: string): Promise<void> {
    const supabase = this.getClient()

    // Don't allow deleting the last active nursery
    const activeNurseries = await this.getActive(enterpriseId)
    if (activeNurseries.length === 1 && activeNurseries[0].id === id) {
      throw new Error('Cannot delete the last active nursery')
    }

    // Don't allow deleting the default nursery
    const nursery = await this.getById(id, enterpriseId)
    if (nursery?.is_default) {
      throw new Error('Cannot delete the default nursery. Please set another nursery as default first.')
    }

    const { error } = await supabase
      .from('nursery')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('enterprise_id', enterpriseId)

    if (error) throw error
  }

  /**
   * Set a nursery as default
   */
  async setDefault(id: string, enterpriseId: string): Promise<void> {
    const supabase = this.getClient()

    // First, unset current default
    await supabase
      .from('nursery')
      .update({ is_default: false })
      .eq('enterprise_id', enterpriseId)
      .eq('is_default', true)

    // Then set new default
    const { error } = await supabase
      .from('nursery')
      .update({ is_default: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('enterprise_id', enterpriseId)

    if (error) throw error
  }

  /**
   * Get statistics for a nursery
   */
  async getStats(nurseryId: string): Promise<NurseryStats> {
    const supabase = this.getClient()

    // Get child count
    const { count: childCount, error: childError } = await supabase
      .from('child')
      .select('*', { count: 'exact', head: true })
      .eq('nursery_id', nurseryId)

    if (childError) throw childError

    // Get room count
    const { count: roomCount, error: roomError } = await supabase
      .from('room')
      .select('*', { count: 'exact', head: true })
      .eq('nursery_id', nurseryId)
      .eq('is_active', true)

    if (roomError) throw roomError

    // Get employee count
    const { count: employeeCount, error: employeeError } = await supabase
      .from('employee_nursery_access')
      .select('*', { count: 'exact', head: true })
      .eq('nursery_id', nurseryId)

    if (employeeError) throw employeeError

    return {
      childCount: childCount || 0,
      roomCount: roomCount || 0,
      employeeCount: employeeCount || 0
    }
  }
}

// Export singleton instance
export const nurseryService = new NurseryService()
