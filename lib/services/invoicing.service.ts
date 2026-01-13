/**
 * Invoicing Service
 * Gestion des factures, génération automatique, calculs de montants
 */

import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

// =====================================================
// TYPES
// =====================================================

export interface Invoice {
  id: string
  nursery_id: string
  family_id: string
  contract_id?: string

  // Numérotation
  invoice_number: string // Format: {NURSERY}-INV-{YYYYMM}{SEQ}

  // Dates
  invoice_date: string
  due_date: string
  paid_date?: string

  // Période de facturation
  billing_period_start: string
  billing_period_end: string

  // Montants
  subtotal_amount: number // HT
  tax_amount: number // TVA (0 pour crèches)
  total_amount: number // TTC
  discount_amount: number // Remises
  paid_amount: number // Montant payé
  remaining_amount: number // Reste à payer

  // Répartition CAF/Famille (PSU)
  caf_participation?: number // Part CAF
  family_share?: number // Part famille

  // Status
  status: 'draft' | 'sent' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled' | 'credited'

  // Documents
  invoice_pdf_url?: string

  // Notes
  payment_terms?: string // Conditions de paiement
  notes?: string

  // Metadata
  created_at: string
  updated_at: string
  created_by_id?: string
  sent_at?: string
  sent_by_id?: string
  cancelled_at?: string
  cancelled_by_id?: string
  cancellation_reason?: string
}

export interface InvoiceLine {
  id: string
  invoice_id: string

  line_number: number // Ordre d'affichage (1, 2, 3...)

  // Description
  description: string // Ex: "Accueil régulier - Janvier 2026"
  item_type: 'childcare' | 'meal' | 'extra_hours' | 'supply_fee' | 'late_pickup' | 'penalty' | 'adjustment' | 'other'

  // Quantité
  quantity: number
  unit: 'hour' | 'day' | 'month' | 'meal' | 'week' | 'unit'

  // Prix
  unit_price: number
  subtotal: number // quantity * unit_price
  tax_rate: number // TVA en % (0 pour crèches)
  tax_amount: number
  total: number // subtotal + tax_amount

  // Metadata
  created_at: string
  updated_at: string
}

export interface CreateInvoiceInput {
  nursery_id: string
  family_id: string
  contract_id?: string
  invoice_date: string
  due_date: string
  billing_period_start: string
  billing_period_end: string
  payment_terms?: string
  notes?: string
  created_by_id: string
}

export interface UpdateInvoiceInput {
  invoice_date?: string
  due_date?: string
  discount_amount?: number
  payment_terms?: string
  notes?: string
}

export interface AddInvoiceLineInput {
  description: string
  item_type: InvoiceLine['item_type']
  quantity: number
  unit: InvoiceLine['unit']
  unit_price: number
  tax_rate?: number
}

export interface InvoiceFilters {
  family_id?: string
  status?: Invoice['status']
  date_from?: string
  date_to?: string
  is_overdue?: boolean
}

export interface InvoiceCalculation {
  subtotal: number
  tax_amount: number
  total_amount: number
  caf_participation?: number
  family_share?: number
}

// =====================================================
// SERVICE CLASS
// =====================================================

