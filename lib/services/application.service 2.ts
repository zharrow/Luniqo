/**
 * Application Service
 * Gestion des demandes de pré-inscription à la crèche
 */

import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

// =====================================================
// TYPES
// =====================================================

export interface Application {
  id: string
  nursery_id: string

  // Child info (temporary)
  child_first_name: string
  child_last_name: string
  child_birth_date: string
  child_gender?: string

  // Parent 1 info
  parent1_first_name: string
  parent1_last_name: string
  parent1_email: string
  parent1_phone: string

  // Parent 2 info (optional)
  parent2_first_name?: string
  parent2_last_name?: string
  parent2_email?: string
  parent2_phone?: string

  // Address
  address?: string
  postal_code?: string
  city?: string

  // Request details
  desired_start_date: string
  desired_contract_type?: string
  desired_schedule?: string

  // Motivation
  motivation_letter?: string
  special_needs?: string

  // Status
  status: 'received' | 'under_review' | 'accepted' | 'rejected' | 'waiting_list' | 'cancelled'
  application_date: string

  reviewed_by_id?: string
  reviewed_at?: string
  rejection_reason?: string

  documents_urls?: string[]
  notes?: string

  created_at: string
  updated_at: string
}

export interface ApplicationPriority {
  id: string
  application_id: string
  priority_type: string
  priority_score: number
  evidence_document_url?: string
  verified: boolean
  verified_by_id?: string
  verified_at?: string
  notes?: string
  created_at: string
}

export interface CreateApplicationInput {
  nursery_id: string
  child_first_name: string
  child_last_name: string
  child_birth_date: string
  child_gender?: string
  parent1_first_name: string
  parent1_last_name: string
  parent1_email: string
  parent1_phone: string
  parent2_first_name?: string
  parent2_last_name?: string
  parent2_email?: string
  parent2_phone?: string
  address?: string
  postal_code?: string
  city?: string
  desired_start_date: string
  desired_contract_type?: string
  desired_schedule?: string
  motivation_letter?: string
  special_needs?: string
  notes?: string
}

export interface UpdateApplicationInput {
  child_first_name?: string
  child_last_name?: string
  child_birth_date?: string
  child_gender?: string
  parent1_first_name?: string
  parent1_last_name?: string
  parent1_email?: string
  parent1_phone?: string
  parent2_first_name?: string
  parent2_last_name?: string
  parent2_email?: string
  parent2_phone?: string
  address?: string
  postal_code?: string
  city?: string
  desired_start_date?: string
  desired_contract_type?: string
  desired_schedule?: string
  motivation_letter?: string
  special_needs?: string
  notes?: string
}

export interface ApplicationFilters {
  status?: string[]
  start_date_from?: string
  start_date_to?: string
  search?: string
}

export interface CreatePriorityInput {
  priority_type: string
  priority_score: number
  evidence_document_url?: string
  notes?: string
}

export interface ApplicationsSummary {
  total_applications: number
  received: number
  under_review: number
  waiting_list: number
  accepted: number
  rejected: number
}

// =====================================================
// SERVICE CLASS
// =====================================================

