/**
 * Accounting Export Service
 * Gestion des exports comptables (FEC, CSV, Excel, etc.)
 */

import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

// =====================================================
// TYPES
// =====================================================

export interface AccountingExport {
  id: string
  nursery_id: string

  // Export info
  export_type: 'fec' | 'csv' | 'excel' | 'sage' | 'cegid' | 'ebp' | 'quickbooks' | 'custom'
  period_start: string
  period_end: string

  // Status
  status: 'pending' | 'processing' | 'completed' | 'failed'

  // Fichier généré
  file_name?: string
  file_url?: string
  file_size?: number // en bytes

  // Statistiques
  total_entries?: number
  total_invoices?: number
  total_payments?: number
  total_credit_notes?: number

  // Erreurs
  error_message?: string

  // Metadata
  created_at: string
  updated_at: string
  created_by_id?: string
  completed_at?: string
}

export interface CreateExportInput {
  nursery_id: string
  export_type: AccountingExport['export_type']
  period_start: string
  period_end: string
  created_by_id: string
}

export interface FECLine {
  JournalCode: string // Code journal (VT = Ventes, BQ = Banque)
  JournalLib: string // Libellé journal
  EcritureNum: string // Numéro d'écriture
  EcritureDate: string // Date écriture (YYYYMMDD)
  CompteNum: string // Numéro de compte
  CompteLib: string // Libellé du compte
  CompAuxNum: string // Compte auxiliaire (client/fournisseur)
  CompAuxLib: string // Libellé compte auxiliaire
  PieceRef: string // Référence de la pièce
  PieceDate: string // Date de la pièce (YYYYMMDD)
  EcritureLib: string // Libellé de l'écriture
  Debit: string // Montant débit
  Credit: string // Montant crédit
  EcritureLet: string // Lettrage
  DateLet: string // Date lettrage
  ValidDate: string // Date validation (YYYYMMDD)
  Montantdevise: string // Montant en devise
  Idevise: string // Code devise
}

export interface CSVExportOptions {
  delimiter?: string // Default: ','
  include_headers?: boolean // Default: true
  date_format?: string // Default: 'YYYY-MM-DD'
}

// =====================================================
// SERVICE CLASS
// =====================================================

