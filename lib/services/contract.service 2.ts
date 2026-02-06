/**
 * Contract Service
 * Gestion des contrats d'accueil, horaires contractuels et avenants
 */

import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

// =====================================================
// TYPES
// =====================================================

export interface Contract {
  id: string
  nursery_id: string
  family_id: string
  child_id: string
  contract_number: string
  contract_type: 'regular' | 'occasional' | 'emergency' | 'short_term'
  start_date: string
  end_date?: string
  weekly_hours?: number
  rate_type: 'psu' | 'paje' | 'private' | 'company_sponsored'
  hourly_rate?: number
  monthly_rate?: number
  billing_frequency: 'monthly' | 'quarterly' | 'annual'
  billing_day_of_month: number
  signed_by_guardian_id?: string
  guardian_signature_date?: string
  guardian_signature_url?: string
  signed_by_director_id?: string
  director_signature_date?: string
  director_signature_url?: string
  contract_document_url?: string
  status: 'draft' | 'pending_signature' | 'active' | 'suspended' | 'terminated'
  termination_date?: string
  termination_reason?: string
  termination_notice_date?: string
  notes?: string
  created_at: string
  updated_at: string
  created_by_id?: string
}

export interface ContractSchedule {
  id: string
  contract_id: string
  day_of_week: number
  is_present: boolean
  arrival_time?: string
  departure_time?: string
  daily_hours?: number
  notes?: string
  created_at: string
  updated_at: string
}

export interface ContractAmendment {
  id: string
  contract_id: string
  amendment_number: number
  amendment_type: 'schedule_change' | 'rate_change' | 'hours_change' | 'suspension' | 'reactivation'
  effective_date: string
  changes_description: string
  new_weekly_hours?: number
  new_schedule?: Record<string, any>
  new_hourly_rate?: number
  new_monthly_rate?: number
  signed_by_guardian_id?: string
  guardian_signature_date?: string
  guardian_signature_url?: string
  signed_by_director_id?: string
  director_signature_date?: string
  director_signature_url?: string
  amendment_document_url?: string
  status: 'draft' | 'pending_signature' | 'active' | 'cancelled'
  notes?: string
  created_at: string
  updated_at: string
  created_by_id?: string
}

export interface CreateContractInput {
  nursery_id: string
  family_id: string
  child_id: string
  contract_type: Contract['contract_type']
  start_date: string
  end_date?: string
  rate_type: Contract['rate_type']
  hourly_rate?: number
  monthly_rate?: number
  billing_frequency?: Contract['billing_frequency']
  billing_day_of_month?: number
  notes?: string
  created_by_id: string
}

export interface UpdateContractInput {
  contract_type?: Contract['contract_type']
  start_date?: string
  end_date?: string
  rate_type?: Contract['rate_type']
  hourly_rate?: number
  monthly_rate?: number
  billing_frequency?: Contract['billing_frequency']
  billing_day_of_month?: number
  notes?: string
}

export interface CreateScheduleInput {
  day_of_week: number
  is_present: boolean
  arrival_time?: string
  departure_time?: string
  notes?: string
}

export interface CreateAmendmentInput {
  amendment_type: ContractAmendment['amendment_type']
  effective_date: string
  changes_description: string
  new_weekly_hours?: number
  new_schedule?: Record<string, any>
  new_hourly_rate?: number
  new_monthly_rate?: number
  notes?: string
  created_by_id: string
}

export interface ContractWithDetails extends Contract {
  family_name: string
  child_first_name: string
  child_last_name: string
  child_birth_date: string
  child_age_years: number
  guardian_first_name?: string
  guardian_last_name?: string
  guardian_email?: string
  guardian_phone?: string
  nursery_name: string
  expiring_soon: boolean
  days_until_end?: number
}

// =====================================================
// SERVICE CLASS
// =====================================================

