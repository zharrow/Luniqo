import { createClient } from '@/lib/supabase/client'

const supabase: any = createClient()

export interface Guardian {
  id: string
  family_id: string
  first_name: string
  last_name: string
  email: string | null
  phone_primary: string | null
  phone_secondary: string | null
  legal_responsibility: string
  relationship_to_child: string | null
  has_custody: boolean
  can_pick_up: boolean
  employer_name: string | null
  employer_address: string | null
  employer_phone: string | null
  profession: string | null
  work_certificate_date: string | null
  preferred_contact_method: string | null
  notification_enabled: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface GuardianChild {
  guardian_id: string
  child_id: string
  relationship: string | null
  is_primary_contact: boolean
  can_authorize_medical: boolean
  created_at: string
}

export interface CreateGuardianInput {
  first_name: string
  last_name: string
  email?: string
  phone_primary?: string
  phone_secondary?: string
  legal_responsibility: string
  relationship_to_child?: string
  has_custody?: boolean
  can_pick_up?: boolean
  employer_name?: string
  employer_address?: string
  employer_phone?: string
  profession?: string
  work_certificate_date?: string
  preferred_contact_method?: string
  notification_enabled?: boolean
}

export interface UpdateGuardianInput {
  first_name?: string
  last_name?: string
  email?: string
  phone_primary?: string
  phone_secondary?: string
  legal_responsibility?: string
  relationship_to_child?: string
  has_custody?: boolean
  can_pick_up?: boolean
  employer_name?: string
  employer_address?: string
  employer_phone?: string
  profession?: string
  work_certificate_date?: string
  preferred_contact_method?: string
  notification_enabled?: boolean
  is_active?: boolean
}

export interface LinkToChildInput {
  relationship?: string
  is_primary_contact?: boolean
  can_authorize_medical?: boolean
}

export class GuardianService {
  private getClient(): any {
    return createClient()
  }

  /**
   * Get all guardians for a family
   */
  async getByFamily(familyId: string): Promise<Guardian[]> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('guardian')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return (data as any[]) || []
  }

  /**
   * Get all guardians for a child
   */
  async getByChild(childId: string): Promise<any[]> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('guardian_child')
      .select(`
        *,
        guardian:guardian(*)
      `)
      .eq('child_id', childId)

    if (error) throw error
    return (data as any[]) || []
  }

  /**
   * Get active guardians for a family
   */
  async getActiveByFamily(familyId: string): Promise<Guardian[]> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('guardian')
      .select('*')
      .eq('family_id', familyId)
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (error) throw error
    return (data as any[]) || []
  }

  /**
   * Get a single guardian by ID
   */
  async getById(guardianId: string): Promise<Guardian | null> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('guardian')
      .select('*')
      .eq('id', guardianId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data as any
  }

  /**
   * Get guardian with their children
   */
  async getWithChildren(guardianId: string): Promise<any> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('guardian')
      .select(`
        *,
        guardian_child(
          *,
          child:child(*)
        )
      `)
      .eq('id', guardianId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data
  }

  /**
   * Create a new guardian
   */
  async create(familyId: string, input: CreateGuardianInput): Promise<Guardian> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('guardian')
      .insert({
        family_id: familyId,
        first_name: input.first_name,
        last_name: input.last_name,
        email: input.email || null,
        phone_primary: input.phone_primary || null,
        phone_secondary: input.phone_secondary || null,
        legal_responsibility: input.legal_responsibility,
        relationship_to_child: input.relationship_to_child || null,
        has_custody: input.has_custody ?? true,
        can_pick_up: input.can_pick_up ?? true,
        employer_name: input.employer_name || null,
        employer_address: input.employer_address || null,
        employer_phone: input.employer_phone || null,
        profession: input.profession || null,
        work_certificate_date: input.work_certificate_date || null,
        preferred_contact_method: input.preferred_contact_method || null,
        notification_enabled: input.notification_enabled ?? true,
        is_active: true
      })
      .select()
      .single()

    if (error) throw error
    return data as any
  }

  /**
   * Update a guardian
   */
  async update(guardianId: string, input: UpdateGuardianInput): Promise<Guardian> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('guardian')
      .update(input)
      .eq('id', guardianId)
      .select()
      .single()

    if (error) throw error
    return data as any
  }

  /**
   * Delete a guardian (soft delete)
   */
  async delete(guardianId: string): Promise<void> {
    const supabase = this.getClient()
    const { error } = await supabase
      .from('guardian')
      .update({ is_active: false })
      .eq('id', guardianId)

    if (error) throw error
  }

  /**
   * Link a guardian to a child
   */
  async linkToChild(guardianId: string, childId: string, input?: LinkToChildInput): Promise<GuardianChild> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('guardian_child')
      .insert({
        guardian_id: guardianId,
        child_id: childId,
        relationship: input?.relationship || null,
        is_primary_contact: input?.is_primary_contact ?? false,
        can_authorize_medical: input?.can_authorize_medical ?? false
      })
      .select()
      .single()

    if (error) throw error
    return data as any
  }

  /**
   * Unlink a guardian from a child
   */
  async unlinkFromChild(guardianId: string, childId: string): Promise<void> {
    const supabase = this.getClient()
    const { error } = await supabase
      .from('guardian_child')
      .delete()
      .eq('guardian_id', guardianId)
      .eq('child_id', childId)

    if (error) throw error
  }

  /**
   * Update guardian-child relationship
   */
  async updateChildRelationship(
    guardianId: string,
    childId: string,
    input: Partial<LinkToChildInput>
  ): Promise<GuardianChild> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('guardian_child')
      .update(input)
      .eq('guardian_id', guardianId)
      .eq('child_id', childId)
      .select()
      .single()

    if (error) throw error
    return data as any
  }

  /**
   * Create portal account for guardian
   */
  async createPortalAccount(guardianId: string, email: string): Promise<void> {
    // This would create a Supabase Auth user and link it via guardian_user table
    // Implementation depends on auth setup
    // For now, this is a placeholder
    console.warn('createPortalAccount not yet implemented')
  }

  /**
   * Get guardians who can pick up a child
   */
  async getAuthorizedPickup(childId: string): Promise<any[]> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('guardian_child')
      .select(`
        *,
        guardian:guardian!inner(*)
      `)
      .eq('child_id', childId)
      .eq('guardian.can_pick_up', true)
      .eq('guardian.is_active', true)

    if (error) throw error
    return (data as any[]) || []
  }

  /**
   * Get primary contact for a child
   */
  async getPrimaryContact(childId: string): Promise<any | null> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('guardian_child')
      .select(`
        *,
        guardian:guardian(*)
      `)
      .eq('child_id', childId)
      .eq('is_primary_contact', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data
  }

  /**
   * Search guardians by name or email
   */
  async search(familyId: string, searchTerm: string): Promise<Guardian[]> {
    const supabase = this.getClient()
    const { data, error } = await supabase
      .from('guardian')
      .select('*')
      .eq('family_id', familyId)
      .eq('is_active', true)
      .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .order('last_name', { ascending: true })

    if (error) throw error
    return (data as any[]) || []
  }
}

export const guardianService = new GuardianService()
