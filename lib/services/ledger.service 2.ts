/**
 * Ledger Service
 * Gestion des écritures comptables (journal général, balance)
 */

import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

// =====================================================
// TYPES
// =====================================================

export interface LedgerEntry {
  id: string
  nursery_id: string

  // Type d'écriture
  entry_type: 'invoice' | 'payment' | 'credit_note' | 'expense' | 'adjustment' | 'opening_balance' | 'closing_balance'

  // Références
  invoice_id?: string
  payment_id?: string
  credit_note_id?: string

  // Journal
  journal_code: string // VT (Ventes), BQ (Banque), OD (Opérations diverses)
  journal_label: string
  entry_number: string // Numéro d'écriture unique
  entry_date: string

  // Comptes
  account_number: string // Ex: 411000 (Clients), 512000 (Banque)
  account_label: string
  auxiliary_account?: string // Compte auxiliaire (client/fournisseur)
  auxiliary_label?: string

  // Montants
  debit_amount: number
  credit_amount: number

  // Description
  description: string

  // Document
  document_reference?: string // N° facture, paiement, etc.
  document_date?: string

  // Lettrage (rapprochement)
  reconciliation_code?: string // Pour lier débit et crédit
  reconciliation_date?: string
  is_reconciled: boolean

  // Validation
  is_validated: boolean
  validation_date?: string
  validated_by_id?: string

  // Devise (optionnel)
  currency_code?: string
  currency_amount?: number
  exchange_rate?: number

  // Metadata
  created_at: string
  updated_at: string
  created_by_id?: string
}

export interface CreateLedgerEntryInput {
  nursery_id: string
  entry_type: LedgerEntry['entry_type']
  journal_code: string
  entry_date: string
  account_number: string
  account_label: string
  debit_amount: number
  credit_amount: number
  description: string
  document_reference?: string
  document_date?: string
  auxiliary_account?: string
  auxiliary_label?: string
  invoice_id?: string
  payment_id?: string
  credit_note_id?: string
  created_by_id: string
}

export interface LedgerFilters {
  entry_type?: LedgerEntry['entry_type']
  journal_code?: string
  account_number?: string
  date_from?: string
  date_to?: string
  is_validated?: boolean
  is_reconciled?: boolean
}

export interface AccountBalance {
  account_number: string
  account_label: string
  total_debit: number
  total_credit: number
  balance: number
  balance_type: 'debit' | 'credit'
}

export interface TrialBalance {
  period_start: string
  period_end: string
  accounts: AccountBalance[]
  total_debit: number
  total_credit: number
  is_balanced: boolean
}

// =====================================================
// SERVICE CLASS
// =====================================================

