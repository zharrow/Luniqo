import { createClient } from '@/lib/supabase/client'
import {
  allergiesDietaryService,
  type Allergy,
  type DietaryRequirement
} from './allergies-dietary.service'

const supabase: any = createClient()

export interface Child {
  id: string
  nursery_id: string
  family_id: string | null
  last_name: string
  first_name: string
  birth_date: string
  gender: string | null
  nationality: string
  birth_place: string | null
  social_security_number: string | null
  caf_number: string | null
  admission_date: string | null
  exit_date: string | null
  trial_period_end: string | null
  preferred_name: string | null
  photo_url: string | null
  section: string
  allergies: string | null
  specific_diet: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateChildInput {
  family_id?: string
  last_name: string
  first_name: string
  birth_date: string
  gender?: string
  nationality?: string
  birth_place?: string
  social_security_number?: string
  caf_number?: string
  admission_date?: string
  trial_period_end?: string
  preferred_name?: string
  section: string
  allergies?: string
  specific_diet?: string
  notes?: string
}

export interface UpdateChildInput {
  family_id?: string
  last_name?: string
  first_name?: string
  birth_date?: string
  gender?: string
  nationality?: string
  birth_place?: string
  social_security_number?: string
  caf_number?: string
  admission_date?: string
  exit_date?: string
  trial_period_end?: string
  preferred_name?: string
  photo_url?: string
  section?: string
  allergies?: string
  specific_diet?: string
  notes?: string
  is_active?: boolean
}

/**
 * Child with structured allergies and dietary requirements
 * Used for the Core children list with allergy badges
 */
export interface ChildWithAllergies extends Child {
  childAllergies: Allergy[]
  childDietaryRequirements: DietaryRequirement[]
}

export class ChildService {
  private getClient(): any {
    return createClient()
  }

  // ============================================================
  // BASIC CRUD OPERATIONS
  // ============================================================

  /**
   * Get all children for a nursery
   */
  async getAll(nurseryId: string): Promise<Child[]> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('child')
      .select('*')
      .eq('nursery_id', nurseryId)
      .order('last_name', { ascending: true })

    if (error) throw error
    return (data as any[]) || []
  }

  /**
   * Get active children only
   */
  async getActive(nurseryId: string): Promise<Child[]> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('child')
      .select('*')
      .eq('nursery_id', nurseryId)
      .eq('is_active', true)
      .order('last_name', { ascending: true })

