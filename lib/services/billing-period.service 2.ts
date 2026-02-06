/**
 * Billing Period Service
 * Gestion des périodes de facturation mensuelles
 */

import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

// =====================================================
// TYPES
// =====================================================

export interface BillingPeriod {
  id: string
  nursery_id: string

  // Période
  period_start: string // Ex: 2026-01-01
  period_end: string // Ex: 2026-01-31
  period_name: string // Ex: "Janvier 2026"

  // Dates clés
  invoice_generation_date?: string
  invoice_sent_date?: string
  period_closed_date?: string
  finalized_date?: string

  // Status
  status: 'open' | 'closed' | 'invoiced' | 'finalized'

  // Statistiques
  total_invoices?: number
  total_amount?: number
  total_paid?: number
  total_outstanding?: number

  // Metadata
  created_at: string
  updated_at: string
  created_by_id?: string
  closed_by_id?: string
}

export interface CreateBillingPeriodInput {
  nursery_id: string
  period_start: string
  period_end: string
  created_by_id: string
}

export interface BillingPeriodStats {
  total_invoices: number
  total_amount: number
  total_paid: number
  total_outstanding: number
  invoices_sent: number
  invoices_paid: number
  invoices_overdue: number
  payment_rate: number
}

// =====================================================
// SERVICE CLASS
// =====================================================

