import { createClient } from '@/lib/supabase/client'

// ============================================================================
// TYPES
// ============================================================================

export interface Allergy {
  id: string
  name: string
  description: string | null
  icon: string | null
  severity: 'mild' | 'moderate' | 'severe'
  is_common: boolean
  display_order: number
  created_at: string
}

export interface DietaryRequirement {
  id: string
  name: string
  description: string | null
  icon: string | null
  category: 'religious' | 'health' | 'ethical' | 'preference' | null
  is_common: boolean
  display_order: number
  created_at: string
}

export interface ChildAllergy {
  id: string
  child_id: string
  allergy_id: string
  severity: string | null
  notes: string | null
  confirmed_by_doctor: boolean
  diagnosis_date: string | null
  created_at: string
  // Relations
  allergy?: Allergy
}

export interface ChildDietaryRequirement {
  id: string
  child_id: string
  dietary_requirement_id: string
  notes: string | null
  start_date: string | null
  end_date: string | null
  created_at: string
  // Relations
  dietary_requirement?: DietaryRequirement
}

export interface ChildWithAllergiesAndDietary {
  id: string
  first_name: string
  last_name: string
  nursery_id: string
  allergies: Allergy[]
  dietary_requirements: DietaryRequirement[]
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class AllergiesDietaryService {
  private getClient() {
    return createClient()
  }

  // --------------------------------------------------------------------------
  // ALLERGIES - Reference data
  // --------------------------------------------------------------------------

  /**
   * Get all allergies (reference list)
   */
  async getAllAllergies(): Promise<Allergy[]> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('allergy')
      .select('*')
      .order('display_order')

    if (error) throw error
    return (data as Allergy[]) || []
  }

  /**
   * Get common allergies only (for quick selection)
   */
  async getCommonAllergies(): Promise<Allergy[]> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('allergy')
      .select('*')
      .eq('is_common', true)
      .order('display_order')