export class ContractService {
  private supabase: SupabaseClient

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || createClient()
  }

  // =====================================================
  // CONTRACT CRUD
  // =====================================================

  /**
   * Create new contract
   */
  async create(data: CreateContractInput): Promise<Contract> {
    // Generate contract number
    const { data: contractNumber, error: numberError } = await this.supabase.rpc(
      'generate_contract_number',
      { p_nursery_id: data.nursery_id }
    )

    if (numberError) throw numberError

    const { data: contract, error } = await this.supabase
      .from('contract')
      .insert({
        ...data,
        contract_number: contractNumber,
        status: 'draft'
      })
      .select()
      .single()

    if (error) throw error
    return contract
  }

  /**
   * Get contract by ID
   */
  async getById(contractId: string): Promise<Contract> {
    const { data, error } = await this.supabase
      .from('contract')
      .select('*')
      .eq('id', contractId)
      .single()

    if (error) throw error
    return data
  }

  /**
   * Get contract with details
   */
  async getByIdWithDetails(contractId: string): Promise<ContractWithDetails> {
    const { data, error } = await this.supabase
      .from('active_contracts_overview')
      .select('*')
      .eq('id', contractId)
      .single()

    if (error) throw error
    return data
  }

  /**
   * Get contracts by family
   */
  async getByFamily(familyId: string): Promise<Contract[]> {
    const { data, error } = await this.supabase
      .from('contract')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Get contracts by child
   */
  async getByChild(childId: string): Promise<Contract[]> {
    const { data, error } = await this.supabase
      .from('contract')
      .select('*')
      .eq('child_id', childId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Get active contracts for nursery
   */
  async getActiveContracts(nurseryId: string): Promise<ContractWithDetails[]> {
    const { data, error } = await this.supabase
      .from('active_contracts_overview')
      .select('*')
      .eq('nursery_id', nurseryId)
      .order('start_date', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Get contracts by nursery (all statuses)
   */
  async getByNursery(nurseryId: string, status?: Contract['status'][]): Promise<Contract[]> {
    let query = this.supabase
      .from('contract')
      .select('*')
      .eq('nursery_id', nurseryId)
      .order('created_at', { ascending: false })

    if (status && status.length > 0) {
      query = query.in('status', status)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  /**
   * Update contract
   */
  async update(contractId: string, data: UpdateContractInput): Promise<Contract> {
    const { data: contract, error } = await this.supabase
      .from('contract')
      .update(data)
      .eq('id', contractId)
      .select()
      .single()

    if (error) throw error
    return contract
  }

  /**
   * Delete contract
   */
  async delete(contractId: string): Promise<void> {
    const { error } = await this.supabase
      .from('contract')
      .delete()
      .eq('id', contractId)

    if (error) throw error
  }

  // =====================================================
  // CONTRACT SCHEDULE
  // =====================================================

  /**
   * Set schedule for contract (replaces existing)
   */
  async setSchedule(
    contractId: string,
    schedules: CreateScheduleInput[]
  ): Promise<ContractSchedule[]> {
    // Delete existing schedules
    await this.supabase
      .from('contract_schedule')
      .delete()
      .eq('contract_id', contractId)

    // Insert new schedules
    const { data, error } = await this.supabase
      .from('contract_schedule')
      .insert(
        schedules.map((schedule) => ({
          contract_id: contractId,
          ...schedule
        }))
      )
      .select()

    if (error) throw error
    return data || []
  }

  /**
   * Get schedule for contract
   */
  async getSchedule(contractId: string): Promise<ContractSchedule[]> {
    const { data, error } = await this.supabase
      .from('contract_schedule')
      .select('*')
      .eq('contract_id', contractId)
      .order('day_of_week', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * Update single schedule entry
   */
  async updateScheduleEntry(
    scheduleId: string,
    data: Partial<CreateScheduleInput>
  ): Promise<ContractSchedule> {
    const { data: schedule, error } = await this.supabase
      .from('contract_schedule')
      .update(data)
      .eq('id', scheduleId)
      .select()
      .single()

    if (error) throw error
    return schedule
  }

  // =====================================================
  // SIGNATURES
  // =====================================================

  /**
   * Sign by guardian
   */
  async signByGuardian(
    contractId: string,
    guardianId: string,
    signatureUrl: string
  ): Promise<Contract> {
    const { data: contract, error } = await this.supabase
      .from('contract')
      .update({
        signed_by_guardian_id: guardianId,
        guardian_signature_date: new Date().toISOString().split('T')[0],
        guardian_signature_url: signatureUrl
      })
      .eq('id', contractId)
      .select()
      .single()

    if (error) throw error

    // Try to activate if both signatures present
    await this.tryActivate(contractId)

    return contract
  }

  /**
   * Sign by director
   */
  async signByDirector(
    contractId: string,
    directorId: string,
    signatureUrl: string
  ): Promise<Contract> {
    const { data: contract, error } = await this.supabase
      .from('contract')
      .update({
        signed_by_director_id: directorId,
        director_signature_date: new Date().toISOString().split('T')[0],
        director_signature_url: signatureUrl
      })
      .eq('id', contractId)
      .select()
      .single()

    if (error) throw error

    // Try to activate if both signatures present
    await this.tryActivate(contractId)

    return contract
  }

  /**
   * Try to activate contract if both signatures present
   */
  private async tryActivate(contractId: string): Promise<void> {
    const { data, error } = await this.supabase.rpc('activate_contract', {
      p_contract_id: contractId
    })

    // Ignore error if contract not ready to activate
    if (error && !error.message.includes('not ready')) {
      throw error
    }
  }

  /**
   * Manually activate contract
   */
  async activate(contractId: string): Promise<Contract> {
    const { data: contract, error } = await this.supabase
      .from('contract')
      .update({ status: 'active' })
      .eq('id', contractId)
      .select()
      .single()

    if (error) throw error
    return contract
  }

  // =====================================================
  // CONTRACT STATUS
  // =====================================================

  /**
   * Terminate contract
   */
  async terminate(
    contractId: string,
    reason: string,
    terminationDate?: string,
    noticeDate?: string
  ): Promise<Contract> {
    const { error } = await this.supabase.rpc('terminate_contract', {
      p_contract_id: contractId,
      p_termination_reason: reason,
      p_termination_date: terminationDate || new Date().toISOString().split('T')[0],
      p_notice_date: noticeDate
    })

    if (error) throw error

    return this.getById(contractId)
  }

  /**
   * Suspend contract
   */
  async suspend(contractId: string, reason?: string): Promise<Contract> {
    const { data: contract, error } = await this.supabase
      .from('contract')
      .update({
        status: 'suspended',
        notes: reason
      })
      .eq('id', contractId)
      .select()
      .single()

    if (error) throw error
    return contract
  }

  /**
   * Reactivate suspended contract
   */
  async reactivate(contractId: string): Promise<Contract> {
    const { data: contract, error } = await this.supabase
      .from('contract')
      .update({ status: 'active' })
      .eq('id', contractId)
      .select()
      .single()

    if (error) throw error
    return contract
  }

  // =====================================================
  // AMENDMENTS
  // =====================================================

  /**
   * Create amendment
   */
  async createAmendment(
    contractId: string,
    data: CreateAmendmentInput
  ): Promise<ContractAmendment> {
    const { data: amendment, error } = await this.supabase
      .from('contract_amendment')
      .insert({
        contract_id: contractId,
        ...data,
        status: 'draft'
      })
      .select()
      .single()

    if (error) throw error
    return amendment
  }

  /**
   * Get amendments for contract
   */
  async getAmendments(contractId: string): Promise<ContractAmendment[]> {
    const { data, error } = await this.supabase
      .from('contract_amendment')
      .select('*')
      .eq('contract_id', contractId)
      .order('amendment_number', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Get amendment by ID
   */
  async getAmendmentById(amendmentId: string): Promise<ContractAmendment> {
    const { data, error } = await this.supabase
      .from('contract_amendment')
      .select('*')
      .eq('id', amendmentId)
      .single()

    if (error) throw error
    return data
  }

  /**
   * Activate amendment
   */
  async activateAmendment(amendmentId: string): Promise<ContractAmendment> {
    const { data: amendment, error } = await this.supabase
      .from('contract_amendment')
      .update({ status: 'active' })
      .eq('id', amendmentId)
      .select()
      .single()

    if (error) throw error
    return amendment
  }

  // =====================================================
  // QUERIES
  // =====================================================

  /**
   * Get expiring contracts
   */
  async getExpiring(nurseryId: string, days: number = 30): Promise<ContractWithDetails[]> {
    const today = new Date()
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + days)

    const { data, error } = await this.supabase
      .from('active_contracts_overview')
      .select('*')
      .eq('nursery_id', nurseryId)
      .not('end_date', 'is', null)
      .gte('end_date', today.toISOString().split('T')[0])
      .lte('end_date', futureDate.toISOString().split('T')[0])
      .order('end_date', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * Get contracts summary
   */
  async getSummary(nurseryId: string): Promise<Record<string, number>> {
    const { data, error } = await this.supabase.rpc('get_contracts_summary', {
      p_nursery_id: nurseryId
    })

    if (error) throw error

    return data?.[0] || {
      total_contracts: 0,
      draft: 0,
      pending_signature: 0,
      active: 0,
      suspended: 0,
      terminated: 0,
      expiring_soon: 0
    }
  }
}

// =====================================================
// EXPORT SINGLETON INSTANCE
// =====================================================

export const contractService = new ContractService()