class InvoicingService {
  private supabase: SupabaseClient

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || createClient()
  }

  // =====================================================
  // CRUD - Factures
  // =====================================================

  /**
   * Récupère toutes les factures d'une crèche avec filtres
   */
  async getByNursery(nurseryId: string, filters?: InvoiceFilters): Promise<Invoice[]> {
    let query = this.supabase
      .from('invoice')
      .select(`
        *,
        family:family_id (id, family_name),
        contract:contract_id (id, contract_number)
      `)
      .eq('nursery_id', nurseryId)
      .order('invoice_date', { ascending: false })

    if (filters?.family_id) {
      query = query.eq('family_id', filters.family_id)
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.date_from) {
      query = query.gte('invoice_date', filters.date_from)
    }

    if (filters?.date_to) {
      query = query.lte('invoice_date', filters.date_to)
    }

    if (filters?.is_overdue) {
      query = query
        .in('status', ['sent', 'partially_paid', 'overdue'])
        .lt('due_date', new Date().toISOString().split('T')[0])
        .gt('remaining_amount', 0)
    }

    const { data, error } = await query

    if (error) throw error
    return data as Invoice[]
  }

  /**
   * Récupère toutes les factures d'une famille
   */
  async getByFamily(familyId: string): Promise<Invoice[]> {
    const { data, error } = await this.supabase
      .from('invoice')
      .select(`
        *,
        nursery:nursery_id (id, name),
        contract:contract_id (id, contract_number)
      `)
      .eq('family_id', familyId)
      .order('invoice_date', { ascending: false })

    if (error) throw error
    return data as Invoice[]
  }

  /**
   * Récupère une facture par son ID avec lignes
   */
  async getById(invoiceId: string): Promise<Invoice & { lines: InvoiceLine[] }> {
    const { data: invoice, error: invoiceError } = await this.supabase
      .from('invoice')
      .select(`
        *,
        family:family_id (id, family_name, address, postal_code, city),
        nursery:nursery_id (id, name, address, postal_code, city, phone, email),
        contract:contract_id (id, contract_number, rate_type)
      `)
      .eq('id', invoiceId)
      .single()

    if (invoiceError) throw invoiceError

    const { data: lines, error: linesError } = await this.supabase
      .from('invoice_line')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('line_number', { ascending: true })

    if (linesError) throw linesError

    return { ...invoice, lines } as Invoice & { lines: InvoiceLine[] }
  }

  /**
   * Récupère les factures impayées d'une crèche
   */
  async getOverdueInvoices(nurseryId: string): Promise<Invoice[]> {
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await this.supabase
      .from('invoice')
      .select(`
        *,
        family:family_id (id, family_name, phone, email)
      `)
      .eq('nursery_id', nurseryId)
      .in('status', ['sent', 'partially_paid', 'overdue'])
      .lt('due_date', today)
      .gt('remaining_amount', 0)
      .order('due_date', { ascending: true })

    if (error) throw error
    return data as Invoice[]
  }

  /**
   * Crée une nouvelle facture (brouillon)
   */
  async create(input: CreateInvoiceInput): Promise<Invoice> {
    // Génère le numéro de facture
    const invoiceNumber = await this.generateInvoiceNumber(
      input.nursery_id,
      input.invoice_date
    )

    const invoiceData = {
      ...input,
      invoice_number: invoiceNumber,
      subtotal_amount: 0,
      tax_amount: 0,
      total_amount: 0,
      discount_amount: 0,
      paid_amount: 0,
      remaining_amount: 0,
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await this.supabase
      .from('invoice')
      .insert(invoiceData)
      .select()
      .single()

    if (error) throw error
    return data as Invoice
  }

  /**
   * Met à jour une facture (seulement si status = draft)
   */
  async update(invoiceId: string, input: UpdateInvoiceInput): Promise<Invoice> {
    // Vérifie que la facture est en brouillon
    const { data: invoice, error: checkError } = await this.supabase
      .from('invoice')
      .select('status')
      .eq('id', invoiceId)
      .single()

    if (checkError) throw checkError
    if (invoice.status !== 'draft') {
      throw new Error('Cannot update invoice that is not in draft status')
    }

    const { data, error } = await this.supabase
      .from('invoice')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)
      .select()
      .single()

    if (error) throw error
    return data as Invoice
  }

  /**
   * Envoie une facture (change status de draft à sent)
   */
  async send(invoiceId: string, sentById: string): Promise<Invoice> {
    const { data, error } = await this.supabase
      .from('invoice')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        sent_by_id: sentById,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)
      .eq('status', 'draft')
      .select()
      .single()

    if (error) throw error
    if (!data) throw new Error('Invoice not found or already sent')

    return data as Invoice
  }

  /**
   * Annule une facture
   */
  async cancel(
    invoiceId: string,
    cancelledById: string,
    reason: string
  ): Promise<Invoice> {
    const { data, error } = await this.supabase
      .from('invoice')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by_id: cancelledById,
        cancellation_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)
      .neq('status', 'paid') // Ne peut pas annuler une facture payée
      .select()
      .single()

    if (error) throw error
    if (!data) throw new Error('Invoice not found or cannot be cancelled')

    return data as Invoice
  }

  /**
   * Supprime une facture (seulement si status = draft)
   */
  async delete(invoiceId: string): Promise<void> {
    const { error } = await this.supabase
      .from('invoice')
      .delete()
      .eq('id', invoiceId)
      .eq('status', 'draft')

    if (error) throw error
  }

  // =====================================================
  // LIGNES DE FACTURE
  // =====================================================

  /**
   * Ajoute une ligne à une facture
   */
  async addLine(invoiceId: string, input: AddInvoiceLineInput): Promise<InvoiceLine> {
    // Vérifie que la facture est en brouillon
    const { data: invoice, error: checkError } = await this.supabase
      .from('invoice')
      .select('status')
      .eq('id', invoiceId)
      .single()

    if (checkError) throw checkError
    if (invoice.status !== 'draft') {
      throw new Error('Cannot add line to invoice that is not in draft status')
    }

    // Récupère le prochain numéro de ligne
    const { data: lines } = await this.supabase
      .from('invoice_line')
      .select('line_number')
      .eq('invoice_id', invoiceId)
      .order('line_number', { ascending: false })
      .limit(1)

    const nextLineNumber = lines && lines.length > 0 ? lines[0].line_number + 1 : 1

    // Calcule les montants
    const taxRate = input.tax_rate || 0
    const subtotal = input.quantity * input.unit_price
    const taxAmount = subtotal * (taxRate / 100)
    const total = subtotal + taxAmount

    const lineData = {
      invoice_id: invoiceId,
      line_number: nextLineNumber,
      description: input.description,
      item_type: input.item_type,
      quantity: input.quantity,
      unit: input.unit,
      unit_price: input.unit_price,
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await this.supabase
      .from('invoice_line')
      .insert(lineData)
      .select()
      .single()

    if (error) throw error

    // Met à jour les totaux de la facture
    await this.recalculateTotals(invoiceId)

    return data as InvoiceLine
  }

  /**
   * Met à jour une ligne de facture
   */
  async updateLine(
    lineId: string,
    input: Partial<AddInvoiceLineInput>
  ): Promise<InvoiceLine> {
    // Récupère la ligne pour vérifier le status de la facture
    const { data: line, error: lineError } = await this.supabase
      .from('invoice_line')
      .select('invoice_id')
      .eq('id', lineId)
      .single()

    if (lineError) throw lineError

    const { data: invoice, error: invoiceError } = await this.supabase
      .from('invoice')
      .select('status')
      .eq('id', line.invoice_id)
      .single()

    if (invoiceError) throw invoiceError
    if (invoice.status !== 'draft') {
      throw new Error('Cannot update line of invoice that is not in draft status')
    }

    // Récupère la ligne actuelle pour les calculs
    const { data: currentLine, error: currentError } = await this.supabase
      .from('invoice_line')
      .select('*')
      .eq('id', lineId)
      .single()

    if (currentError) throw currentError

    // Prépare les nouvelles valeurs
    const quantity = input.quantity !== undefined ? input.quantity : currentLine.quantity
    const unitPrice = input.unit_price !== undefined ? input.unit_price : currentLine.unit_price
    const taxRate = input.tax_rate !== undefined ? input.tax_rate : currentLine.tax_rate

    const subtotal = quantity * unitPrice
    const taxAmount = subtotal * (taxRate / 100)
    const total = subtotal + taxAmount

    const { data, error } = await this.supabase
      .from('invoice_line')
      .update({
        description: input.description,
        item_type: input.item_type,
        quantity,
        unit: input.unit,
        unit_price: unitPrice,
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lineId)
      .select()
      .single()

    if (error) throw error

    // Met à jour les totaux de la facture
    await this.recalculateTotals(line.invoice_id)

    return data as InvoiceLine
  }

  /**
   * Supprime une ligne de facture
   */
  async deleteLine(lineId: string): Promise<void> {
    // Récupère la ligne pour vérifier le status de la facture
    const { data: line, error: lineError } = await this.supabase
      .from('invoice_line')
      .select('invoice_id')
      .eq('id', lineId)
      .single()

    if (lineError) throw lineError

    const { data: invoice, error: invoiceError } = await this.supabase
      .from('invoice')
      .select('status')
      .eq('id', line.invoice_id)
      .single()

    if (invoiceError) throw invoiceError
    if (invoice.status !== 'draft') {
      throw new Error('Cannot delete line of invoice that is not in draft status')
    }

    const { error } = await this.supabase
      .from('invoice_line')
      .delete()
      .eq('id', lineId)

    if (error) throw error

    // Met à jour les totaux de la facture
    await this.recalculateTotals(line.invoice_id)
  }

  // =====================================================
  // CALCULS
  // =====================================================

  /**
   * Recalcule les totaux d'une facture à partir de ses lignes
   */
  private async recalculateTotals(invoiceId: string): Promise<void> {
    const { data: lines, error } = await this.supabase
      .from('invoice_line')
      .select('subtotal, tax_amount, total')
      .eq('invoice_id', invoiceId)

    if (error) throw error

    const subtotalAmount = lines.reduce((sum, line) => sum + line.subtotal, 0)
    const taxAmount = lines.reduce((sum, line) => sum + line.tax_amount, 0)
    const totalAmount = lines.reduce((sum, line) => sum + line.total, 0)

    // Récupère la facture pour avoir discount_amount et paid_amount
    const { data: invoice, error: invoiceError } = await this.supabase
      .from('invoice')
      .select('discount_amount, paid_amount')
      .eq('id', invoiceId)
      .single()

    if (invoiceError) throw invoiceError

    const remainingAmount = totalAmount - (invoice.discount_amount || 0) - (invoice.paid_amount || 0)

    await this.supabase
      .from('invoice')
      .update({
        subtotal_amount: subtotalAmount,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        remaining_amount: remainingAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)
  }

  // =====================================================
  // UTILITAIRES
  // =====================================================

  /**
   * Génère un numéro de facture unique
   * Format: {NURSERY}-INV-{YYYYMM}{SEQ}
   */
  private async generateInvoiceNumber(
    nurseryId: string,
    invoiceDate: string
  ): Promise<string> {
    // Utilise la fonction SQL pour générer le numéro
    const { data, error } = await this.supabase.rpc('generate_invoice_number', {
      p_nursery_id: nurseryId,
      p_invoice_date: invoiceDate,
    })

    if (error) throw error
    return data as string
  }

  /**
   * Récupère les statistiques des factures d'une crèche
   */
  async getStats(nurseryId: string, month?: string) {
    let query = this.supabase
      .from('invoice')
      .select('status, total_amount, paid_amount, remaining_amount')
      .eq('nursery_id', nurseryId)
      .neq('status', 'cancelled')

    if (month) {
      const startDate = `${month}-01`
      const endDate = `${month}-31`
      query = query
        .gte('invoice_date', startDate)
        .lte('invoice_date', endDate)
    }

    const { data, error } = await query

    if (error) throw error

    const stats = {
      total_invoices: data.length,
      total_amount: data.reduce((sum, inv) => sum + inv.total_amount, 0),
      total_paid: data.reduce((sum, inv) => sum + inv.paid_amount, 0),
      total_outstanding: data.reduce((sum, inv) => sum + inv.remaining_amount, 0),
      draft: data.filter(inv => inv.status === 'draft').length,
      sent: data.filter(inv => inv.status === 'sent').length,
      paid: data.filter(inv => inv.status === 'paid').length,
      partially_paid: data.filter(inv => inv.status === 'partially_paid').length,
      overdue: data.filter(inv => inv.status === 'overdue').length,
    }

    return stats
  }
}

// =====================================================
// EXPORT SINGLETON
// =====================================================

export const invoicingService = new InvoicingService()