export class ApplicationService {
  private supabase: SupabaseClient

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || createClient()
  }

  // =====================================================
  // CRUD OPERATIONS
  // =====================================================

  /**
   * Create new application
   */
  async create(data: CreateApplicationInput): Promise<Application> {
    const { data: application, error } = await this.supabase
      .from('application')
      .insert({
        ...data,
        status: 'received',
        application_date: new Date().toISOString().split('T')[0]
      })
      .select()
      .single()

    if (error) throw error
    return application
  }

  /**
   * Get application by ID
   */
  async getById(applicationId: string): Promise<Application> {
    const { data, error } = await this.supabase
      .from('application')
      .select('*')
      .eq('id', applicationId)
      .single()

    if (error) throw error
    return data
  }

  /**
   * Get all applications for a nursery
   */
  async getByNursery(
    nurseryId: string,
    filters?: ApplicationFilters
  ): Promise<Application[]> {
    let query = this.supabase
      .from('application')
      .select('*')
      .eq('nursery_id', nurseryId)
      .order('application_date', { ascending: false })

    // Apply filters
    if (filters?.status && filters.status.length > 0) {
      query = query.in('status', filters.status)
    }

    if (filters?.start_date_from) {
      query = query.gte('desired_start_date', filters.start_date_from)
    }

    if (filters?.start_date_to) {
      query = query.lte('desired_start_date', filters.start_date_to)
    }

    if (filters?.search) {
      query = query.or(
        `child_first_name.ilike.%${filters.search}%,` +
        `child_last_name.ilike.%${filters.search}%,` +
        `parent1_first_name.ilike.%${filters.search}%,` +
        `parent1_last_name.ilike.%${filters.search}%,` +
        `parent1_email.ilike.%${filters.search}%`
      )
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  /**
   * Update application
   */
  async update(
    applicationId: string,
    data: UpdateApplicationInput
  ): Promise<Application> {
    const { data: application, error } = await this.supabase
      .from('application')
      .update(data)
      .eq('id', applicationId)
      .select()
      .single()

    if (error) throw error
    return application
  }

  /**
   * Delete application
   */
  async delete(applicationId: string): Promise<void> {
    const { error } = await this.supabase
      .from('application')
      .delete()
      .eq('id', applicationId)

    if (error) throw error
  }

  // =====================================================
  // REVIEW OPERATIONS
  // =====================================================

  /**
   * Review application (accept, reject, or add to waiting list)
   */
  async review(
    applicationId: string,
    decision: 'accept' | 'reject' | 'waiting_list',
    reviewedById: string,
    rejectionReason?: string
  ): Promise<Application> {
    const statusMap = {
      accept: 'accepted',
      reject: 'rejected',
      waiting_list: 'waiting_list'
    }

    const { data: application, error } = await this.supabase
      .from('application')
      .update({
        status: statusMap[decision],
        reviewed_by_id: reviewedById,
        reviewed_at: new Date().toISOString(),
        rejection_reason: decision === 'reject' ? rejectionReason : null
      })
      .eq('id', applicationId)
      .select()
      .single()

    if (error) throw error
    return application
  }

  /**
   * Set application status to under review
   */
  async markUnderReview(applicationId: string): Promise<Application> {
    const { data: application, error } = await this.supabase
      .from('application')
      .update({ status: 'under_review' })
      .eq('id', applicationId)
      .select()
      .single()

    if (error) throw error
    return application
  }

  /**
   * Cancel application
   */
  async cancel(applicationId: string): Promise<Application> {
    const { data: application, error } = await this.supabase
      .from('application')
      .update({ status: 'cancelled' })
      .eq('id', applicationId)
      .select()
      .single()

    if (error) throw error
    return application
  }

  // =====================================================
  // PRIORITY OPERATIONS
  // =====================================================

  /**
   * Add priority to application
   */
  async addPriority(
    applicationId: string,
    data: CreatePriorityInput
  ): Promise<ApplicationPriority> {
    const { data: priority, error } = await this.supabase
      .from('application_priority')
      .insert({
        application_id: applicationId,
        ...data,
        verified: false
      })
      .select()
      .single()

    if (error) throw error
    return priority
  }

  /**
   * Get priorities for application
   */
  async getPriorities(applicationId: string): Promise<ApplicationPriority[]> {
    const { data, error } = await this.supabase
      .from('application_priority')
      .select('*')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Verify priority
   */
  async verifyPriority(
    priorityId: string,
    verifiedById: string
  ): Promise<ApplicationPriority> {
    const { data: priority, error } = await this.supabase
      .from('application_priority')
      .update({
        verified: true,
        verified_by_id: verifiedById,
        verified_at: new Date().toISOString()
      })
      .eq('id', priorityId)
      .select()
      .single()

    if (error) throw error
    return priority
  }

  /**
   * Delete priority
   */
  async deletePriority(priorityId: string): Promise<void> {
    const { error } = await this.supabase
      .from('application_priority')
      .delete()
      .eq('id', priorityId)

    if (error) throw error
  }

  /**
   * Calculate total priority score for application
   */
  async calculateTotalPriority(applicationId: string): Promise<number> {
    const { data, error } = await this.supabase.rpc(
      'calculate_application_priority_score',
      { p_application_id: applicationId }
    )

    if (error) throw error
    return data || 0
  }

  // =====================================================
  // STATISTICS
  // =====================================================

  /**
   * Get applications summary for nursery
   */
  async getSummary(nurseryId: string): Promise<ApplicationsSummary> {
    const { data, error } = await this.supabase.rpc(
      'get_applications_summary',
      { p_nursery_id: nurseryId }
    )

    if (error) throw error

    return data?.[0] || {
      total_applications: 0,
      received: 0,
      under_review: 0,
      waiting_list: 0,
      accepted: 0,
      rejected: 0
    }
  }

  /**
   * Check if sibling is already enrolled
   */
  async checkSiblingEnrolled(
    nurseryId: string,
    parentEmail: string
  ): Promise<boolean> {
    const { data, error } = await this.supabase.rpc(
      'check_sibling_enrolled',
      {
        p_nursery_id: nurseryId,
        p_parent_email: parentEmail
      }
    )

    if (error) throw error
    return data || false
  }

  /**
   * Get pending applications (received or under review)
   */
  async getPending(nurseryId: string): Promise<Application[]> {
    return this.getByNursery(nurseryId, {
      status: ['received', 'under_review']
    })
  }

  /**
   * Get applications by status
   */
  async getByStatus(
    nurseryId: string,
    status: Application['status']
  ): Promise<Application[]> {
    const { data, error } = await this.supabase
      .from('application')
      .select('*')
      .eq('nursery_id', nurseryId)
      .eq('status', status)
      .order('application_date', { ascending: false })

    if (error) throw error
    return data || []
  }
}

// =====================================================
// EXPORT SINGLETON INSTANCE
// =====================================================

export const applicationService = new ApplicationService()
