/**
 * Admission Service
 * Gestion du processus d'admission (transition demande → enfant inscrit)
 */

import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

// =====================================================
// TYPES
// =====================================================

export interface Admission {
  id: string
  application_id: string
  nursery_id: string
  child_id?: string
  family_id?: string
  admission_date: string
  start_date: string
  section_id?: string
  room_id?: string
  trial_period_weeks: number
  trial_period_end?: string
  status: 'pending' | 'active' | 'completed' | 'cancelled'
  admitted_by_id: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface AdmissionWithDetails {
  id: string
  application_id: string
  nursery_id: string
  child_id?: string
  family_id?: string
  admission_date: string
  start_date: string
  section_id?: string
  room_id?: string
  trial_period_weeks: number
  trial_period_end?: string
  status: string
  admitted_by_id: string
  notes?: string

  // Application details
  child_first_name: string
  child_last_name: string
  child_birth_date: string
  parent1_first_name: string
  parent1_last_name: string
  parent1_email: string
  parent1_phone: string

  // Related data
  nursery_name: string
  section_name?: string
  room_name?: string
  admitted_by_first_name?: string
  admitted_by_last_name?: string

  // Computed
  days_until_start: number
  has_started: boolean
  in_trial_period: boolean
}

export interface CreateAdmissionInput {
  application_id: string
  nursery_id: string
  start_date: string
  section_id?: string
  room_id?: string
  trial_period_weeks?: number
  admitted_by_id: string
  notes?: string
}

export interface UpdateAdmissionInput {
  start_date?: string
  section_id?: string
  room_id?: string
  trial_period_weeks?: number
  notes?: string
}

export interface CreatedFamilyAndChild {
  family_id: string
  child_id: string
}

// =====================================================
// SERVICE CLASS
// =====================================================

export class AdmissionService {
  private supabase: SupabaseClient

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || createClient()
  }

  // =====================================================
  // CRUD OPERATIONS
  // =====================================================

  /**
   * Create new admission
   */
  async create(data: CreateAdmissionInput): Promise<Admission> {
    const { data: admission, error } = await this.supabase
      .from('admission')
      .insert({
        ...data,
        admission_date: new Date().toISOString().split('T')[0],
        status: 'pending'
      })
      .select()
      .single()

    if (error) throw error
    return admission
  }

  /**
   * Admit application (shortcut for create)
   */
  async admit(data: CreateAdmissionInput): Promise<Admission> {
    return this.create(data)
  }

  /**
   * Get admission by ID
   */
  async getById(admissionId: string): Promise<Admission> {
    const { data, error } = await this.supabase
      .from('admission')
      .select('*')
      .eq('id', admissionId)
      .single()

    if (error) throw error
    return data
  }

  /**
   * Get admission with full details
   */
  async getByIdWithDetails(
    admissionId: string
  ): Promise<AdmissionWithDetails> {
    const { data, error } = await this.supabase
      .from('admissions_in_progress')
      .select('*')
      .eq('id', admissionId)
      .single()

    if (error) throw error
    return data
  }

  /**
   * Get admission by application ID
   */
  async getByApplicationId(applicationId: string): Promise<Admission | null> {
    const { data, error } = await this.supabase
      .from('admission')
      .select('*')
      .eq('application_id', applicationId)
      .maybeSingle()

    if (error) throw error
    return data
  }

