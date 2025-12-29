/**
 * Rate Grid Service
 * Gestion des grilles tarifaires et tranches de revenus (PSU, PAJE, privé)
 */

import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

// =====================================================
// TYPES
// =====================================================

export interface RateGrid {
  id: string
  nursery_id: string
  grid_name: string
  grid_type: 'psu' | 'paje' | 'private' | 'company'
  valid_from: string
  valid_until?: string
  psu_base_rate?: number
  psu_caf_participation_rate?: number
  paje_hourly_ceiling?: number
  is_active: boolean
  is_default: boolean
  notes?: string
  created_at: string
  updated_at: string
  created_by_id?: string
}

export interface RateIncomeBracket {
  id: string
  rate_grid_id: string
  bracket_name?: string
  income_min: number
  income_max?: number
  hourly_rate: number
  psu_coefficient?: number
  display_order: number
  created_at: string
  updated_at: string
}

export interface RateGridWithBrackets extends RateGrid {
  nursery_name: string
  bracket_count: number
  min_income: number
  max_income?: number
  min_hourly_rate: number
  max_hourly_rate: number
  brackets: RateIncomeBracket[]
}

export interface CreateRateGridInput {
  nursery_id: string
  grid_name: string
  grid_type: RateGrid['grid_type']
  valid_from: string
  valid_until?: string
  psu_base_rate?: number
  psu_caf_participation_rate?: number
  paje_hourly_ceiling?: number
  is_default?: boolean
  notes?: string
  created_by_id: string
}

export interface UpdateRateGridInput {
  grid_name?: string
  valid_from?: string
  valid_until?: string
  psu_base_rate?: number
  psu_caf_participation_rate?: number
  paje_hourly_ceiling?: number
  is_active?: boolean
  is_default?: boolean
  notes?: string
}

export interface CreateIncomeBracketInput {
  bracket_name?: string
  income_min: number
  income_max?: number
  hourly_rate: number
  psu_coefficient?: number
  display_order?: number
}

export interface PSURateCalculation {
  total_rate: number
  caf_portion: number
  family_portion: number
}

// =====================================================
// SERVICE CLASS
// =====================================================