class LedgerService {
  private supabase: SupabaseClient

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || createClient()
  }

  // =====================================================
  // CRUD
  // =====================================================

  /**
   * Récupère toutes les écritures d'une crèche avec filtres
   */
  async getEntries(nurseryId: string, filters?: LedgerFilters): Promise<LedgerEntry[]> {
    let query = this.supabase
      .from('ledger_entry')
      .select('*')
      .eq('nursery_id', nurseryId)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (filters?.entry_type) {
      query = query.eq('entry_type', filters.entry_type)
    }

    if (filters?.journal_code) {
      query = query.eq('journal_code', filters.journal_code)
    }

    if (filters?.account_number) {
      query = query.eq('account_number', filters.account_number)
    }

    if (filters?.date_from) {
      query = query.gte('entry_date', filters.date_from)
    }

    if (filters?.date_to) {
      query = query.lte('entry_date', filters.date_to)
    }

    if (filters?.is_validated !== undefined) {
      query = query.eq('is_validated', filters.is_validated)
    }

    if (filters?.is_reconciled !== undefined) {
      query = query.eq('is_reconciled', filters.is_reconciled)
    }

    const { data, error } = await query

    if (error) throw error
    return data as LedgerEntry[]
  }

  /**
   * Récupère une écriture par son ID
   */
  async getById(entryId: string): Promise<LedgerEntry> {
    const { data, error } = await this.supabase
      .from('ledger_entry')
      .select('*')
      .eq('id', entryId)
      .single()

    if (error) throw error
    return data as LedgerEntry
  }

  /**
   * Crée une nouvelle écriture comptable
   */
  async createEntry(input: CreateLedgerEntryInput): Promise<LedgerEntry> {
    // Génère le numéro d'écriture
    const entryNumber = await this.generateEntryNumber(
      input.nursery_id,
      input.journal_code,
      input.entry_date
    )

    // Détermine le libellé du journal
    const journalLabel = this.getJournalLabel(input.journal_code)

    const entryData = {
      ...input,
      entry_number: entryNumber,
      journal_label: journalLabel,
      is_reconciled: false,
      is_validated: false,
      currency_code: 'EUR',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await this.supabase
      .from('ledger_entry')
      .insert(entryData)
      .select()
      .single()

    if (error) throw error
    return data as LedgerEntry
  }

  /**
   * Crée une paire d'écritures (débit/crédit)
   */
  async createDoubleEntry(
    nurseryId: string,
    entryType: LedgerEntry['entry_type'],
    journalCode: string,
    entryDate: string,
    debitAccount: { number: string; label: string },
    creditAccount: { number: string; label: string },
    amount: number,
    description: string,
    documentReference?: string,
    createdById?: string
  ): Promise<{ debitEntry: LedgerEntry; creditEntry: LedgerEntry }> {
    // Crée l'écriture au débit
    const debitEntry = await this.createEntry({
      nursery_id: nurseryId,
      entry_type: entryType,
      journal_code: journalCode,
      entry_date: entryDate,
      account_number: debitAccount.number,
      account_label: debitAccount.label,
      debit_amount: amount,
      credit_amount: 0,
      description: description,
      document_reference: documentReference,
      created_by_id: createdById || 'system',
    })

    // Crée l'écriture au crédit
    const creditEntry = await this.createEntry({
      nursery_id: nurseryId,
      entry_type: entryType,
      journal_code: journalCode,
      entry_date: entryDate,
      account_number: creditAccount.number,
      account_label: creditAccount.label,
      debit_amount: 0,
      credit_amount: amount,
      description: description,
      document_reference: documentReference,
      created_by_id: createdById || 'system',
    })

    // Lettre les deux écritures ensemble
    const reconciliationCode = `${debitEntry.id.substring(0, 8)}`
    await this.reconcile([debitEntry.id, creditEntry.id], reconciliationCode)

    return { debitEntry, creditEntry }
  }

  /**
   * Valide une écriture
   */
  async validate(entryId: string, validatedById: string): Promise<LedgerEntry> {
    const { data, error } = await this.supabase
      .from('ledger_entry')
      .update({
        is_validated: true,
        validation_date: new Date().toISOString(),
        validated_by_id: validatedById,
        updated_at: new Date().toISOString(),
      })
      .eq('id', entryId)
      .select()
      .single()

    if (error) throw error
    return data as LedgerEntry
  }

  /**
   * Lettre (rapproche) plusieurs écritures ensemble
   */
  async reconcile(entryIds: string[], reconciliationCode: string): Promise<void> {
    const { error } = await this.supabase
      .from('ledger_entry')
      .update({
        is_reconciled: true,
        reconciliation_code: reconciliationCode,
        reconciliation_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .in('id', entryIds)

    if (error) throw error
  }

  /**
   * Délettre (annule le rapprochement) des écritures
   */
  async unreconcile(reconciliationCode: string): Promise<void> {
    const { error } = await this.supabase
      .from('ledger_entry')
      .update({
        is_reconciled: false,
        reconciliation_code: null,
        reconciliation_date: null,
        updated_at: new Date().toISOString(),
      })
      .eq('reconciliation_code', reconciliationCode)

    if (error) throw error
  }

  // =====================================================
  // BALANCE & REPORTING
  // =====================================================

  /**
   * Récupère le solde d'un compte
   */
  async getAccountBalance(
    nurseryId: string,
    accountNumber: string,
    date?: string
  ): Promise<AccountBalance> {
    let query = this.supabase
      .from('ledger_entry')
      .select('account_label, debit_amount, credit_amount')
      .eq('nursery_id', nurseryId)
      .eq('account_number', accountNumber)
      .eq('is_validated', true)

    if (date) {
      query = query.lte('entry_date', date)
    }

    const { data, error } = await query

    if (error) throw error

    const totalDebit = data.reduce((sum, entry) => sum + entry.debit_amount, 0)
    const totalCredit = data.reduce((sum, entry) => sum + entry.credit_amount, 0)
    const balance = totalDebit - totalCredit

    return {
      account_number: accountNumber,
      account_label: data[0]?.account_label || '',
      total_debit: totalDebit,
      total_credit: totalCredit,
      balance: Math.abs(balance),
      balance_type: balance >= 0 ? 'debit' : 'credit',
    }
  }

  /**
   * Génère la balance de vérification (trial balance)
   */
  async getTrialBalance(
    nurseryId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<TrialBalance> {
    // Récupère toutes les écritures validées de la période
    const entries = await this.getEntries(nurseryId, {
      date_from: periodStart,
      date_to: periodEnd,
      is_validated: true,
    })

    // Groupe par compte
    const accountMap = new Map<string, AccountBalance>()

    entries.forEach(entry => {
      const existing = accountMap.get(entry.account_number)

      if (existing) {
        existing.total_debit += entry.debit_amount
        existing.total_credit += entry.credit_amount
      } else {
        accountMap.set(entry.account_number, {
          account_number: entry.account_number,
          account_label: entry.account_label,
          total_debit: entry.debit_amount,
          total_credit: entry.credit_amount,
          balance: 0,
          balance_type: 'debit',
        })
      }
    })

    // Calcule les soldes
    const accounts: AccountBalance[] = []
    let totalDebit = 0
    let totalCredit = 0

    accountMap.forEach(account => {
      const balance = account.total_debit - account.total_credit
      account.balance = Math.abs(balance)
      account.balance_type = balance >= 0 ? 'debit' : 'credit'

      totalDebit += account.total_debit
      totalCredit += account.total_credit

      accounts.push(account)
    })

    // Trie par numéro de compte
    accounts.sort((a, b) => a.account_number.localeCompare(b.account_number))

    return {
      period_start: periodStart,
      period_end: periodEnd,
      accounts,
      total_debit: totalDebit,
      total_credit: totalCredit,
      is_balanced: Math.abs(totalDebit - totalCredit) < 0.01, // Tolérance de 1 centime
    }
  }

  /**
   * Récupère le grand livre (general ledger) d'un compte
   */
  async getGeneralLedger(
    nurseryId: string,
    accountNumber: string,
    periodStart: string,
    periodEnd: string
  ): Promise<LedgerEntry[]> {
    return await this.getEntries(nurseryId, {
      account_number: accountNumber,
      date_from: periodStart,
      date_to: periodEnd,
      is_validated: true,
    })
  }

  // =====================================================
  // AUTOMATISATION - CRÉATION ÉCRITURES DEPUIS DOCUMENTS
  // =====================================================

  /**
   * Crée les écritures comptables depuis une facture
   */
  async createEntriesFromInvoice(invoiceId: string, createdById: string): Promise<void> {
    // Récupère la facture
    const { data: invoice, error } = await this.supabase
      .from('invoice')
      .select('*')
      .eq('id', invoiceId)
      .single()

    if (error) throw error

    // Crée l'écriture double (Débit: Client 411000, Crédit: Ventes 707000)
    await this.createDoubleEntry(
      invoice.nursery_id,
      'invoice',
      'VT', // Journal Ventes
      invoice.invoice_date,
      { number: '411000', label: 'Clients' },
      { number: '707000', label: 'Ventes de prestations de services' },
      invoice.total_amount,
      `Facture ${invoice.invoice_number}`,
      invoice.invoice_number,
      createdById
    )
  }

  /**
   * Crée les écritures comptables depuis un paiement
   */
  async createEntriesFromPayment(paymentId: string, createdById: string): Promise<void> {
    // Récupère le paiement
    const { data: payment, error } = await this.supabase
      .from('payment')
      .select('*')
      .eq('id', paymentId)
      .single()

    if (error) throw error

    // Crée l'écriture double (Débit: Banque 512000, Crédit: Client 411000)
    await this.createDoubleEntry(
      payment.nursery_id,
      'payment',
      'BQ', // Journal Banque
      payment.payment_date,
      { number: '512000', label: 'Banque' },
      { number: '411000', label: 'Clients' },
      payment.amount,
      `Paiement ${payment.payment_number}`,
      payment.payment_number,
      createdById
    )
  }

  /**
   * Crée les écritures comptables depuis un avoir
   */
  async createEntriesFromCreditNote(creditNoteId: string, createdById: string): Promise<void> {
    // Récupère l'avoir
    const { data: creditNote, error } = await this.supabase
      .from('credit_note')
      .select('*')
      .eq('id', creditNoteId)
      .single()

    if (error) throw error

    // Crée l'écriture double (Débit: Ventes 707000, Crédit: Client 411000)
    await this.createDoubleEntry(
      creditNote.nursery_id,
      'credit_note',
      'VT', // Journal Ventes
      creditNote.credit_note_date,
      { number: '707000', label: 'Ventes de prestations de services' },
      { number: '411000', label: 'Clients' },
      creditNote.amount,
      `Avoir ${creditNote.credit_note_number}`,
      creditNote.credit_note_number,
      createdById
    )
  }

  // =====================================================
  // UTILITAIRES
  // =====================================================

  /**
   * Génère un numéro d'écriture unique
   * Format: {JOURNAL}-{YYYYMMDD}-{SEQ}
   */
  private async generateEntryNumber(
    nurseryId: string,
    journalCode: string,
    entryDate: string
  ): Promise<string> {
    const dateStr = entryDate.replace(/-/g, '')

    // Compte les écritures du même journal pour la même date
    const { data, error } = await this.supabase
      .from('ledger_entry')
      .select('id')
      .eq('nursery_id', nurseryId)
      .eq('journal_code', journalCode)
      .eq('entry_date', entryDate)

    if (error) throw error

    const sequence = (data?.length || 0) + 1
    const sequenceStr = String(sequence).padStart(4, '0')

    return `${journalCode}-${dateStr}-${sequenceStr}`
  }

  /**
   * Retourne le libellé du journal selon son code
   */
  private getJournalLabel(journalCode: string): string {
    const journalLabels: Record<string, string> = {
      VT: 'Ventes',
      BQ: 'Banque',
      OD: 'Opérations diverses',
      AC: 'Achats',
      CA: 'Caisse',
      AN: 'À nouveaux',
    }

    return journalLabels[journalCode] || journalCode
  }
}

// =====================================================
// EXPORT SINGLETON
// =====================================================

export const ledgerService = new LedgerService()
