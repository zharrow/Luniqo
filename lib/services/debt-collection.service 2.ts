/**
 * Debt Collection Service
 * Gestion des relances pour factures impayées
 */

import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

// =====================================================
// TYPES
// =====================================================

export interface DebtCollection {
  id: string
  invoice_id: string
  family_id: string
  nursery_id: string

  // Type de relance
  reminder_type: 'first_reminder' | 'second_reminder' | 'final_notice' | 'legal_action'
  reminder_date: string
  days_overdue: number // Nombre de jours de retard

  // Méthode d'envoi
  reminder_method: 'email' | 'postal_mail' | 'phone' | 'sms' | 'in_person'

  // Montant dû
  amount_due: number

  // Status
  status: 'pending' | 'sent' | 'acknowledged' | 'resolved' | 'escalated'

  // Envoi
  sent_at?: string
  sent_by_id?: string

  // Réponse famille
  family_response?: string
  family_response_date?: string

  // Plan de paiement
  payment_plan_proposed?: boolean
  payment_plan_accepted?: boolean
  payment_plan_details?: any

  // Documents
  reminder_pdf_url?: string

  // Notes
  notes?: string

  // Metadata
  created_at: string
  updated_at: string
  created_by_id?: string
}

export interface CreateReminderInput {
  invoice_id: string
  reminder_type: DebtCollection['reminder_type']
  reminder_method: DebtCollection['reminder_method']
  notes?: string
  created_by_id: string
}

export interface PaymentPlan {
  installments: number // Nombre de versements
  installment_amount: number // Montant par versement
  start_date: string
  frequency: 'weekly' | 'biweekly' | 'monthly'
  total_amount: number
}

export interface ReminderFilters {
  invoice_id?: string
  family_id?: string
  reminder_type?: DebtCollection['reminder_type']
  status?: DebtCollection['status']
  date_from?: string
  date_to?: string
}

// =====================================================
// SERVICE CLASS
// =====================================================

