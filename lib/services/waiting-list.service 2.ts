/**
 * Waiting List Service
 * Gestion de la liste d'attente avec positions et priorités
 */

import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

// =====================================================
// TYPES
// =====================================================

export interface WaitingList {
  id: string
  application_id: string
  nursery_id: string
  position: number
  total_priority_score: number
  added_to_list_date: string
  notified_of_spot_available: boolean
  notified_at?: string
  family_response?: 'accepted' | 'declined' | 'no_response'
  response_deadline?: string
  status: 'active' | 'offered' | 'accepted' | 'declined' | 'expired' | 'removed'
  notes?: string
  created_at: string
  updated_at: string
}

export interface WaitingListWithApplication {
  id: string
  application_id: string
  nursery_id: string
  position: number
  total_priority_score: number
  added_to_list_date: string
  notified_of_spot_available: boolean
  notified_at?: string
  family_response?: string
  response_deadline?: string
  status: string
  notes?: string

  // Application details
  child_first_name: string
  child_last_name: string
  child_birth_date: string
  parent1_first_name: string
  parent1_last_name: string
  parent1_email: string
  parent1_phone: string
  desired_start_date: string
  desired_contract_type?: string

  // Computed fields
  nursery_name: string
  days_on_list: number
  response_overdue: boolean
}

// =====================================================
// SERVICE CLASS
// =====================================================