  /**
   * Get all admissions for nursery
   */
  async getByNursery(nurseryId: string): Promise<AdmissionWithDetails[]> {
    const { data, error } = await this.supabase
      .from('admissions_in_progress')
      .select('*')
      .eq('nursery_id', nurseryId)
      .order('start_date', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * Update admission
   */
  async update(
    admissionId: string,
    data: UpdateAdmissionInput
  ): Promise<Admission> {
    const { data: admission, error } = await this.supabase
      .from('admission')
      .update(data)
      .eq('id', admissionId)
      .select()
      .single()

    if (error) throw error
    return admission
  }

  /**
   * Delete admission
   */
  async delete(admissionId: string): Promise<void> {
    const { error } = await this.supabase
      .from('admission')
      .delete()
      .eq('id', admissionId)

    if (error) throw error
  }

  // =====================================================
  // FAMILY & CHILD CREATION
  // =====================================================

  /**
   * Create family and child from application data
   */
  async createFamilyAndChild(
    admissionId: string
  ): Promise<CreatedFamilyAndChild> {
    const { data, error } = await this.supabase.rpc(
      'create_family_and_child_from_application',
      { p_admission_id: admissionId }
    )

    if (error) throw error

    if (!data || data.length === 0) {
      throw new Error('Failed to create family and child')
    }

    return {
      family_id: data[0].family_id,
      child_id: data[0].child_id
    }
  }

  // =====================================================
  // SECTION & ROOM ASSIGNMENT
  // =====================================================

  /**
   * Assign section to admission
   */
  async assignSection(
    admissionId: string,
    sectionId: string
  ): Promise<Admission> {
    return this.update(admissionId, { section_id: sectionId })
  }

  /**
   * Assign room to admission
   */
  async assignRoom(admissionId: string, roomId: string): Promise<Admission> {
    return this.update(admissionId, { room_id: roomId })
  }

  // =====================================================
  // STATUS MANAGEMENT
  // =====================================================

  /**
   * Complete admission process (create family & child, activate)
   */
  async complete(admissionId: string): Promise<CreatedFamilyAndChild> {
    // Check current status
    const admission = await this.getById(admissionId)

    if (admission.status === 'completed') {
      throw new Error('Admission already completed')
    }

    if (admission.child_id && admission.family_id) {
      // Already has family and child, just update status
      await this.supabase
        .from('admission')
        .update({ status: 'completed' })
        .eq('id', admissionId)

      return {
        family_id: admission.family_id,
        child_id: admission.child_id
      }
    }

    // Create family and child (function also updates status to 'active')
    const result = await this.createFamilyAndChild(admissionId)

    // Mark as completed
    await this.supabase
      .from('admission')
      .update({ status: 'completed' })
      .eq('id', admissionId)

    return result
  }

  /**
   * Activate admission (mark as active)
   */
  async activate(admissionId: string): Promise<Admission> {
    const { data: admission, error } = await this.supabase
      .from('admission')
      .update({ status: 'active' })
      .eq('id', admissionId)
      .select()
      .single()

    if (error) throw error
    return admission
  }

  /**
   * Cancel admission
   */
  async cancel(admissionId: string, reason?: string): Promise<Admission> {
    const { data: admission, error } = await this.supabase
      .from('admission')
      .update({
        status: 'cancelled',
        notes: reason
      })
      .eq('id', admissionId)
      .select()
      .single()

    if (error) throw error
    return admission
  }

  // =====================================================
  // QUERIES
  // =====================================================

  /**
   * Get pending admissions
   */
  async getPending(nurseryId: string): Promise<AdmissionWithDetails[]> {
    const { data, error } = await this.supabase
      .from('admissions_in_progress')
      .select('*')
      .eq('nursery_id', nurseryId)
      .eq('status', 'pending')
      .order('start_date', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * Get active admissions
   */
  async getActive(nurseryId: string): Promise<AdmissionWithDetails[]> {
    const { data, error } = await this.supabase
      .from('admissions_in_progress')
      .select('*')
      .eq('nursery_id', nurseryId)
      .eq('status', 'active')
      .order('start_date', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * Get admissions starting soon (next N days)
   */
  async getStartingSoon(
    nurseryId: string,
    days: number = 7
  ): Promise<AdmissionWithDetails[]> {
    const today = new Date().toISOString().split('T')[0]
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + days)
    const futureDateStr = futureDate.toISOString().split('T')[0]

    const { data, error } = await this.supabase
      .from('admissions_in_progress')
      .select('*')
      .eq('nursery_id', nurseryId)
      .in('status', ['pending', 'active'])
      .gte('start_date', today)
      .lte('start_date', futureDateStr)
      .order('start_date', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * Get admissions in trial period
   */
  async getInTrialPeriod(
    nurseryId: string
  ): Promise<AdmissionWithDetails[]> {
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await this.supabase
      .from('admissions_in_progress')
      .select('*')
      .eq('nursery_id', nurseryId)
      .in('status', ['active', 'completed'])
      .lte('start_date', today)
      .not('trial_period_end', 'is', null)
      .gte('trial_period_end', today)
      .order('trial_period_end', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * Get admissions count by status
   */
  async getCountByStatus(
    nurseryId: string
  ): Promise<Record<string, number>> {
    const { data, error } = await this.supabase
      .from('admission')
      .select('status')
      .eq('nursery_id', nurseryId)

    if (error) throw error

    const counts: Record<string, number> = {
      pending: 0,
      active: 0,
      completed: 0,
      cancelled: 0
    }

    data?.forEach((admission) => {
      counts[admission.status] = (counts[admission.status] || 0) + 1
    })

    return counts
  }
}

// =====================================================
// EXPORT SINGLETON INSTANCE
// =====================================================

export const admissionService = new AdmissionService()