    if (error) throw error
    return (data as any[]) || []
  }

  /**
   * Get a single child by ID
   */
  async getById(childId: string): Promise<Child | null> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('child')
      .select('*')
      .eq('id', childId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data as any
  }

  /**
   * Get complete child profile with all relationships
   */
  async getFullProfile(childId: string): Promise<any> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('child')
      .select(`
        *,
        family:family(*),
        guardians:guardian_child(
          *,
          guardian:guardian(*)
        ),
        current_section:child_section!inner(
          *,
          section:section(*)
        ),
        health:child_health(*),
        allergies:child_allergy(*),
        diets:child_diet(*),
        vaccinations:child_vaccination(*),
        photos:child_photo(*),
        documents:child_document(*),
        authorizations:child_authorization(*),
        emergency_contacts:child_emergency_contact(*),
        doctors:child_doctor(*),
        pai:pai_document(*)
      `)
      .eq('id', childId)
      .is('current_section.end_date', null)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data
  }

  /**
   * Create a new child
   */
  async create(nurseryId: string, input: CreateChildInput): Promise<Child> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('child')
      .insert({
        nursery_id: nurseryId,
        family_id: input.family_id || null,
        last_name: input.last_name,
        first_name: input.first_name,
        birth_date: input.birth_date,
        gender: input.gender || null,
        nationality: input.nationality || 'France',
        birth_place: input.birth_place || null,
        social_security_number: input.social_security_number || null,
        caf_number: input.caf_number || null,
        admission_date: input.admission_date || null,
        trial_period_end: input.trial_period_end || null,
        preferred_name: input.preferred_name || null,
        section: input.section,
        allergies: input.allergies || null,
        specific_diet: input.specific_diet || null,
        notes: input.notes || null,
        is_active: true
      })
      .select()
      .single()

    if (error) throw error
    return data as any
  }

  /**
   * Update a child
   */
  async update(childId: string, input: UpdateChildInput): Promise<Child> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('child')
      .update(input)
      .eq('id', childId)
      .select()
      .single()

    if (error) throw error
    return data as any
  }

  /**
   * Delete a child (soft delete)
   */
  async delete(childId: string): Promise<void> {
    const supabase = this.getClient()
    const { error } = await supabase
      .from('child')
      .update({ is_active: false, exit_date: new Date().toISOString().split('T')[0] })
      .eq('id', childId)

    if (error) throw error
  }

  // ============================================================
  // SECTION OPERATIONS
  // ============================================================

  /**
   * Get children by section
   */
  async getBySection(sectionId: string): Promise<Child[]> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('child_section')
      .select(`
        child:child(*)
      `)
      .eq('section_id', sectionId)
      .is('end_date', null)
      .order('child.last_name', { ascending: true })

    if (error) throw error
    return ((data as any[]) || []).map((item: any) => item.child)
  }

  // ============================================================
  // FAMILY OPERATIONS
  // ============================================================

  /**
   * Get children by family
   */
  async getByFamily(familyId: string): Promise<Child[]> {
    const supabase = this.getClient()
    const { data, error} = await supabase
      .from('child')
      .select('*')
      .eq('family_id', familyId)
      .order('birth_date', { ascending: false })

    if (error) throw error
    return (data as any[]) || []
  }

  // ============================================================
  // HEALTH OPERATIONS
  // ============================================================

  /**
   * Get or create health record
   */
  async getOrCreateHealth(childId: string, createdById: string): Promise<any> {
    const supabase = this.getClient()

    // Try to get existing
    let { data, error } = await supabase
      .from('child_health')
      .select('*')
      .eq('child_id', childId)
      .single()

    if (error && error.code === 'PGRST116') {
      // Create if doesn't exist
      const { data: newHealth, error: createError } = await supabase
        .from('child_health')
        .insert({
          child_id: childId,
          updated_by_id: createdById
        })
        .select()
        .single()

      if (createError) throw createError
      return newHealth
    }

    if (error) throw error
    return data
  }

  /**
   * Update health record
   */
  async updateHealth(childId: string, userId: string, updates: any): Promise<any> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('child_health')
      .update({ ...updates, updated_by_id: userId })
      .eq('child_id', childId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Add allergy
   */
  async addAllergy(childId: string, allergy: any): Promise<any> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('child_allergy')
      .insert({ child_id: childId, ...allergy })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Get allergies
   */
  async getAllergies(childId: string): Promise<any[]> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('child_allergy')
      .select('*')
      .eq('child_id', childId)
      .eq('is_active', true)
      .order('severity', { ascending: false })

    if (error) throw error
    return (data as any[]) || []
  }

  /**
   * Add diet
   */
  async addDiet(childId: string, diet: any): Promise<any> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('child_diet')
      .insert({ child_id: childId, ...diet })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Get diets
   */
  async getDiets(childId: string): Promise<any[]> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('child_diet')
      .select('*')
      .eq('child_id', childId)
      .eq('is_active', true)
      .order('start_date', { ascending: false })

    if (error) throw error
    return (data as any[]) || []
  }

  /**
   * Add vaccination
   */
  async addVaccination(childId: string, vaccination: any): Promise<any> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('child_vaccination')
      .insert({ child_id: childId, ...vaccination })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Get vaccinations
   */
  async getVaccinations(childId: string): Promise<any[]> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('child_vaccination')
      .select('*')
      .eq('child_id', childId)
      .order('administration_date', { ascending: false })

    if (error) throw error
    return (data as any[]) || []
  }

  /**
   * Get children with pending vaccinations
   */
  async getWithPendingVaccinations(nurseryId: string): Promise<Child[]> {
    const supabase = this.getClient()
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('child_vaccination')
      .select(`
        child:child!inner(*)
      `)
      .eq('child.nursery_id', nurseryId)
      .eq('child.is_active', true)
      .lte('next_dose_due_date', today)
      .eq('is_up_to_date', false)

    if (error) throw error
    return ((data as any[]) || []).map((item: any) => item.child)
  }

  // ============================================================
  // DOCUMENT OPERATIONS
  // ============================================================

  /**
   * Upload document
   */
  async uploadDocument(childId: string, userId: string, document: any): Promise<any> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('child_document')
      .insert({
        child_id: childId,
        uploaded_by_id: userId,
        ...document
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Get documents
   */
  async getDocuments(childId: string): Promise<any[]> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('child_document')
      .select('*')
      .eq('child_id', childId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data as any[]) || []
  }

  /**
   * Get children with expired documents
   */
  async getWithExpiredDocuments(nurseryId: string): Promise<Child[]> {
    const supabase = this.getClient()
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('child_document')
      .select(`
        child:child!inner(*)
      `)
      .eq('child.nursery_id', nurseryId)
      .eq('child.is_active', true)
      .lte('expiry_date', today)
      .neq('status', 'expired')

    if (error) throw error
    return ((data as any[]) || []).map((item: any) => item.child)
  }

  // ============================================================
  // AUTHORIZATION OPERATIONS
  // ============================================================

  /**
   * Add authorization
   */
  async addAuthorization(childId: string, userId: string, authorization: any): Promise<any> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('child_authorization')
      .insert({
        child_id: childId,
        created_by_id: userId,
        ...authorization
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Get authorizations
   */
  async getAuthorizations(childId: string): Promise<any[]> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('child_authorization')
      .select('*')
      .eq('child_id', childId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data as any[]) || []
  }

  // ============================================================
  // EMERGENCY CONTACT OPERATIONS
  // ============================================================

  /**
   * Add emergency contact
   */
  async addEmergencyContact(childId: string, contact: any): Promise<any> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('child_emergency_contact')
      .insert({ child_id: childId, ...contact })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Get emergency contacts
   */
  async getEmergencyContacts(childId: string): Promise<any[]> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('child_emergency_contact')
      .select('*')
      .eq('child_id', childId)
      .eq('is_active', true)
      .order('priority_order', { ascending: true })

    if (error) throw error
    return (data as any[]) || []
  }

  // ============================================================
  // DOCTOR OPERATIONS
  // ============================================================

  /**
   * Add doctor
   */
  async addDoctor(childId: string, doctor: any): Promise<any> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('child_doctor')
      .insert({ child_id: childId, ...doctor })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Get doctors
   */
  async getDoctors(childId: string): Promise<any[]> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('child_doctor')
      .select('*')
      .eq('child_id', childId)
      .order('is_primary', { ascending: false })

    if (error) throw error
    return (data as any[]) || []
  }

  // ============================================================
  // PAI OPERATIONS
  // ============================================================

  /**
   * Create PAI
   */
  async createPAI(childId: string, userId: string, pai: any): Promise<any> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('pai_document')
      .insert({
        child_id: childId,
        created_by_id: userId,
        ...pai
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Get active PAI
   */
  async getActivePAI(childId: string): Promise<any | null> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('pai_document')
      .select('*')
      .eq('child_id', childId)
      .eq('is_active', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data
  }

  /**
   * Get children with active PAI
   */
  async getWithActivePAI(nurseryId: string): Promise<Child[]> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('child_health')
      .select(`
        child:child!inner(*)
      `)
      .eq('child.nursery_id', nurseryId)
      .eq('child.is_active', true)
      .eq('has_pai', true)

    if (error) throw error
    return ((data as any[]) || []).map((item: any) => item.child)
  }

  // ============================================================
  // PHOTO OPERATIONS
  // ============================================================

  /**
   * Add photo
   */
  async addPhoto(childId: string, userId: string, photo: any): Promise<any> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('child_photo')
      .insert({
        child_id: childId,
        uploaded_by_id: userId,
        ...photo
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Get photos
   */
  async getPhotos(childId: string): Promise<any[]> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('child_photo')
      .select('*')
      .eq('child_id', childId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data as any[]) || []
  }

  /**
   * Set profile photo
   */
  async setProfilePhoto(childId: string, photoId: string): Promise<void> {
    const supabase = this.getClient()

    // Unset all profile photos
    await supabase
      .from('child_photo')
      .update({ is_profile_photo: false })
      .eq('child_id', childId)

    // Set new profile photo
    const { error } = await supabase
      .from('child_photo')
      .update({ is_profile_photo: true })
      .eq('id', photoId)

    if (error) throw error

    // Update child.photo_url
    const { data: photo } = await supabase
      .from('child_photo')
      .select('file_url')
      .eq('id', photoId)
      .single()

    if (photo) {
      await supabase
        .from('child')
        .update({ photo_url: photo.file_url })
        .eq('id', childId)
    }
  }

  // ============================================================
  // SEARCH & FILTERS
  // ============================================================

  /**
   * Search children
   */
  async search(nurseryId: string, searchTerm: string): Promise<Child[]> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('child')
      .select('*')
      .eq('nursery_id', nurseryId)
      .eq('is_active', true)
      .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,preferred_name.ilike.%${searchTerm}%`)
      .order('last_name', { ascending: true })

    if (error) throw error
    return (data as any[]) || []
  }

  // ============================================================
  // ALLERGIES & DIETARY INTEGRATION (Core module)
  // ============================================================

  /**
   * Get a single child with structured allergies and dietary requirements
   */
  async getWithAllergies(childId: string, nurseryId: string): Promise<ChildWithAllergies | null> {
    const supabase = this.getClient()
    const { data: child, error } = await supabase
      .from('child')
      .select('*')
      .eq('id', childId)
      .eq('nursery_id', nurseryId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    try {
      const [allergies, dietary] = await Promise.all([
        allergiesDietaryService.getChildAllergies(childId),
        allergiesDietaryService.getChildDietaryRequirements(childId)
      ])

      return {
        ...child,
        childAllergies: allergies.map(ca => ca.allergy).filter(Boolean) as Allergy[],
        childDietaryRequirements: dietary.map(cd => cd.dietary_requirement).filter(Boolean) as DietaryRequirement[]
      } as ChildWithAllergies
    } catch (err) {
      console.error('Error loading allergies/dietary for child:', err)
      return {
        ...child,
        childAllergies: [],
        childDietaryRequirements: []
      } as ChildWithAllergies
    }
  }

  /**
   * Get all active children with their structured allergies and dietary requirements
   * Used for the Core children list page
   */
  async getAllWithAllergies(nurseryId: string): Promise<ChildWithAllergies[]> {
    const children = await this.getActive(nurseryId)

    return Promise.all(
      children.map(async (child) => {
        try {
          const [allergies, dietary] = await Promise.all([
            allergiesDietaryService.getChildAllergies(child.id),
            allergiesDietaryService.getChildDietaryRequirements(child.id)
          ])

          return {
            ...child,
            childAllergies: allergies.map(ca => ca.allergy).filter(Boolean) as Allergy[],
            childDietaryRequirements: dietary.map(cd => cd.dietary_requirement).filter(Boolean) as DietaryRequirement[]
          } as ChildWithAllergies
        } catch (err) {
          console.error('Error loading allergies for child:', child.id, err)
          return {
            ...child,
            childAllergies: [],
            childDietaryRequirements: []
          } as ChildWithAllergies
        }
      })
    )
  }
}

export const childService = new ChildService()