export class WaitingListService {
  private supabase: SupabaseClient

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || createClient()
  }

  // =====================================================
  // CRUD OPERATIONS
  // =====================================================

  /**
   * Add application to waiting list
   */
  async add(applicationId: string, nurseryId: string): Promise<WaitingList> {
    const { data, error } = await this.supabase.rpc('add_to_waiting_list', {
      p_application_id: applicationId,
      p_nursery_id: nurseryId
    })

    if (error) throw error

    // Fetch the created waiting list entry
    const { data: waitingList, error: fetchError } = await this.supabase
      .from('waiting_list')
      .select('*')
      .eq('id', data)
      .single()

    if (fetchError) throw fetchError
    return waitingList
  }

  /**
   * Get waiting list by nursery
   */
  async getByNursery(nurseryId: string): Promise<WaitingListWithApplication[]> {
    const { data, error } = await this.supabase
      .from('waiting_list_overview')
      .select('*')
      .eq('nursery_id', nurseryId)
      .order('position', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * Get waiting list entry by ID
   */
  async getById(waitingListId: string): Promise<WaitingList> {
    const { data, error } = await this.supabase
      .from('waiting_list')
      .select('*')
      .eq('id', waitingListId)
      .single()

    if (error) throw error
    return data
  }

  /**
   * Get waiting list entry by application ID
   */
  async getByApplicationId(applicationId: string): Promise<WaitingList | null> {
    const { data, error } = await this.supabase
      .from('waiting_list')
      .select('*')
      .eq('application_id', applicationId)
      .maybeSingle()

    if (error) throw error
    return data
  }

  /**
   * Remove from waiting list
   */
  async remove(waitingListId: string, reason?: string): Promise<void> {
    const { error } = await this.supabase
      .from('waiting_list')
      .update({
        status: 'removed',
        notes: reason
      })
      .eq('id', waitingListId)

    if (error) throw error

    // Recalculate positions for the nursery
    const waitingList = await this.getById(waitingListId)
    await this.recalculatePositions(waitingList.nursery_id)
  }

  /**
   * Update waiting list entry
   */
  async update(
    waitingListId: string,
    data: { notes?: string; response_deadline?: string }
  ): Promise<WaitingList> {
    const { data: waitingList, error } = await this.supabase
      .from('waiting_list')
      .update(data)
      .eq('id', waitingListId)
      .select()
      .single()

    if (error) throw error
    return waitingList
  }

  // =====================================================
  // POSITION MANAGEMENT
  // =====================================================

  /**
   * Recalculate all positions for a nursery
   */
  async recalculatePositions(nurseryId: string): Promise<void> {
    const { error } = await this.supabase.rpc(
      'recalculate_waiting_list_positions',
      { p_nursery_id: nurseryId }
    )

    if (error) throw error
  }

  /**
   * Update priority score and recalculate positions
   */
  async updatePriorityScore(
    waitingListId: string,
    newScore: number
  ): Promise<WaitingList> {
    const { data: waitingList, error } = await this.supabase
      .from('waiting_list')
      .update({ total_priority_score: newScore })
      .eq('id', waitingListId)
      .select()
      .single()

    if (error) throw error

    // Positions are recalculated automatically by trigger
    return waitingList
  }

  // =====================================================
  // NOTIFICATION OPERATIONS
  // =====================================================

  /**
   * Get next applicant in line (not yet notified)
   */
  async getNextInLine(nurseryId: string): Promise<WaitingList | null> {
    const { data, error } = await this.supabase.rpc(
      'get_next_in_waiting_list',
      { p_nursery_id: nurseryId }
    )

    if (error) throw error

    if (!data) return null

    const { data: waitingList, error: fetchError } = await this.supabase
      .from('waiting_list')
      .select('*')
      .eq('id', data)
      .single()

    if (fetchError) throw fetchError
    return waitingList
  }

  /**
   * Notify next applicant that a spot is available
   */
  async notifyNextInLine(
    nurseryId: string,
    responseDeadlineDays: number = 7
  ): Promise<WaitingList | null> {
    const { data, error } = await this.supabase.rpc('notify_next_applicant', {
      p_nursery_id: nurseryId,
      p_response_deadline_days: responseDeadlineDays
    })

    if (error) throw error

    if (!data) return null

    const { data: waitingList, error: fetchError } = await this.supabase
      .from('waiting_list')
      .select('*')
      .eq('id', data)
      .single()

    if (fetchError) throw fetchError
    return waitingList
  }

  /**
   * Record family response to spot offer
   */
  async recordResponse(
    waitingListId: string,
    response: 'accepted' | 'declined'
  ): Promise<WaitingList> {
    const status = response === 'accepted' ? 'accepted' : 'declined'

    const { data: waitingList, error } = await this.supabase
      .from('waiting_list')
      .update({
        family_response: response,
        status: status
      })
      .eq('id', waitingListId)
      .select()
      .single()

    if (error) throw error
    return waitingList
  }

  // =====================================================
  // QUERIES
  // =====================================================

  /**
   * Get active waiting list entries (not offered yet)
   */
  async getActive(nurseryId: string): Promise<WaitingListWithApplication[]> {
    const { data, error } = await this.supabase
      .from('waiting_list_overview')
      .select('*')
      .eq('nursery_id', nurseryId)
      .eq('status', 'active')
      .order('position', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * Get offered spots (waiting for family response)
   */
  async getOffered(nurseryId: string): Promise<WaitingListWithApplication[]> {
    const { data, error } = await this.supabase
      .from('waiting_list_overview')
      .select('*')
      .eq('nursery_id', nurseryId)
      .eq('status', 'offered')
      .order('notified_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Get overdue responses
   */
  async getOverdueResponses(
    nurseryId: string
  ): Promise<WaitingListWithApplication[]> {
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await this.supabase
      .from('waiting_list_overview')
      .select('*')
      .eq('nursery_id', nurseryId)
      .eq('status', 'offered')
      .not('response_deadline', 'is', null)
      .lt('response_deadline', today)
      .order('response_deadline', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * Get count of active entries
   */
  async getCount(nurseryId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('waiting_list')
      .select('*', { count: 'exact', head: true })
      .eq('nursery_id', nurseryId)
      .eq('status', 'active')

    if (error) throw error
    return count || 0
  }

  /**
   * Get position for application
   */
  async getPosition(applicationId: string): Promise<number | null> {
    const { data, error } = await this.supabase
      .from('waiting_list')
      .select('position')
      .eq('application_id', applicationId)
      .eq('status', 'active')
      .maybeSingle()

    if (error) throw error
    return data?.position || null
  }
}

// =====================================================
// EXPORT SINGLETON INSTANCE
// =====================================================

export const waitingListService = new WaitingListService()
