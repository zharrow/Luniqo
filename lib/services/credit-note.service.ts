/**
 * Credit Note Service
 * Gestion des avoirs (remboursements et corrections)
 */

import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

// =====================================================
// TYPES
// =====================================================

export interface CreditNote {
  id: string
  nursery_id: string
  family_id: string
  invoice_id?: string // Facture d'origine (optionnel)

  // Numérotation
  credit_note_number: string // Format: {NURSERY}-CN-{YYYYMM}{SEQ}

  // Dates
  credit_note_date: string
  applied_date?: string

  // Montant
  amount: number

  // Raison
  reason: 'overpayment' | 'error' | 'absence_refund' | 'contract_cancellation' | 'goodwill' | 'other'
  reason_description?: string

  // Application
  applied_to_invoice_id?: string // Facture sur laquelle l'avoir est appliqué
  is_refunded: boolean // true si remboursé, false si déduit de facture future

  // Status
  status: 'draft' | 'issued' | 'applied' | 'refunded' | 'cancelled'

  // Documents
  credit_note_pdf_url?: string

  // Notes
  notes?: string

  // Metadata
  created_at: string
  updated_at: string
  created_by_id?: string
  issued_at?: string
  issued_by_id?: string
  cancelled_at?: string
  cancelled_by_id?: string
  cancellation_reason?: string
}

export interface CreateCreditNoteInput {
  nursery_id: string
  family_id: string
  invoice_id?: string
  credit_note_date: string
  amount: number
  reason: CreditNote['reason']
  reason_description?: string
  notes?: string
  created_by_id: string
}

export interface CreditNoteFilters {
  family_id?: string
  invoice_id?: string
  status?: CreditNote['status']
  date_from?: string
  date_to?: string
}

// =====================================================
// SERVICE CLASS
// =====================================================