    if (error) throw error
    return (data as Allergy[]) || []
  }

  // --------------------------------------------------------------------------
  // DIETARY REQUIREMENTS - Reference data
  // --------------------------------------------------------------------------

  /**
   * Get all dietary requirements (reference list)
   */
  async getAllDietaryRequirements(): Promise<DietaryRequirement[]> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('dietary_requirement')
      .select('*')
      .order('display_order')

    if (error) throw error
    return (data as DietaryRequirement[]) || []
  }

  /**
   * Get common dietary requirements only
   */
  async getCommonDietaryRequirements(): Promise<DietaryRequirement[]> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('dietary_requirement')
      .select('*')
      .eq('is_common', true)
      .order('display_order')

    if (error) throw error
    return (data as DietaryRequirement[]) || []
  }

  /**
   * Get dietary requirements by category
   */
  async getDietaryRequirementsByCategory(category: string): Promise<DietaryRequirement[]> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('dietary_requirement')
      .select('*')
      .eq('category', category)
      .order('display_order')

    if (error) throw error
    return (data as DietaryRequirement[]) || []
  }

  // --------------------------------------------------------------------------
  // CHILD ALLERGIES - M2M operations
  // --------------------------------------------------------------------------

  /**
   * Get allergies for a specific child
   */
  async getChildAllergies(childId: string): Promise<ChildAllergy[]> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('child_allergy')
      .select('*, allergy(*)')
      .eq('child_id', childId)

    if (error) throw error
    return (data as ChildAllergy[]) || []
  }

  /**
   * Get allergy IDs for a child (simple array)
   */
  async getChildAllergyIds(childId: string): Promise<string[]> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('child_allergy')
      .select('allergy_id')
      .eq('child_id', childId)

    if (error) throw error
    return (data as { allergy_id: string }[] || []).map(r => r.allergy_id)
  }

  /**
   * Set allergies for a child (replaces existing)
   */
  async setChildAllergies(childId: string, allergyIds: string[]): Promise<void> {
    const supabase = this.getClient()

    // Delete existing allergies
    const { error: deleteError } = await supabase
      .from('child_allergy')
      .delete()
      .eq('child_id', childId)

    if (deleteError) throw deleteError

    // Insert new allergies
    if (allergyIds.length > 0) {
      const inserts = allergyIds.map(allergyId => ({
        child_id: childId,
        allergy_id: allergyId
      }))

      const { error: insertError } = await supabase
        .from('child_allergy')
        .insert(inserts as any)

      if (insertError) throw insertError
    }
  }

  /**
   * Add a single allergy to a child
   */
  async addChildAllergy(childId: string, allergyId: string, options?: {
    severity?: string
    notes?: string
    confirmed_by_doctor?: boolean
    diagnosis_date?: string
  }): Promise<void> {
    const supabase = this.getClient()
    const { error } = await supabase
      .from('child_allergy')
      .upsert({
        child_id: childId,
        allergy_id: allergyId,
        severity: options?.severity || null,
        notes: options?.notes || null,
        confirmed_by_doctor: options?.confirmed_by_doctor || false,
        diagnosis_date: options?.diagnosis_date || null
      } as any, {
        onConflict: 'child_id,allergy_id'
      })

    if (error) throw error
  }

  /**
   * Remove an allergy from a child
   */
  async removeChildAllergy(childId: string, allergyId: string): Promise<void> {
    const supabase = this.getClient()
    const { error } = await supabase
      .from('child_allergy')
      .delete()
      .eq('child_id', childId)
      .eq('allergy_id', allergyId)

    if (error) throw error
  }

  // --------------------------------------------------------------------------
  // CHILD DIETARY REQUIREMENTS - M2M operations
  // --------------------------------------------------------------------------

  /**
   * Get dietary requirements for a specific child
   */
  async getChildDietaryRequirements(childId: string): Promise<ChildDietaryRequirement[]> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('child_dietary_requirement')
      .select('*, dietary_requirement(*)')
      .eq('child_id', childId)
      .or('end_date.is.null,end_date.gt.now()')

    if (error) throw error
    return (data as ChildDietaryRequirement[]) || []
  }

  /**
   * Get dietary requirement IDs for a child (simple array)
   */
  async getChildDietaryRequirementIds(childId: string): Promise<string[]> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('child_dietary_requirement')
      .select('dietary_requirement_id')
      .eq('child_id', childId)
      .or('end_date.is.null,end_date.gt.now()')

    if (error) throw error
    return (data as { dietary_requirement_id: string }[] || []).map(r => r.dietary_requirement_id)
  }

  /**
   * Set dietary requirements for a child (replaces existing)
   */
  async setChildDietaryRequirements(childId: string, dietaryIds: string[]): Promise<void> {
    const supabase = this.getClient()

    // Delete existing requirements
    const { error: deleteError } = await supabase
      .from('child_dietary_requirement')
      .delete()
      .eq('child_id', childId)

    if (deleteError) throw deleteError

    // Insert new requirements
    if (dietaryIds.length > 0) {
      const inserts = dietaryIds.map(dietaryId => ({
        child_id: childId,
        dietary_requirement_id: dietaryId
      }))

      const { error: insertError } = await supabase
        .from('child_dietary_requirement')
        .insert(inserts as any)

      if (insertError) throw insertError
    }
  }

  /**
   * Add a single dietary requirement to a child
   */
  async addChildDietaryRequirement(childId: string, dietaryId: string, options?: {
    notes?: string
    start_date?: string
    end_date?: string
  }): Promise<void> {
    const supabase = this.getClient()
    const { error } = await supabase
      .from('child_dietary_requirement')
      .upsert({
        child_id: childId,
        dietary_requirement_id: dietaryId,
        notes: options?.notes || null,
        start_date: options?.start_date || null,
        end_date: options?.end_date || null
      } as any, {
        onConflict: 'child_id,dietary_requirement_id'
      })

    if (error) throw error
  }

  /**
   * Remove a dietary requirement from a child
   */
  async removeChildDietaryRequirement(childId: string, dietaryId: string): Promise<void> {
    const supabase = this.getClient()
    const { error } = await supabase
      .from('child_dietary_requirement')
      .delete()
      .eq('child_id', childId)
      .eq('dietary_requirement_id', dietaryId)

    if (error) throw error
  }

  // --------------------------------------------------------------------------
  // COMBINED OPERATIONS
  // --------------------------------------------------------------------------

  /**
   * Get children with allergies for a nursery (for meal distribution)
   */
  async getChildrenWithAllergies(nurseryId: string): Promise<ChildWithAllergiesAndDietary[]> {
    const supabase = this.getClient()

    // Get all active children for this nursery
    const { data: childrenData, error: childError } = await supabase
      .from('child')
      .select('id, first_name, last_name, nursery_id')
      .eq('nursery_id', nurseryId)
      .eq('is_active', true)

    if (childError) throw childError

    const children = childrenData as { id: string; first_name: string; last_name: string; nursery_id: string }[] || []
    if (children.length === 0) return []

    // Get all allergies and dietary requirements in parallel
    const childIds = children.map(c => c.id)

    const [allergiesResult, dietaryResult] = await Promise.all([
      supabase
        .from('child_allergy')
        .select('child_id, allergy(*)')
        .in('child_id', childIds),
      supabase
        .from('child_dietary_requirement')
        .select('child_id, dietary_requirement(*)')
        .in('child_id', childIds)
        .or('end_date.is.null,end_date.gt.now()')
    ])

    if (allergiesResult.error) throw allergiesResult.error
    if (dietaryResult.error) throw dietaryResult.error

    // Build result with allergies and dietary requirements
    const allergiesMap = new Map<string, Allergy[]>()
    const dietaryMap = new Map<string, DietaryRequirement[]>()

    const allergiesData = allergiesResult.data as { child_id: string; allergy: Allergy }[] || []
    const dietaryData = dietaryResult.data as { child_id: string; dietary_requirement: DietaryRequirement }[] || []

    for (const row of allergiesData) {
      const existing = allergiesMap.get(row.child_id) || []
      if (row.allergy) {
        existing.push(row.allergy)
      }
      allergiesMap.set(row.child_id, existing)
    }

    for (const row of dietaryData) {
      const existing = dietaryMap.get(row.child_id) || []
      if (row.dietary_requirement) {
        existing.push(row.dietary_requirement)
      }
      dietaryMap.set(row.child_id, existing)
    }

    return children.map(child => ({
      id: child.id,
      first_name: child.first_name,
      last_name: child.last_name,
      nursery_id: child.nursery_id,
      allergies: allergiesMap.get(child.id) || [],
      dietary_requirements: dietaryMap.get(child.id) || []
    }))
  }

  /**
   * Get children with specific allergy (for alerts during meal)
   */
  async getChildrenWithAllergy(nurseryId: string, allergyId: string): Promise<{ id: string; first_name: string; last_name: string }[]> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('child_allergy')
      .select('child:child_id(id, first_name, last_name, nursery_id, is_active)')
      .eq('allergy_id', allergyId)

    if (error) throw error

    // Filter by nursery and active status
    return (data || [])
      .filter((row: any) => row.child?.nursery_id === nurseryId && row.child?.is_active)
      .map((row: any) => ({
        id: row.child.id,
        first_name: row.child.first_name,
        last_name: row.child.last_name
      }))
  }
}

// Export singleton instance
export const allergiesDietaryService = new AllergiesDietaryService()