class BillingPeriodService {
  private supabase: SupabaseClient

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || createClient()
  }

  // =====================================================
  // CRUD
  // =====================================================

  /**
   * Récupère toutes les périodes de facturation d'une crèche
   */
  async getByNursery(nurseryId: string): Promise<BillingPeriod[]> {
    const { data, error } = await this.supabase
      .from('billing_period')
      .select('*')
      .eq('nursery_id', nurseryId)
      .order('period_start', { ascending: false })

    if (error) throw error
    return data as BillingPeriod[]
  }

  /**
   * Récupère une période par son ID
   */
  async getById(periodId: string): Promise<BillingPeriod> {
    const { data, error } = await this.supabase
      .from('billing_period')
      .select('*')
      .eq('id', periodId)
      .single()

    if (error) throw error
    return data as BillingPeriod
  }

  /**
   * Récupère la période en cours
   */
  async getCurrentPeriod(nurseryId: string): Promise<BillingPeriod | null> {
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await this.supabase
      .from('billing_period')
      .select('*')
      .eq('nursery_id', nurseryId)
      .lte('period_start', today)
      .gte('period_end', today)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data as BillingPeriod | null
  }

  /**
   * Récupère une période par mois
   */
  async getByMonth(nurseryId: string, year: number, month: number): Promise<BillingPeriod | null> {
    const periodStart = `${year}-${String(month).padStart(2, '0')}-01`

    const { data, error } = await this.supabase
      .from('billing_period')
      .select('*')
      .eq('nursery_id', nurseryId)
      .eq('period_start', periodStart)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data as BillingPeriod | null
  }

  /**
   * Crée une nouvelle période de facturation
   */
  async create(input: CreateBillingPeriodInput): Promise<BillingPeriod> {
    // Vérifie qu'aucune période ne chevauche déjà
    const { data: existing } = await this.supabase
      .from('billing_period')
      .select('id')
      .eq('nursery_id', input.nursery_id)
      .or(`period_start.lte.${input.period_end},period_end.gte.${input.period_start}`)

    if (existing && existing.length > 0) {
      throw new Error('A billing period already exists for this date range')
    }

    // Génère le nom de la période (ex: "Janvier 2026")
    const startDate = new Date(input.period_start)
    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ]
    const periodName = `${monthNames[startDate.getMonth()]} ${startDate.getFullYear()}`

    const periodData = {
      ...input,
      period_name: periodName,
      status: 'open',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await this.supabase
      .from('billing_period')
      .insert(periodData)
      .select()
      .single()

    if (error) throw error
    return data as BillingPeriod
  }

  /**
   * Clôture une période (status: open → closed)
   */
  async close(periodId: string, closedById: string): Promise<BillingPeriod> {
    // Vérifie que la période est ouverte
    const { data: period, error: checkError } = await this.supabase
      .from('billing_period')
      .select('status')
      .eq('id', periodId)
      .single()

    if (checkError) throw checkError
    if (period.status !== 'open') {
      throw new Error('Period is not open')
    }

    const { data, error } = await this.supabase
      .from('billing_period')
      .update({
        status: 'closed',
        period_closed_date: new Date().toISOString(),
        closed_by_id: closedById,
        updated_at: new Date().toISOString(),
      })
      .eq('id', periodId)
      .select()
      .single()

    if (error) throw error

    // Met à jour les statistiques
    await this.updateStats(periodId)

    return data as BillingPeriod
  }

  /**
   * Marque une période comme facturée (status: closed → invoiced)
   */
  async markAsInvoiced(periodId: string): Promise<BillingPeriod> {
    const { data, error } = await this.supabase
      .from('billing_period')
      .update({
        status: 'invoiced',
        invoice_generation_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', periodId)
      .eq('status', 'closed')
      .select()
      .single()

    if (error) throw error
    if (!data) throw new Error('Period not found or not closed')

    return data as BillingPeriod
  }

  /**
   * Marque les factures comme envoyées
   */
  async markInvoicesSent(periodId: string): Promise<BillingPeriod> {
    const { data, error } = await this.supabase
      .from('billing_period')
      .update({
        invoice_sent_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', periodId)
      .select()
      .single()

    if (error) throw error
    return data as BillingPeriod
  }

  /**
   * Finalise une période (status: invoiced → finalized)
   */
  async finalize(periodId: string): Promise<BillingPeriod> {
    // Met à jour les statistiques avant de finaliser
    await this.updateStats(periodId)

    const { data, error } = await this.supabase
      .from('billing_period')
      .update({
        status: 'finalized',
        finalized_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', periodId)
      .eq('status', 'invoiced')
      .select()
      .single()

    if (error) throw error
    if (!data) throw new Error('Period not found or not invoiced')

    return data as BillingPeriod
  }

  /**
   * Rouvre une période finalisée (en cas de correction)
   */
  async reopen(periodId: string): Promise<BillingPeriod> {
    const { data, error } = await this.supabase
      .from('billing_period')
      .update({
        status: 'open',
        updated_at: new Date().toISOString(),
      })
      .eq('id', periodId)
      .select()
      .single()

    if (error) throw error
    return data as BillingPeriod
  }

  // =====================================================
  // STATISTIQUES
  // =====================================================

  /**
   * Récupère les statistiques d'une période
   */
  async getStats(periodId: string): Promise<BillingPeriodStats> {
    // Récupère la période
    const period = await this.getById(periodId)

    // Récupère toutes les factures de la période
    const { data: invoices, error } = await this.supabase
      .from('invoice')
      .select('status, total_amount, paid_amount, remaining_amount')
      .eq('nursery_id', period.nursery_id)
      .gte('billing_period_start', period.period_start)
      .lte('billing_period_end', period.period_end)
      .neq('status', 'cancelled')

    if (error) throw error

    const totalInvoices = invoices.length
    const totalAmount = invoices.reduce((sum, inv) => sum + inv.total_amount, 0)
    const totalPaid = invoices.reduce((sum, inv) => sum + inv.paid_amount, 0)
    const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.remaining_amount, 0)

    const invoicesSent = invoices.filter(inv =>
      ['sent', 'paid', 'partially_paid', 'overdue'].includes(inv.status)
    ).length

    const invoicesPaid = invoices.filter(inv => inv.status === 'paid').length

    const invoicesOverdue = invoices.filter(inv => inv.status === 'overdue').length

    const paymentRate = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0

    return {
      total_invoices: totalInvoices,
      total_amount: totalAmount,
      total_paid: totalPaid,
      total_outstanding: totalOutstanding,
      invoices_sent: invoicesSent,
      invoices_paid: invoicesPaid,
      invoices_overdue: invoicesOverdue,
      payment_rate: Math.round(paymentRate * 100) / 100,
    }
  }

  /**
   * Met à jour les statistiques d'une période dans la base
   */
  async updateStats(periodId: string): Promise<void> {
    const stats = await this.getStats(periodId)

    await this.supabase
      .from('billing_period')
      .update({
        total_invoices: stats.total_invoices,
        total_amount: stats.total_amount,
        total_paid: stats.total_paid,
        total_outstanding: stats.total_outstanding,
        updated_at: new Date().toISOString(),
      })
      .eq('id', periodId)
  }

  // =====================================================
  // UTILITAIRES
  // =====================================================

  /**
   * Crée automatiquement les périodes manquantes jusqu'à aujourd'hui
   */
  async createMissingPeriods(
    nurseryId: string,
    createdById: string,
    startYear: number = 2026
  ): Promise<BillingPeriod[]> {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1

    const createdPeriods: BillingPeriod[] = []

    for (let year = startYear; year <= currentYear; year++) {
      const lastMonth = year === currentYear ? currentMonth : 12

      for (let month = 1; month <= lastMonth; month++) {
        // Vérifie si la période existe déjà
        const existing = await this.getByMonth(nurseryId, year, month)
        if (existing) continue

        // Crée la période
        const periodStart = `${year}-${String(month).padStart(2, '0')}-01`
        const lastDay = new Date(year, month, 0).getDate()
        const periodEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

        try {
          const period = await this.create({
            nursery_id: nurseryId,
            period_start: periodStart,
            period_end: periodEnd,
            created_by_id: createdById,
          })
          createdPeriods.push(period)
        } catch (error) {
          console.error(`Failed to create period ${month}/${year}:`, error)
        }
      }
    }

    return createdPeriods
  }

  /**
   * Récupère le résumé annuel des périodes
   */
  async getYearlySummary(nurseryId: string, year: number) {
    const { data: periods, error } = await this.supabase
      .from('billing_period')
      .select('*')
      .eq('nursery_id', nurseryId)
      .gte('period_start', `${year}-01-01`)
      .lte('period_end', `${year}-12-31`)
      .order('period_start', { ascending: true })

    if (error) throw error

    const summary = {
      total_periods: periods.length,
      total_amount: periods.reduce((sum, p) => sum + (p.total_amount || 0), 0),
      total_paid: periods.reduce((sum, p) => sum + (p.total_paid || 0), 0),
      total_outstanding: periods.reduce((sum, p) => sum + (p.total_outstanding || 0), 0),
      finalized_periods: periods.filter(p => p.status === 'finalized').length,
      open_periods: periods.filter(p => p.status === 'open').length,
    }

    return { periods, summary }
  }
}

// =====================================================
// EXPORT SINGLETON
// =====================================================

export const billingPeriodService = new BillingPeriodService()