class CreditNoteService {
  private supabase: SupabaseClient

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || createClient()
  }

  // =====================================================
  // CRUD
  // =====================================================

  /**
   * Récupère tous les avoirs d'une crèche avec filtres
   */
  async getByNursery(nurseryId: string, filters?: CreditNoteFilters): Promise<CreditNote[]> {
    let query = this.supabase
      .from('credit_note')
      .select(`
        *,
        family:family_id (id, family_name),
        invoice:invoice_id (id, invoice_number, total_amount)
      `)
      .eq('nursery_id', nurseryId)
      .order('credit_note_date', { ascending: false })

    if (filters?.family_id) {
      query = query.eq('family_id', filters.family_id)
    }

    if (filters?.invoice_id) {
      query = query.eq('invoice_id', filters.invoice_id)
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.date_from) {
      query = query.gte('credit_note_date', filters.date_from)
    }

    if (filters?.date_to) {
      query = query.lte('credit_note_date', filters.date_to)
    }

    const { data, error } = await query

    if (error) throw error
    return data as CreditNote[]
  }

  /**
   * Récupère tous les avoirs d'une famille
   */
  async getByFamily(familyId: string): Promise<CreditNote[]> {
    const { data, error } = await this.supabase
      .from('credit_note')
      .select(`
        *,
        nursery:nursery_id (id, name),
        invoice:invoice_id (id, invoice_number)
      `)
      .eq('family_id', familyId)
      .order('credit_note_date', { ascending: false })

    if (error) throw error
    return data as CreditNote[]
  }

  /**
   * Récupère un avoir par son ID
   */
  async getById(creditNoteId: string): Promise<CreditNote> {
    const { data, error } = await this.supabase
      .from('credit_note')
      .select(`
        *,
        family:family_id (id, family_name, address, postal_code, city),
        nursery:nursery_id (id, name, address, postal_code, city),
        invoice:invoice_id (id, invoice_number, total_amount),
        applied_to_invoice:applied_to_invoice_id (id, invoice_number)
      `)
      .eq('id', creditNoteId)
      .single()

    if (error) throw error
    return data as CreditNote
  }

  /**
   * Crée un nouvel avoir (brouillon)
   */
  async create(input: CreateCreditNoteInput): Promise<CreditNote> {
    // Génère le numéro d'avoir
    const creditNoteNumber = await this.generateCreditNoteNumber(
      input.nursery_id,
      input.credit_note_date
    )

    const creditNoteData = {
      ...input,
      credit_note_number: creditNoteNumber,
      is_refunded: false,
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await this.supabase
      .from('credit_note')
      .insert(creditNoteData)
      .select()
      .single()

    if (error) throw error
    return data as CreditNote
  }

  /**
   * Émet un avoir (change status de draft à issued)
   */
  async issue(creditNoteId: string, issuedById: string): Promise<CreditNote> {
    const { data, error } = await this.supabase
      .from('credit_note')
      .update({
        status: 'issued',
        issued_at: new Date().toISOString(),
        issued_by_id: issuedById,
        updated_at: new Date().toISOString(),
      })
      .eq('id', creditNoteId)
      .eq('status', 'draft')
      .select()
      .single()

    if (error) throw error
    if (!data) throw new Error('Credit note not found or already issued')

    return data as CreditNote
  }

  /**
   * Applique un avoir sur une facture (déduit le montant)
   */
  async applyToInvoice(
    creditNoteId: string,
    invoiceId: string
  ): Promise<CreditNote> {
    // Récupère l'avoir
    const creditNote = await this.getById(creditNoteId)

    if (creditNote.status !== 'issued') {
      throw new Error('Credit note must be issued before applying')
    }

    if (creditNote.is_refunded) {
      throw new Error('Credit note already refunded')
    }

    // Récupère la facture
    const { data: invoice, error: invoiceError } = await this.supabase
      .from('invoice')
      .select('total_amount, paid_amount, discount_amount, remaining_amount')
      .eq('id', invoiceId)
      .single()

    if (invoiceError) throw invoiceError

    // Vérifie que le montant de l'avoir ne dépasse pas le reste à payer
    if (creditNote.amount > invoice.remaining_amount) {
      throw new Error('Credit note amount exceeds invoice remaining amount')
    }

    // Met à jour la facture avec la réduction
    const newDiscountAmount = (invoice.discount_amount || 0) + creditNote.amount
    const newRemainingAmount = invoice.total_amount - invoice.paid_amount - newDiscountAmount

    await this.supabase
      .from('invoice')
      .update({
        discount_amount: newDiscountAmount,
        remaining_amount: Math.max(0, newRemainingAmount),
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)

    // Met à jour l'avoir
    const { data, error } = await this.supabase
      .from('credit_note')
      .update({
        status: 'applied',
        applied_to_invoice_id: invoiceId,
        applied_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', creditNoteId)
      .select()
      .single()

    if (error) throw error
    return data as CreditNote
  }

  /**
   * Marque un avoir comme remboursé à la famille
   */
  async markAsRefunded(creditNoteId: string): Promise<CreditNote> {
    const { data, error } = await this.supabase
      .from('credit_note')
      .update({
        status: 'refunded',
        is_refunded: true,
        applied_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', creditNoteId)
      .eq('status', 'issued')
      .select()
      .single()

    if (error) throw error
    if (!data) throw new Error('Credit note not found or not issued')

    return data as CreditNote
  }

  /**
   * Annule un avoir
   */
  async cancel(
    creditNoteId: string,
    cancelledById: string,
    reason: string
  ): Promise<CreditNote> {
    // Récupère l'avoir pour vérifier s'il a été appliqué
    const creditNote = await this.getById(creditNoteId)

    if (creditNote.status === 'applied' || creditNote.status === 'refunded') {
      throw new Error('Cannot cancel a credit note that has been applied or refunded')
    }

    const { data, error } = await this.supabase
      .from('credit_note')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by_id: cancelledById,
        cancellation_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', creditNoteId)
      .select()
      .single()

    if (error) throw error
    return data as CreditNote
  }

  /**
   * Supprime un avoir (seulement si status = draft)
   */
  async delete(creditNoteId: string): Promise<void> {
    const { error } = await this.supabase
      .from('credit_note')
      .delete()
      .eq('id', creditNoteId)
      .eq('status', 'draft')

    if (error) throw error
  }

  // =====================================================
  // UTILITAIRES
  // =====================================================

  /**
   * Génère un numéro d'avoir unique
   * Format: {NURSERY}-CN-{YYYYMM}{SEQ}
   */
  private async generateCreditNoteNumber(
    nurseryId: string,
    creditNoteDate: string
  ): Promise<string> {
    // Utilise la fonction SQL pour générer le numéro
    const { data, error } = await this.supabase.rpc('generate_credit_note_number', {
      p_nursery_id: nurseryId,
      p_credit_note_date: creditNoteDate,
    })

    if (error) throw error
    return data as string
  }

  /**
   * Récupère les statistiques des avoirs d'une crèche
   */
  async getStats(nurseryId: string, month?: string) {
    let query = this.supabase
      .from('credit_note')
      .select('status, amount, is_refunded')
      .eq('nursery_id', nurseryId)
      .neq('status', 'cancelled')

    if (month) {
      const startDate = `${month}-01`
      const endDate = `${month}-31`
      query = query
        .gte('credit_note_date', startDate)
        .lte('credit_note_date', endDate)
    }

    const { data, error } = await query

    if (error) throw error

    const stats = {
      total_credit_notes: data.length,
      total_amount: data.reduce((sum, cn) => sum + cn.amount, 0),
      applied_amount: data
        .filter(cn => cn.status === 'applied')
        .reduce((sum, cn) => sum + cn.amount, 0),
      refunded_amount: data
        .filter(cn => cn.is_refunded)
        .reduce((sum, cn) => sum + cn.amount, 0),
      pending_application: data.filter(cn => cn.status === 'issued').length,
    }

    return stats
  }

  /**
   * Récupère les avoirs disponibles (non appliqués) pour une famille
   */
  async getAvailableForFamily(familyId: string): Promise<CreditNote[]> {
    const { data, error } = await this.supabase
      .from('credit_note')
      .select('*')
      .eq('family_id', familyId)
      .eq('status', 'issued')
      .eq('is_refunded', false)
      .order('credit_note_date', { ascending: true })

    if (error) throw error
    return data as CreditNote[]
  }
}

// =====================================================
// EXPORT SINGLETON
// =====================================================

export const creditNoteService = new CreditNoteService()
