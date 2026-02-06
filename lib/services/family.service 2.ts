import { createClient } from '@/lib/supabase/client'

const supabase: any = createClient()

export interface Family {
  id: string
  nursery_id: string
  family_name: string
  address: string | null
  postal_code: string | null
  city: string | null
  country: string
  family_situation: string | null
  number_of_children: number
  annual_income: number | null
  caf_number: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  created_by_id: string | null
}

export interface CreateFamilyInput {
  family_name: string
  address?: string
  postal_code?: string
  city?: string
  country?: string
  family_situation?: string
  number_of_children?: number
  annual_income?: number
  caf_number?: string
}

export interface UpdateFamilyInput {
  family_name?: string
  address?: string
  postal_code?: string
  city?: string
  country?: string
  family_situation?: string
  number_of_children?: number
  annual_income?: number
  caf_number?: string
  is_active?: boolean
}

export class FamilyService {
  private getClient(): any {
    return createClient()
  }

  /**
   * Get all families for a nursery
   */
  async getAll(nurseryId: string): Promise<Family[]> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('family')
      .select('*')
      .eq('nursery_id', nurseryId)
      .order('family_name', { ascending: true })

    if (error) throw error
    return (data as any[]) || []
  }

  /**
   * Get active families only
   */
  async getActive(nurseryId: string): Promise<Family[]> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('family')
      .select('*')
      .eq('nursery_id', nurseryId)
      .eq('is_active', true)
      .order('family_name', { ascending: true })

    if (error) throw error
    return (data as any[]) || []
  }

  /**
   * Get a single family by ID
   */
  async getById(familyId: string): Promise<Family | null> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('family')
      .select('*')
      .eq('id', familyId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }

    return data as any
  }

  /**
   * Get family with children and guardians
   */
  async getFullProfile(familyId: string): Promise<any> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('family')
      .select(`
        *,
        guardians:guardian(*),
        children:child(*)
      `)
      .eq('id', familyId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data
  }

  /**
   * Create a new family
   */
  async create(nurseryId: string, createdById: string, input: CreateFamilyInput): Promise<Family> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('family')
      .insert({
        nursery_id: nurseryId,
        family_name: input.family_name,
        address: input.address || null,
        postal_code: input.postal_code || null,
        city: input.city || null,
        country: input.country || 'France',
        family_situation: input.family_situation || null,
        number_of_children: input.number_of_children || 1,
        annual_income: input.annual_income || null,
        caf_number: input.caf_number || null,
        created_by_id: createdById,
        is_active: true
      })
      .select()
      .single()

    if (error) throw error
    return data as any
  }

  /**
   * Update a family
   */
  async update(familyId: string, input: UpdateFamilyInput): Promise<Family> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('family')
      .update(input)
      .eq('id', familyId)
      .select()
      .single()

    if (error) throw error
    return data as any
  }

  /**
   * Delete a family (soft delete)
   */
  async delete(familyId: string): Promise<void> {
    const supabase = this.getClient()
    const { error } = await supabase
      .from('family')
      .update({ is_active: false })
      .eq('id', familyId)

    if (error) throw error
  }

  /**
   * Hard delete a family (removes from database)
   */
  async hardDelete(familyId: string): Promise<void> {
    const supabase = this.getClient()
    const { error } = await supabase
      .from('family')
      .delete()
      .eq('id', familyId)

    if (error) throw error
  }

  /**
   * Search families by name
   */
  async search(nurseryId: string, searchTerm: string): Promise<Family[]> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('family')
      .select('*')
      .eq('nursery_id', nurseryId)
      .eq('is_active', true)
      .ilike('family_name', `%${searchTerm}%`)
      .order('family_name', { ascending: true })

    if (error) throw error
    return (data as any[]) || []
  }

  /**
   * Get families by CAF number
   */
  async getByCafNumber(nurseryId: string, cafNumber: string): Promise<Family | null> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('family')
      .select('*')
      .eq('nursery_id', nurseryId)
      .eq('caf_number', cafNumber)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data as any
  }

  /**
   * Get family statistics
   */
  async getStats(familyId: string): Promise<{
    totalChildren: number
    totalGuardians: number
  }> {
    const supabase = this.getClient()

    // Get children count
    const { count: totalChildren } = await supabase
      .from('child')
      .select('*', { count: 'exact', head: true })
      .eq('family_id', familyId)
      .eq('is_active', true)

    // Get guardians count
    const { count: totalGuardians } = await supabase
      .from('guardian')
      .select('*', { count: 'exact', head: true })
      .eq('family_id', familyId)
      .eq('is_active', true)

    return {
      totalChildren: totalChildren || 0,
      totalGuardians: totalGuardians || 0
    }
  }
}

export const familyService = new FamilyService()