class AccountingExportService {
  private supabase: SupabaseClient

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || createClient()
  }

  // =====================================================
  // CRUD
  // =====================================================

  /**
   * Récupère tous les exports d'une crèche
   */
  async getByNursery(nurseryId: string): Promise<AccountingExport[]> {
    const { data, error } = await this.supabase
      .from('accounting_export')
      .select('*')
      .eq('nursery_id', nurseryId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as AccountingExport[]
  }

  /**
   * Récupère un export par son ID
   */
  async getById(exportId: string): Promise<AccountingExport> {
    const { data, error } = await this.supabase
      .from('accounting_export')
      .select('*')
      .eq('id', exportId)
      .single()

    if (error) throw error
    return data as AccountingExport
  }

  /**
   * Crée un nouvel export
   */
  async create(input: CreateExportInput): Promise<AccountingExport> {
    const exportData = {
      ...input,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await this.supabase
      .from('accounting_export')
      .insert(exportData)
      .select()
      .single()

    if (error) throw error
    return data as AccountingExport
  }

  /**
   * Met à jour le status d'un export
   */
  async updateStatus(
    exportId: string,
    status: AccountingExport['status'],
    fileUrl?: string,
    fileSize?: number,
    errorMessage?: string
  ): Promise<AccountingExport> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    }

    if (fileUrl) updateData.file_url = fileUrl
    if (fileSize) updateData.file_size = fileSize
    if (errorMessage) updateData.error_message = errorMessage
    if (status === 'completed') updateData.completed_at = new Date().toISOString()

    const { data, error } = await this.supabase
      .from('accounting_export')
      .update(updateData)
      .eq('id', exportId)
      .select()
      .single()

    if (error) throw error
    return data as AccountingExport
  }

  // =====================================================
  // EXPORT FEC (Format Fiscal Français)
  // =====================================================

  /**
   * Génère un export FEC pour une année fiscale
   * Format obligatoire pour contrôle fiscal en France
   */
  async generateFEC(
    nurseryId: string,
    year: number,
    createdById: string
  ): Promise<AccountingExport> {
    const periodStart = `${year}-01-01`
    const periodEnd = `${year}-12-31`

    // Crée l'export
    const exportRecord = await this.create({
      nursery_id: nurseryId,
      export_type: 'fec',
      period_start: periodStart,
      period_end: periodEnd,
      created_by_id: createdById,
    })

    try {
      // Marque comme en cours de traitement
      await this.updateStatus(exportRecord.id, 'processing')

      // Récupère les écritures comptables
      const { data: entries, error: entriesError } = await this.supabase
        .from('ledger_entry')
        .select('*')
        .eq('nursery_id', nurseryId)
        .gte('entry_date', periodStart)
        .lte('entry_date', periodEnd)
        .order('entry_date', { ascending: true })
        .order('created_at', { ascending: true })

      if (entriesError) throw entriesError

      // Convertit en format FEC
      const fecLines: FECLine[] = entries.map(entry => this.convertToFECLine(entry))

      // Génère le fichier FEC (format texte délimité par |)
      const fecContent = this.generateFECContent(fecLines)

      // Upload le fichier vers Supabase Storage
      const fileName = `FEC_${nurseryId}_${year}.txt`
      const filePath = `accounting-exports/${nurseryId}/${fileName}`

      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('documents')
        .upload(filePath, fecContent, {
          contentType: 'text/plain',
          upsert: true,
        })

      if (uploadError) throw uploadError

      // Récupère l'URL publique
      const { data: urlData } = this.supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      // Met à jour l'export avec le fichier
      await this.updateStatus(
        exportRecord.id,
        'completed',
        urlData.publicUrl,
        new Blob([fecContent]).size
      )

      // Met à jour les statistiques
      await this.supabase
        .from('accounting_export')
        .update({
          file_name: fileName,
          total_entries: entries.length,
        })
        .eq('id', exportRecord.id)

      return await this.getById(exportRecord.id)
    } catch (error: any) {
      // Marque l'export comme échoué
      await this.updateStatus(exportRecord.id, 'failed', undefined, undefined, error.message)
      throw error
    }
  }

  /**
   * Convertit une écriture comptable en ligne FEC
   */
  private convertToFECLine(entry: any): FECLine {
    return {
      JournalCode: entry.journal_code || 'VT',
      JournalLib: entry.journal_label || 'Ventes',
      EcritureNum: entry.entry_number || '',
      EcritureDate: entry.entry_date.replace(/-/g, ''),
      CompteNum: entry.account_number || '',
      CompteLib: entry.account_label || '',
      CompAuxNum: entry.auxiliary_account || '',
      CompAuxLib: entry.auxiliary_label || '',
      PieceRef: entry.document_reference || '',
      PieceDate: entry.document_date?.replace(/-/g, '') || '',
      EcritureLib: entry.description || '',
      Debit: entry.debit_amount ? entry.debit_amount.toFixed(2).replace('.', ',') : '0,00',
      Credit: entry.credit_amount ? entry.credit_amount.toFixed(2).replace('.', ',') : '0,00',
      EcritureLet: entry.reconciliation_code || '',
      DateLet: entry.reconciliation_date?.replace(/-/g, '') || '',
      ValidDate: entry.validation_date?.replace(/-/g, '') || entry.entry_date.replace(/-/g, ''),
      Montantdevise: entry.currency_amount?.toFixed(2).replace('.', ',') || '',
      Idevise: entry.currency_code || 'EUR',
    }
  }

  /**
   * Génère le contenu texte du fichier FEC
   */
  private generateFECContent(lines: FECLine[]): string {
    // En-tête FEC
    const headers = [
      'JournalCode',
      'JournalLib',
      'EcritureNum',
      'EcritureDate',
      'CompteNum',
      'CompteLib',
      'CompAuxNum',
      'CompAuxLib',
      'PieceRef',
      'PieceDate',
      'EcritureLib',
      'Debit',
      'Credit',
      'EcritureLet',
      'DateLet',
      'ValidDate',
      'Montantdevise',
      'Idevise',
    ]

    const headerLine = headers.join('|')

    // Lignes de données
    const dataLines = lines.map(line =>
      [
        line.JournalCode,
        line.JournalLib,
        line.EcritureNum,
        line.EcritureDate,
        line.CompteNum,
        line.CompteLib,
        line.CompAuxNum,
        line.CompAuxLib,
        line.PieceRef,
        line.PieceDate,
        line.EcritureLib,
        line.Debit,
        line.Credit,
        line.EcritureLet,
        line.DateLet,
        line.ValidDate,
        line.Montantdevise,
        line.Idevise,
      ].join('|')
    )

    return [headerLine, ...dataLines].join('\n')
  }

  // =====================================================
  // EXPORT CSV
  // =====================================================

  /**
   * Génère un export CSV
   */
  async generateCSV(
    nurseryId: string,
    periodStart: string,
    periodEnd: string,
    createdById: string,
    options?: CSVExportOptions
  ): Promise<AccountingExport> {
    const delimiter = options?.delimiter || ','
    const includeHeaders = options?.include_headers !== false

    // Crée l'export
    const exportRecord = await this.create({
      nursery_id: nurseryId,
      export_type: 'csv',
      period_start: periodStart,
      period_end: periodEnd,
      created_by_id: createdById,
    })

    try {
      // Marque comme en cours
      await this.updateStatus(exportRecord.id, 'processing')

      // Récupère les données (factures, paiements, avoirs)
      const { data: invoices } = await this.supabase
        .from('invoice')
        .select(`
          *,
          family:family_id (family_name)
        `)
        .eq('nursery_id', nurseryId)
        .gte('invoice_date', periodStart)
        .lte('invoice_date', periodEnd)
        .order('invoice_date', { ascending: true })

      const { data: payments } = await this.supabase
        .from('payment')
        .select(`
          *,
          family:family_id (family_name),
          invoice:invoice_id (invoice_number)
        `)
        .eq('nursery_id', nurseryId)
        .gte('payment_date', periodStart)
        .lte('payment_date', periodEnd)
        .order('payment_date', { ascending: true })

      // Génère le CSV
      let csvContent = ''

      if (includeHeaders) {
        csvContent += [
          'Type',
          'Date',
          'Reference',
          'Family',
          'Description',
          'Amount',
          'Status',
        ].join(delimiter) + '\n'
      }

      // Ajoute les factures
      invoices?.forEach(inv => {
        csvContent += [
          'Invoice',
          inv.invoice_date,
          inv.invoice_number,
          inv.family?.family_name || '',
          `Period ${inv.billing_period_start} to ${inv.billing_period_end}`,
          inv.total_amount,
          inv.status,
        ].join(delimiter) + '\n'
      })

      // Ajoute les paiements
      payments?.forEach(pay => {
        csvContent += [
          'Payment',
          pay.payment_date,
          pay.payment_number,
          pay.family?.family_name || '',
          `Payment for ${pay.invoice?.invoice_number || 'N/A'}`,
          pay.amount,
          pay.status,
        ].join(delimiter) + '\n'
      })

      // Upload le fichier
      const fileName = `export_${nurseryId}_${periodStart}_${periodEnd}.csv`
      const filePath = `accounting-exports/${nurseryId}/${fileName}`

      const { error: uploadError } = await this.supabase.storage
        .from('documents')
        .upload(filePath, csvContent, {
          contentType: 'text/csv',
          upsert: true,
        })

      if (uploadError) throw uploadError

      // Récupère l'URL
      const { data: urlData } = this.supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      // Met à jour l'export
      await this.updateStatus(
        exportRecord.id,
        'completed',
        urlData.publicUrl,
        new Blob([csvContent]).size
      )

      await this.supabase
        .from('accounting_export')
        .update({
          file_name: fileName,
          total_invoices: invoices?.length || 0,
          total_payments: payments?.length || 0,
          total_entries: (invoices?.length || 0) + (payments?.length || 0),
        })
        .eq('id', exportRecord.id)

      return await this.getById(exportRecord.id)
    } catch (error: any) {
      await this.updateStatus(exportRecord.id, 'failed', undefined, undefined, error.message)
      throw error
    }
  }

  // =====================================================
  // UTILITAIRES
  // =====================================================

  /**
   * Supprime un export et son fichier
   */
  async delete(exportId: string): Promise<void> {
    // Récupère l'export
    const exportRecord = await this.getById(exportId)

    // Supprime le fichier si existe
    if (exportRecord.file_url) {
      const fileName = exportRecord.file_name
      if (fileName) {
        const filePath = `accounting-exports/${exportRecord.nursery_id}/${fileName}`
        await this.supabase.storage.from('documents').remove([filePath])
      }
    }

    // Supprime l'enregistrement
    const { error } = await this.supabase
      .from('accounting_export')
      .delete()
      .eq('id', exportId)

    if (error) throw error
  }

  /**
   * Télécharge un export
   */
  async download(exportId: string): Promise<Blob> {
    const exportRecord = await this.getById(exportId)

    if (!exportRecord.file_url) {
      throw new Error('No file available for this export')
    }

    const response = await fetch(exportRecord.file_url)
    if (!response.ok) {
      throw new Error('Failed to download export file')
    }

    return await response.blob()
  }
}

// =====================================================
// EXPORT SINGLETON
// =====================================================

export const accountingExportService = new AccountingExportService()
