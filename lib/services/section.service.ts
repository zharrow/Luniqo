import { createClient } from '@/lib/supabase/client'

const supabase: any = createClient()

export interface Section {
  id: string
  nursery_id: string
  name: string
  code: string | null
  age_min_months: number | null
  age_max_months: number | null
  capacity: number | null
  color_hex: string | null
  icon_name: string | null
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ChildSection {
  id: string
  child_id: string
  section_id: string
  start_date: string
  end_date: string | null
  created_at: string
  created_by_id: string | null
}

export interface CreateSectionInput {
  name: string
  code?: string
  age_min_months?: number
  age_max_months?: number
  capacity?: number
  color_hex?: string
  icon_name?: string
  display_order?: number
}

export interface UpdateSectionInput {
  name?: string
  code?: string
  age_min_months?: number
  age_max_months?: number
  capacity?: number
  color_hex?: string
  icon_name?: string
  display_order?: number
  is_active?: boolean
}

export class SectionService {
  private getClient(): any {
    return createClient()
  }

  /**
   * Get all sections for a nursery
   */
  async getByNursery(nurseryId: string): Promise<Section[]> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('section')
      .select('*')
      .eq('nursery_id', nurseryId)
      .order('display_order', { ascending: true })

    if (error) throw error
    return (data as any[]) || []
  }

  /**
   * Get active sections only
   */
  async getActive(nurseryId: string): Promise<Section[]> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('section')
      .select('*')
      .eq('nursery_id', nurseryId)
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) throw error
    return (data as any[]) || []
  }

  /**
   * Get a single section by ID
   */
  async getById(sectionId: string): Promise<Section | null> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('section')
      .select('*')
      .eq('id', sectionId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data as any
  }

  /**
   * Get sections with child count
   */
  async getWithStats(nurseryId: string): Promise<any[]> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('section')
      .select(`
        *,
        child_section!inner(
          child_id
        )
      `)
      .eq('nursery_id', nurseryId)
      .is('child_section.end_date', null) // Only current assignments
      .order('display_order', { ascending: true })

    if (error) throw error

    // Count children per section
    const sections = (data as any[]) || []
    return sections.map((section: any) => ({
      ...section,
      current_children: section.child_section?.length || 0,
      child_section: undefined // Remove nested data
    }))
  }

  /**
   * Create a new section
   */
  async create(nurseryId: string, input: CreateSectionInput): Promise<Section> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('section')
      .insert({
        nursery_id: nurseryId,
        name: input.name,
        code: input.code || null,
        age_min_months: input.age_min_months || null,
        age_max_months: input.age_max_months || null,
        capacity: input.capacity || null,
        color_hex: input.color_hex || null,
        icon_name: input.icon_name || null,
        display_order: input.display_order || 0,
        is_active: true
      })
      .select()
      .single()

    if (error) throw error
    return data as any
  }

  /**
   * Update a section
   */
  async update(sectionId: string, input: UpdateSectionInput): Promise<Section> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('section')
      .update(input)
      .eq('id', sectionId)
      .select()
      .single()

    if (error) throw error
    return data as any
  }

  /**
   * Delete a section (soft delete)
   */
  async delete(sectionId: string): Promise<void> {
    const supabase = this.getClient()
    const { error } = await supabase
      .from('section')
      .update({ is_active: false })
      .eq('id', sectionId)

    if (error) throw error
  }

  /**
   * Assign a child to a section
   */
  async assignChild(
    childId: string,
    sectionId: string,
    startDate: string,
    createdById: string
  ): Promise<ChildSection> {
    const supabase = this.getClient()

    // First, end any current section assignment
    await supabase
      .from('child_section')
      .update({ end_date: startDate })
      .eq('child_id', childId)
      .is('end_date', null)

    // Create new assignment
    const { data, error } = await supabase
      .from('child_section')
      .insert({
        child_id: childId,
        section_id: sectionId,
        start_date: startDate,
        created_by_id: createdById
      })
      .select()
      .single()

    if (error) throw error
    return data as any
  }

  /**
   * Get current section for a child
   */
  async getCurrentSection(childId: string): Promise<any | null> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('child_section')
      .select(`
        *,
        section:section(*)
      `)
      .eq('child_id', childId)
      .is('end_date', null)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data
  }

  /**
   * Get section history for a child
   */
  async getChildHistory(childId: string): Promise<any[]> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('child_section')
      .select(`
        *,
        section:section(*)
      `)
      .eq('child_id', childId)
      .order('start_date', { ascending: false })

    if (error) throw error
    return (data as any[]) || []
  }

  /**
   * Get all children in a section
   */
  async getChildren(sectionId: string): Promise<any[]> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('child_section')
      .select(`
        *,
        child:child(*)
      `)
      .eq('section_id', sectionId)
      .is('end_date', null) // Only current assignments
      .order('child.last_name', { ascending: true })

    if (error) throw error
    return (data as any[]) || []
  }

  /**
   * Move child to another section
   */
  async moveChild(
    childId: string,
    newSectionId: string,
    transitionDate: string,
    createdById: string
  ): Promise<ChildSection> {
    return this.assignChild(childId, newSectionId, transitionDate, createdById)
  }

  /**
   * Get section occupancy rate
   */
  async getOccupancy(sectionId: string): Promise<{
    capacity: number | null
    current: number
    rate: number | null
  }> {
    const supabase = this.getClient()

    // Get section capacity
    const section = await this.getById(sectionId)
    if (!section) {
      throw new Error('Section not found')
    }

    // Count current children
    const { count } = await supabase
      .from('child_section')
      .select('*', { count: 'exact', head: true })
      .eq('section_id', sectionId)
      .is('end_date', null)

    const current = count || 0
    const capacity = section.capacity
    const rate = capacity ? (current / capacity) * 100 : null

    return {
      capacity,
      current,
      rate
    }
  }

  /**
   * Reorder sections
   */
  async reorder(nurseryId: string, sectionOrders: { id: string; display_order: number }[]): Promise<void> {
    const supabase = this.getClient()
    const promises = sectionOrders.map(({ id, display_order }) =>
      supabase
        .from('section')
        .update({ display_order })
        .eq('id', id)
        .eq('nursery_id', nurseryId)
    )

    await Promise.all(promises)
  }
}

export const sectionService = new SectionService()