class DebtCollectionService {
  private supabase: SupabaseClient

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || createClient()
  }

  // =====================================================
  // CRUD
  // =====================================================

  /**
   * Récupère toutes les relances d'une crèche avec filtres
   */
  async getByNursery(nurseryId: string, filters?: ReminderFilters): Promise<DebtCollection[]> {
    let query = this.supabase
      .from('debt_collection')
      .select(`
        *,
        family:family_id (id, family_name, phone, email),
        invoice:invoice_id (id, invoice_number, total_amount, remaining_amount, due_date)
      `)
      .eq('nursery_id', nurseryId)
      .order('reminder_date', { ascending: false })

    if (filters?.invoice_id) {
      query = query.eq('invoice_id', filters.invoice_id)
    }

    if (filters?.family_id) {
      query = query.eq('family_id', filters.family_id)
    }

    if (filters?.reminder_type) {
      query = query.eq('reminder_type', filters.reminder_type)
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.date_from) {
      query = query.gte('reminder_date', filters.date_from)
    }

    if (filters?.date_to) {
      query = query.lte('reminder_date', filters.date_to)
    }

    const { data, error } = await query

    if (error) throw error
    return data as DebtCollection[]
  }

  /**
   * Récupère toutes les relances en attente
   */
  async getPendingReminders(nurseryId: string): Promise<DebtCollection[]> {
    const { data, error } = await this.supabase
      .from('debt_collection')
      .select(`
        *,
        family:family_id (id, family_name, phone, email),
        invoice:invoice_id (id, invoice_number, total_amount, remaining_amount, due_date)
      `)
      .eq('nursery_id', nurseryId)
      .eq('status', 'pending')
      .order('reminder_date', { ascending: true })

    if (error) throw error
    return data as DebtCollection[]
  }

  /**
   * Récupère toutes les relances d'une facture
   */
  async getByInvoice(invoiceId: string): Promise<DebtCollection[]> {
    const { data, error } = await this.supabase
      .from('debt_collection')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('reminder_date', { ascending: true })

    if (error) throw error
    return data as DebtCollection[]
  }

  /**
   * Récupère une relance par son ID
   */
  async getById(reminderId: string): Promise<DebtCollection> {
    const { data, error } = await this.supabase
      .from('debt_collection')
      .select(`
        *,
        family:family_id (id, family_name, phone, email, address, postal_code, city),
        invoice:invoice_id (id, invoice_number, total_amount, remaining_amount, due_date, invoice_date),
        nursery:nursery_id (id, name, address, postal_code, city, phone, email)
      `)
      .eq('id', reminderId)
      .single()

    if (error) throw error
    return data as DebtCollection
  }

  /**
   * Crée une nouvelle relance
   */
  async create(input: CreateReminderInput): Promise<DebtCollection> {
    // Récupère les informations de la facture
    const { data: invoice, error: invoiceError } = await this.supabase
      .from('invoice')
      .select('family_id, nursery_id, remaining_amount, due_date')
      .eq('id', input.invoice_id)
      .single()

    if (invoiceError) throw invoiceError

    // Calcule les jours de retard
    const today = new Date()
    const dueDate = new Date(invoice.due_date)
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

    const reminderData = {
      invoice_id: input.invoice_id,
      family_id: invoice.family_id,
      nursery_id: invoice.nursery_id,
      reminder_type: input.reminder_type,
      reminder_date: new Date().toISOString().split('T')[0],
      days_overdue: daysOverdue,
      reminder_method: input.reminder_method,
      amount_due: invoice.remaining_amount,
      status: 'pending',
      notes: input.notes,
      created_by_id: input.created_by_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await this.supabase
      .from('debt_collection')
      .insert(reminderData)
      .select()
      .single()

    if (error) throw error
    return data as DebtCollection
  }

  /**
   * Envoie une relance
   */
  async send(reminderId: string, sentById: string): Promise<DebtCollection> {
    const { data, error } = await this.supabase
      .from('debt_collection')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        sent_by_id: sentById,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reminderId)
      .eq('status', 'pending')
      .select()
      .single()

    if (error) throw error
    if (!data) throw new Error('Reminder not found or already sent')

    return data as DebtCollection
  }

  /**
   * Marque une relance comme acquittée par la famille
   */
  async acknowledge(
    reminderId: string,
    response?: string
  ): Promise<DebtCollection> {
    const { data, error } = await this.supabase
      .from('debt_collection')
      .update({
        status: 'acknowledged',
        family_response: response,
        family_response_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', reminderId)
      .select()
      .single()

    if (error) throw error
    return data as DebtCollection
  }

  /**
   * Marque une relance comme résolue (facture payée)
   */
  async resolve(reminderId: string): Promise<DebtCollection> {
    const { data, error } = await this.supabase
      .from('debt_collection')
      .update({
        status: 'resolved',
        updated_at: new Date().toISOString(),
      })
      .eq('id', reminderId)
      .select()
      .single()

    if (error) throw error
    return data as DebtCollection
  }

  /**
   * Escalade une relance (vers niveau supérieur)
   */
  async escalate(
    reminderId: string,
    notes?: string
  ): Promise<DebtCollection> {
    const { data, error } = await this.supabase
      .from('debt_collection')
      .update({
        status: 'escalated',
        notes: notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reminderId)
      .select()
      .single()

    if (error) throw error
    return data as DebtCollection
  }

  /**
   * Propose un plan de paiement échelonné
   */
  async proposePaymentPlan(
    reminderId: string,
    paymentPlan: PaymentPlan
  ): Promise<DebtCollection> {
    const { data, error } = await this.supabase
      .from('debt_collection')
      .update({
        payment_plan_proposed: true,
        payment_plan_details: paymentPlan,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reminderId)
      .select()
      .single()

    if (error) throw error
    return data as DebtCollection
  }

  /**
   * Accepte un plan de paiement
   */
  async acceptPaymentPlan(reminderId: string): Promise<DebtCollection> {
    const { data, error } = await this.supabase
      .from('debt_collection')
      .update({
        payment_plan_accepted: true,
        status: 'acknowledged',
        updated_at: new Date().toISOString(),
      })
      .eq('id', reminderId)
      .select()
      .single()

    if (error) throw error
    return data as DebtCollection
  }

  // =====================================================
  // AUTOMATISATION
  // =====================================================

  /**
   * Traite les relances automatiques pour toutes les factures impayées
   * À exécuter quotidiennement via cron job
   */
  async processAutomaticReminders(nurseryId: string): Promise<{
    first_reminders: number
    second_reminders: number
    final_notices: number
  }> {
    const today = new Date().toISOString().split('T')[0]

    // Récupère toutes les factures impayées
    const { data: overdueInvoices, error } = await this.supabase
      .from('invoice')
      .select('id, family_id, due_date, remaining_amount')
      .eq('nursery_id', nurseryId)
      .in('status', ['sent', 'partially_paid', 'overdue'])
      .lt('due_date', today)
      .gt('remaining_amount', 0)

    if (error) throw error

    let firstReminders = 0
    let secondReminders = 0
    let finalNotices = 0

    for (const invoice of overdueInvoices) {
      // Calcule les jours de retard
      const dueDate = new Date(invoice.due_date)
      const todayDate = new Date(today)
      const daysOverdue = Math.floor(
        (todayDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      // Récupère les relances existantes pour cette facture
      const existingReminders = await this.getByInvoice(invoice.id)

      // Détermine le type de relance à envoyer
      let reminderType: DebtCollection['reminder_type'] | null = null

      if (daysOverdue >= 30 && !existingReminders.some(r => r.reminder_type === 'final_notice')) {
        reminderType = 'final_notice'
        finalNotices++
      } else if (daysOverdue >= 15 && !existingReminders.some(r => r.reminder_type === 'second_reminder')) {
        reminderType = 'second_reminder'
        secondReminders++
      } else if (daysOverdue >= 7 && !existingReminders.some(r => r.reminder_type === 'first_reminder')) {
        reminderType = 'first_reminder'
        firstReminders++
      }

      // Crée la relance si nécessaire
      if (reminderType) {
        await this.create({
          invoice_id: invoice.id,
          reminder_type: reminderType,
          reminder_method: 'email',
          notes: 'Relance automatique',
          created_by_id: 'system',
        })

        // Met à jour le status de la facture
        await this.supabase
          .from('invoice')
          .update({ status: 'overdue' })
          .eq('id', invoice.id)
      }
    }

    return {
      first_reminders: firstReminders,
      second_reminders: secondReminders,
      final_notices: finalNotices,
    }
  }

  // =====================================================
  // UTILITAIRES
  // =====================================================

  /**
   * Récupère les statistiques des relances d'une crèche
   */
  async getStats(nurseryId: string, month?: string) {
    let query = this.supabase
      .from('debt_collection')
      .select('reminder_type, status, amount_due')
      .eq('nursery_id', nurseryId)

    if (month) {
      const startDate = `${month}-01`
      const endDate = `${month}-31`
      query = query
        .gte('reminder_date', startDate)
        .lte('reminder_date', endDate)
    }

    const { data, error } = await query

    if (error) throw error

    const stats = {
      total_reminders: data.length,
      total_amount_due: data.reduce((sum, r) => sum + r.amount_due, 0),
      pending: data.filter(r => r.status === 'pending').length,
      sent: data.filter(r => r.status === 'sent').length,
      resolved: data.filter(r => r.status === 'resolved').length,
      escalated: data.filter(r => r.status === 'escalated').length,
      first_reminders: data.filter(r => r.reminder_type === 'first_reminder').length,
      second_reminders: data.filter(r => r.reminder_type === 'second_reminder').length,
      final_notices: data.filter(r => r.reminder_type === 'final_notice').length,
      legal_actions: data.filter(r => r.reminder_type === 'legal_action').length,
    }

    return stats
  }

  /**
   * Récupère l'historique des relances pour une famille
   */
  async getFamilyReminderHistory(familyId: string): Promise<DebtCollection[]> {
    const { data, error } = await this.supabase
      .from('debt_collection')
      .select(`
        *,
        invoice:invoice_id (id, invoice_number, total_amount)
      `)
      .eq('family_id', familyId)
      .order('reminder_date', { ascending: false })

    if (error) throw error
    return data as DebtCollection[]
  }
}

// =====================================================
// EXPORT SINGLETON
// =====================================================

export const debtCollectionService = new DebtCollectionService()
