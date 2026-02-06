/**
 * Payment Service
 * Gestion des paiements et moyens de paiement
 */

import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

// =====================================================
// TYPES
// =====================================================

export interface Payment {
  id: string
  nursery_id: string
  family_id: string
  invoice_id?: string
  payment_method_id?: string

  // Numéro
  payment_number: string // Format: {NURSERY}-PAY-{YYYYMM}{SEQ}

  // Dates
  payment_date: string
  received_date?: string

  // Montant
  amount: number

  // Références
  transaction_reference?: string // Référence bancaire, n° chèque, etc.
  bank_reference?: string // Référence banque
  stripe_payment_id?: string // ID Stripe si paiement en ligne

  // Status
  status: 'received' | 'validated' | 'rejected' | 'refunded'

  // Validation
  validated_at?: string
  validated_by_id?: string
  rejection_reason?: string

  // Remboursement
  refunded_at?: string
  refunded_by_id?: string
  refund_reason?: string
  refund_reference?: string

  // Notes
  notes?: string

  // Metadata
  created_at: string
  updated_at: string
  created_by_id?: string
}

export interface PaymentMethod {
  id: string
  family_id: string

  method_type: 'bank_transfer' | 'direct_debit' | 'check' | 'cash' | 'credit_card' | 'stripe' | 'paypal'

  // Informations bancaires
  iban?: string
  bic?: string
  bank_name?: string
  account_holder_name?: string

  // Mandat SEPA (prélèvement automatique)
  sepa_mandate_reference?: string
  sepa_mandate_signed_date?: string
  sepa_mandate_status?: 'pending' | 'active' | 'cancelled'

  // Stripe/Paypal
  stripe_payment_method_id?: string
  stripe_customer_id?: string
  paypal_email?: string

  // Configuration
  is_default: boolean
  is_verified: boolean

  // Metadata
  created_at: string
  updated_at: string
  verified_at?: string
  verified_by_id?: string
}

export interface CreatePaymentInput {
  nursery_id: string
  family_id: string
  invoice_id?: string
  payment_method_id?: string
  payment_date: string
  amount: number
  transaction_reference?: string
  bank_reference?: string
  notes?: string
  created_by_id: string
}

export interface CreatePaymentMethodInput {
  family_id: string
  method_type: PaymentMethod['method_type']
  iban?: string
  bic?: string
  bank_name?: string
  account_holder_name?: string
  sepa_mandate_reference?: string
  sepa_mandate_signed_date?: string
  stripe_payment_method_id?: string
  stripe_customer_id?: string
  paypal_email?: string
  is_default?: boolean
}

export interface PaymentFilters {
  family_id?: string
  invoice_id?: string
  status?: Payment['status']
  date_from?: string
  date_to?: string
}

// =====================================================
// SERVICE CLASS
// =====================================================