export class RateGridService {
  private supabase: SupabaseClient

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || createClient()
  }

  // =====================================================
  // RATE GRID CRUD
  // =====================================================

  /**
   * Create new rate grid
   */
  async create(data: CreateRateGridInput): Promise<RateGrid> {
    const { data: rateGrid, error } = await this.supabase
      .from('rate_grid')
      .insert({
        ...data,
        is_active: true,
        is_default: data.is_default || false
      })
      .select()
      .single()

    if (error) throw error
    return rateGrid
  }

  /**
   * Get rate grid by ID
   */
  async getById(rateGridId: string): Promise<RateGrid> {
    const { data, error } = await this.supabase
      .from('rate_grid')
      .select('*')
      .eq('id', rateGridId)
      .single()

    if (error) throw error
    return data
  }

  /**
   * Get rate grid with brackets
   */
  async getByIdWithBrackets(rateGridId: string): Promise<RateGridWithBrackets> {
    const { data, error } = await this.supabase
      .from('rate_grids_with_brackets')
      .select('*')
      .eq('id', rateGridId)
      .single()

    if (error) throw error
    return data
  }

  /**
   * Get all rate grids for nursery
   */
  async getByNursery(
    nurseryId: string,
    activeOnly: boolean = false
  ): Promise<RateGrid[]> {
    let query = this.supabase
      .from('rate_grid')
      .select('*')
      .eq('nursery_id', nurseryId)
      .order('created_at', { ascending: false })

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  /**
   * Get active rate grid for a specific type
   */
  async getActiveGrid(
    nurseryId: string,
    gridType: RateGrid['grid_type'],
    date?: string
  ): Promise<RateGrid> {
    const { data: gridId, error } = await this.supabase.rpc(
      'get_active_rate_grid',
      {
        p_nursery_id: nurseryId,
        p_grid_type: gridType,
        p_date: date || new Date().toISOString().split('T')[0]
      }
    )

    if (error) throw error

    return this.getById(gridId)
  }

  /**
   * Update rate grid
   */
  async update(rateGridId: string, data: UpdateRateGridInput): Promise<RateGrid> {
    const { data: rateGrid, error } = await this.supabase
      .from('rate_grid')
      .update(data)
      .eq('id', rateGridId)
      .select()
      .single()

    if (error) throw error
    return rateGrid
  }

  /**
   * Delete rate grid
   */
  async delete(rateGridId: string): Promise<void> {
    const { error } = await this.supabase
      .from('rate_grid')
      .delete()
      .eq('id', rateGridId)

    if (error) throw error
  }

  /**
   * Set as default grid
   */
  async setDefault(rateGridId: string): Promise<RateGrid> {
    return this.update(rateGridId, { is_default: true })
  }

  /**
   * Activate/deactivate grid
   */
  async setActive(rateGridId: string, isActive: boolean): Promise<RateGrid> {
    return this.update(rateGridId, { is_active: isActive })
  }

  // =====================================================
  // INCOME BRACKETS
  // =====================================================

  /**
   * Add income bracket to rate grid
   */
  async addIncomeBracket(
    rateGridId: string,
    data: CreateIncomeBracketInput
  ): Promise<RateIncomeBracket> {
    const { data: bracket, error } = await this.supabase
      .from('rate_income_bracket')
      .insert({
        rate_grid_id: rateGridId,
        ...data,
        display_order: data.display_order || 0
      })
      .select()
      .single()

    if (error) throw error
    return bracket
  }

  /**
   * Get income brackets for rate grid
   */
  async getIncomeBrackets(rateGridId: string): Promise<RateIncomeBracket[]> {
    const { data, error } = await this.supabase
      .from('rate_income_bracket')
      .select('*')
      .eq('rate_grid_id', rateGridId)
      .order('display_order', { ascending: true })
      .order('income_min', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * Update income bracket
   */
  async updateIncomeBracket(
    bracketId: string,
    data: Partial<CreateIncomeBracketInput>
  ): Promise<RateIncomeBracket> {
    const { data: bracket, error } = await this.supabase
      .from('rate_income_bracket')
      .update(data)
      .eq('id', bracketId)
      .select()
      .single()

    if (error) throw error
    return bracket
  }

  /**
   * Delete income bracket
   */
  async deleteIncomeBracket(bracketId: string): Promise<void> {
    const { error } = await this.supabase
      .from('rate_income_bracket')
      .delete()
      .eq('id', bracketId)

    if (error) throw error
  }

  // =====================================================
  // RATE CALCULATIONS
  // =====================================================

  /**
   * Find hourly rate for a given annual income
   */
  async calculateRateForIncome(
    rateGridId: string,
    annualIncome: number
  ): Promise<number> {
    const { data, error } = await this.supabase.rpc('find_rate_for_income', {
      p_rate_grid_id: rateGridId,
      p_annual_income: annualIncome
    })

    if (error) throw error
    return data
  }

  /**
   * Calculate PSU rate with CAF participation
   */
  async calculatePSURate(
    baseRate: number,
    cafParticipationRate: number,
    coefficient: number = 1.0
  ): Promise<PSURateCalculation> {
    const { data, error } = await this.supabase.rpc(
      'calculate_psu_rate_with_caf',
      {
        p_base_rate: baseRate,
        p_caf_participation_rate: cafParticipationRate,
        p_coefficient: coefficient
      }
    )

    if (error) throw error

    return data?.[0] || { total_rate: 0, caf_portion: 0, family_portion: 0 }
  }

  /**
   * Calculate monthly cost from hourly rate
   */
  calculateMonthlyCost(
    hourlyRate: number,
    weeklyHours: number,
    weeksPerMonth: number = 4.33
  ): number {
    return Math.round(hourlyRate * weeklyHours * weeksPerMonth * 100) / 100
  }

  /**
   * Get applicable rate for family
   */
  async getApplicableRate(
    nurseryId: string,
    rateType: RateGrid['grid_type'],
    familyAnnualIncome: number
  ): Promise<{
    rateGrid: RateGrid
    hourlyRate: number
    bracket?: RateIncomeBracket
  }> {
    // Get active grid
    const rateGrid = await this.getActiveGrid(nurseryId, rateType)

    // Find applicable rate
    const hourlyRate = await this.calculateRateForIncome(
      rateGrid.id,
      familyAnnualIncome
    )

    // Find the bracket that was used
    const brackets = await this.getIncomeBrackets(rateGrid.id)
    const bracket = brackets.find(
      (b) =>
        familyAnnualIncome >= b.income_min &&
        (b.income_max === null || familyAnnualIncome <= b.income_max)
    )

    return {
      rateGrid,
      hourlyRate,
      bracket
    }
  }

  // =====================================================
  // QUERIES
  // =====================================================

  /**
   * Get rate grids by type
   */
  async getByType(
    nurseryId: string,
    gridType: RateGrid['grid_type']
  ): Promise<RateGrid[]> {
    const { data, error } = await this.supabase
      .from('rate_grid')
      .select('*')
      .eq('nursery_id', nurseryId)
      .eq('grid_type', gridType)
      .order('valid_from', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Get default grids for all types
   */
  async getDefaultGrids(nurseryId: string): Promise<RateGrid[]> {
    const { data, error } = await this.supabase
      .from('rate_grid')
      .select('*')
      .eq('nursery_id', nurseryId)
      .eq('is_default', true)
      .eq('is_active', true)

    if (error) throw error
    return data || []
  }

  /**
   * Check if rate grid has any contracts using it
   */
  async hasActiveContracts(rateGridId: string): Promise<boolean> {
    const { count, error } = await this.supabase
      .from('contract')
      .select('*', { count: 'exact', head: true })
      .eq('rate_grid_id', rateGridId)
      .eq('status', 'active')

    if (error) throw error
    return (count || 0) > 0
  }

  /**
   * Duplicate rate grid (for new year/period)
   */
  async duplicate(
    rateGridId: string,
    newGridName: string,
    newValidFrom: string,
    createdById: string
  ): Promise<RateGrid> {
    // Get original grid with brackets
    const original = await this.getByIdWithBrackets(rateGridId)

    // Create new grid
    const newGrid = await this.create({
      nursery_id: original.nursery_id,
      grid_name: newGridName,
      grid_type: original.grid_type,
      valid_from: newValidFrom,
      psu_base_rate: original.psu_base_rate,
      psu_caf_participation_rate: original.psu_caf_participation_rate,
      paje_hourly_ceiling: original.paje_hourly_ceiling,
      is_default: false,
      notes: `Duplicated from ${original.grid_name}`,
      created_by_id: createdById
    })

    // Copy brackets
    const bracketPromises = original.brackets.map((bracket) =>
      this.addIncomeBracket(newGrid.id, {
        bracket_name: bracket.bracket_name,
        income_min: bracket.income_min,
        income_max: bracket.income_max,
        hourly_rate: bracket.hourly_rate,
        psu_coefficient: bracket.psu_coefficient,
        display_order: bracket.display_order
      })
    )

    await Promise.all(bracketPromises)

    return newGrid
  }
}

// =====================================================
// EXPORT SINGLETON INSTANCE
// =====================================================

export const rateGridService = new RateGridService()