class PaymentService {
  private supabase: SupabaseClient

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || createClient()
  }

  // =====================================================
  // CRUD - Paiements
  // =====================================================

  /**
   * Récupère tous les paiements d'une crèche avec filtres
   */
  async getByNursery(nurseryId: string, filters?: PaymentFilters): Promise<Payment[]> {
    let query = this.supabase
      .from('payment')
      .select(`
        *,
        family:family_id (id, family_name),
        invoice:invoice_id (id, invoice_number, total_amount),
        payment_method:payment_method_id (id, method_type)
      `)
      .eq('nursery_id', nurseryId)
      .order('payment_date', { ascending: false })

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
      query = query.gte('payment_date', filters.date_from)
    }

    if (filters?.date_to) {
      query = query.lte('payment_date', filters.date_to)
    }

    const { data, error } = await query

    if (error) throw error
    return data as Payment[]
  }

  /**
   * Récupère tous les paiements d'une famille
   */
  async getByFamily(familyId: string): Promise<Payment[]> {
    const { data, error } = await this.supabase
      .from('payment')
      .select(`
        *,
        nursery:nursery_id (id, name),
        invoice:invoice_id (id, invoice_number, total_amount),
        payment_method:payment_method_id (id, method_type)
      `)
      .eq('family_id', familyId)
      .order('payment_date', { ascending: false })

    if (error) throw error
    return data as Payment[]
  }

  /**
   * Récupère tous les paiements d'une facture
   */
  async getByInvoice(invoiceId: string): Promise<Payment[]> {
    const { data, error } = await this.supabase
      .from('payment')
      .select(`
        *,
        family:family_id (id, family_name),
        payment_method:payment_method_id (id, method_type)
      `)
      .eq('invoice_id', invoiceId)
      .order('payment_date', { ascending: false })

    if (error) throw error
    return data as Payment[]
  }

  /**
   * Récupère un paiement par son ID
   */
  async getById(paymentId: string): Promise<Payment> {
    const { data, error } = await this.supabase
      .from('payment')
      .select(`
        *,
        family:family_id (id, family_name),
        invoice:invoice_id (id, invoice_number, total_amount, remaining_amount),
        payment_method:payment_method_id (id, method_type, iban, bank_name),
        created_by:created_by_id (id, first_name, last_name)
      `)
      .eq('id', paymentId)
      .single()

    if (error) throw error
    return data as Payment
  }

  /**
   * Enregistre un nouveau paiement
   */
  async create(input: CreatePaymentInput): Promise<Payment> {
    // Génère le numéro de paiement
    const paymentNumber = await this.generatePaymentNumber(
      input.nursery_id,
      input.payment_date
    )

    const paymentData = {
      ...input,
      payment_number: paymentNumber,
      status: 'received',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await this.supabase
      .from('payment')
      .insert(paymentData)
      .select()
      .single()

    if (error) throw error

    // Si lié à une facture, met à jour les montants de la facture
    if (input.invoice_id) {
      await this.updateInvoiceAmounts(input.invoice_id)
    }

    return data as Payment
  }

  /**
   * Valide un paiement
   */
  async validate(paymentId: string, validatedById: string): Promise<Payment> {
    const { data, error } = await this.supabase
      .from('payment')
      .update({
        status: 'validated',
        validated_at: new Date().toISOString(),
        validated_by_id: validatedById,
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentId)
      .eq('status', 'received')
      .select()
      .single()

    if (error) throw error
    if (!data) throw new Error('Payment not found or already validated')

    return data as Payment
  }

  /**
   * Rejette un paiement
   */
  async reject(
    paymentId: string,
    validatedById: string,
    reason: string
  ): Promise<Payment> {
    // Récupère le paiement pour obtenir l'invoice_id
    const { data: payment, error: fetchError } = await this.supabase
      .from('payment')
      .select('invoice_id, amount')
      .eq('id', paymentId)
      .single()

    if (fetchError) throw fetchError

    const { data, error } = await this.supabase
      .from('payment')
      .update({
        status: 'rejected',
        validated_at: new Date().toISOString(),
        validated_by_id: validatedById,
        rejection_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentId)
      .eq('status', 'received')
      .select()
      .single()

    if (error) throw error
    if (!data) throw new Error('Payment not found or already processed')

    // Si lié à une facture, met à jour les montants
    if (payment.invoice_id) {
      await this.updateInvoiceAmounts(payment.invoice_id)
    }

    return data as Payment
  }

  /**
   * Rembourse un paiement
   */
  async refund(
    paymentId: string,
    refundedById: string,
    reason: string,
    refundReference?: string
  ): Promise<Payment> {
    // Récupère le paiement pour obtenir l'invoice_id
    const { data: payment, error: fetchError } = await this.supabase
      .from('payment')
      .select('invoice_id, amount')
      .eq('id', paymentId)
      .single()

    if (fetchError) throw fetchError

    const { data, error } = await this.supabase
      .from('payment')
      .update({
        status: 'refunded',
        refunded_at: new Date().toISOString(),
        refunded_by_id: refundedById,
        refund_reason: reason,
        refund_reference: refundReference,
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentId)
      .eq('status', 'validated')
      .select()
      .single()

    if (error) throw error
    if (!data) throw new Error('Payment not found or not validated')

    // Si lié à une facture, met à jour les montants
    if (payment.invoice_id) {
      await this.updateInvoiceAmounts(payment.invoice_id)
    }

    return data as Payment
  }

  /**
   * Supprime un paiement (seulement si status = received)
   */
  async delete(paymentId: string): Promise<void> {
    // Récupère le paiement pour obtenir l'invoice_id
    const { data: payment, error: fetchError } = await this.supabase
      .from('payment')
      .select('invoice_id')
      .eq('id', paymentId)
      .single()

    if (fetchError) throw fetchError

    const { error } = await this.supabase
      .from('payment')
      .delete()
      .eq('id', paymentId)
      .eq('status', 'received')

    if (error) throw error

    // Si lié à une facture, met à jour les montants
    if (payment.invoice_id) {
      await this.updateInvoiceAmounts(payment.invoice_id)
    }
  }

  // =====================================================
  // MOYENS DE PAIEMENT
  // =====================================================

  /**
   * Récupère tous les moyens de paiement d'une famille
   */
  async getPaymentMethods(familyId: string): Promise<PaymentMethod[]> {
    const { data, error } = await this.supabase
      .from('payment_method')
      .select('*')
      .eq('family_id', familyId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as PaymentMethod[]
  }

  /**
   * Récupère le moyen de paiement par défaut d'une famille
   */
  async getDefaultPaymentMethod(familyId: string): Promise<PaymentMethod | null> {
    const { data, error } = await this.supabase
      .from('payment_method')
      .select('*')
      .eq('family_id', familyId)
      .eq('is_default', true)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data as PaymentMethod | null
  }

  /**
   * Ajoute un moyen de paiement
   */
  async addPaymentMethod(input: CreatePaymentMethodInput): Promise<PaymentMethod> {
    // Si c'est le moyen par défaut, retire le flag des autres
    if (input.is_default) {
      await this.supabase
        .from('payment_method')
        .update({ is_default: false })
        .eq('family_id', input.family_id)
    }

    const methodData = {
      ...input,
      is_verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await this.supabase
      .from('payment_method')
      .insert(methodData)
      .select()
      .single()

    if (error) throw error
    return data as PaymentMethod
  }

  /**
   * Définit un moyen de paiement comme par défaut
   */
  async setDefaultPaymentMethod(methodId: string): Promise<PaymentMethod> {
    // Récupère la famille_id du moyen de paiement
    const { data: method, error: fetchError } = await this.supabase
      .from('payment_method')
      .select('family_id')
      .eq('id', methodId)
      .single()

    if (fetchError) throw fetchError

    // Retire le flag des autres moyens
    await this.supabase
      .from('payment_method')
      .update({ is_default: false })
      .eq('family_id', method.family_id)

    // Active le flag sur le moyen sélectionné
    const { data, error } = await this.supabase
      .from('payment_method')
      .update({
        is_default: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', methodId)
      .select()
      .single()

    if (error) throw error
    return data as PaymentMethod
  }

  /**
   * Supprime un moyen de paiement
   */
  async deletePaymentMethod(methodId: string): Promise<void> {
    const { error } = await this.supabase
      .from('payment_method')
      .delete()
      .eq('id', methodId)

    if (error) throw error
  }

  /**
   * Vérifie la validité d'un IBAN (basique)
   */
  verifyIBAN(iban: string): boolean {
    // Retire les espaces
    const ibanClean = iban.replace(/\s/g, '')

    // Vérifie la longueur (FR = 27 caractères)
    if (ibanClean.length < 15 || ibanClean.length > 34) {
      return false
    }

    // Vérifie le format (2 lettres + 2 chiffres + reste alphanumérique)
    const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/
    if (!ibanRegex.test(ibanClean)) {
      return false
    }

    // TODO: Implémenter validation checksum (modulo 97)
    // Pour l'instant, validation basique uniquement

    return true
  }

  // =====================================================
  // UTILITAIRES
  // =====================================================

  /**
   * Met à jour les montants d'une facture après paiement
   */
  private async updateInvoiceAmounts(invoiceId: string): Promise<void> {
    // Calcule le total des paiements validés
    const { data: payments, error: paymentsError } = await this.supabase
      .from('payment')
      .select('amount')
      .eq('invoice_id', invoiceId)
      .in('status', ['validated', 'received'])

    if (paymentsError) throw paymentsError

    const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0)

    // Récupère la facture pour calculer remaining_amount
    const { data: invoice, error: invoiceError } = await this.supabase
      .from('invoice')
      .select('total_amount, discount_amount')
      .eq('id', invoiceId)
      .single()

    if (invoiceError) throw invoiceError

    const remainingAmount = invoice.total_amount - (invoice.discount_amount || 0) - paidAmount

    // Détermine le nouveau status
    let newStatus: string
    if (remainingAmount <= 0) {
      newStatus = 'paid'
    } else if (paidAmount > 0) {
      newStatus = 'partially_paid'
    } else {
      newStatus = 'sent' // ou garde l'actuel
    }

    // Met à jour la facture
    const updateData: any = {
      paid_amount: paidAmount,
      remaining_amount: Math.max(0, remainingAmount),
      updated_at: new Date().toISOString(),
    }

    if (remainingAmount <= 0) {
      updateData.status = 'paid'
      updateData.paid_date = new Date().toISOString()
    } else if (paidAmount > 0) {
      updateData.status = 'partially_paid'
    }

    await this.supabase
      .from('invoice')
      .update(updateData)
      .eq('id', invoiceId)
  }

  /**
   * Génère un numéro de paiement unique
   * Format: {NURSERY}-PAY-{YYYYMM}{SEQ}
   */
  private async generatePaymentNumber(
    nurseryId: string,
    paymentDate: string
  ): Promise<string> {
    // Utilise la fonction SQL pour générer le numéro
    const { data, error } = await this.supabase.rpc('generate_payment_number', {
      p_nursery_id: nurseryId,
      p_payment_date: paymentDate,
    })

    if (error) throw error
    return data as string
  }

  /**
   * Récupère les statistiques des paiements d'une crèche
   */
  async getStats(nurseryId: string, month?: string) {
    let query = this.supabase
      .from('payment')
      .select('status, amount')
      .eq('nursery_id', nurseryId)

    if (month) {
      const startDate = `${month}-01`
      const endDate = `${month}-31`
      query = query
        .gte('payment_date', startDate)
        .lte('payment_date', endDate)
    }

    const { data, error } = await query

    if (error) throw error

    const stats = {
      total_payments: data.length,
      total_amount: data.reduce((sum, p) => sum + p.amount, 0),
      validated_amount: data
        .filter(p => p.status === 'validated')
        .reduce((sum, p) => sum + p.amount, 0),
      pending_validation: data.filter(p => p.status === 'received').length,
      rejected: data.filter(p => p.status === 'rejected').length,
      refunded: data.filter(p => p.status === 'refunded').length,
    }

    return stats
  }
}

// =====================================================
// EXPORT SINGLETON
// =====================================================

export const paymentService = new PaymentService()
