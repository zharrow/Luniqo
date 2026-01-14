import { createClient } from '@/lib/supabase/client'

const supabase: any = createClient()

// ============================================================
// TYPES & INTERFACES
// ============================================================

export interface CAFDocument {
  id: string
  document_number: string
  nursery_id: string
  family_id: string
  child_id: string
  document_type: CAFDocumentType
  month: number
  year: number
  attendance_data: CAFAttendanceData
  payment_data: CAFPaymentData | null
  generated_at: string
  generated_by_id: string
  pdf_url: string | null
  is_sent: boolean
  sent_at: string | null
  created_at: string
  updated_at: string
}

export type CAFDocumentType = 'attendance_certificate' | 'payment_proof'

export interface CAFAttendanceData {
  child_name: string
  birth_date: string
  attendance_days: number
  total_days_in_month: number
  attendance_rate: number
  daily_entries: Array<{
    date: string
    present: boolean
    hours: number | null
  }>
}

export interface CAFPaymentData {
  invoice_id: string
  invoice_number: string
  invoice_date: string
  total_amount: number
  caf_contribution: number
  family_contribution: number
  payment_date: string
  payment_method: string
}

export interface GenerateAttendanceCertificateInput {
  nursery_id: string
  family_id: string
  child_id: string
  month: number
  year: number
  generated_by_id: string
}

export interface GeneratePaymentProofInput {
  nursery_id: string
  family_id: string
  invoice_id: string
  month: number
  year: number
  generated_by_id: string
}

// ============================================================
// CAF DOCUMENT SERVICE
// ============================================================

export class CAFDocumentService {
  private getClient(): any {
    return createClient()
  }

  // ============================================================
  // ATTENDANCE CERTIFICATES
  // ============================================================

  /**
   * Generate monthly attendance certificate for CAF
   */
  async generateAttendanceCertificate(input: GenerateAttendanceCertificateInput): Promise<CAFDocument> {
    const supabase = this.getClient()

    // Check if document already exists
    const existing = await this.getAttendanceCertificate(input.child_id, input.month, input.year)
    if (existing) {
      throw new Error('Attendance certificate already exists for this child/month/year')
    }

    // Get child info
    const { data: child, error: childError } = await supabase
      .from('child')
      .select('first_name, last_name, birth_date')
      .eq('id', input.child_id)
      .single()

    if (childError) throw childError

    // Get attendance records for the month
    const attendanceData = await this.calculateMonthlyAttendance(input.child_id, input.month, input.year)

    // Generate document number
    const documentNumber = await this.generateDocumentNumber(input.nursery_id, input.year, input.month)

    // Create document
    const { data, error } = await supabase
      .from('caf_document')
      .insert({
        document_number: documentNumber,
        nursery_id: input.nursery_id,
        family_id: input.family_id,
        child_id: input.child_id,
        document_type: 'attendance_certificate',
        month: input.month,
        year: input.year,
        attendance_data: attendanceData,
        payment_data: null,
        generated_at: new Date().toISOString(),
        generated_by_id: input.generated_by_id,
        is_sent: false
      })
      .select()
      .single()

    if (error) throw error

    return data as CAFDocument
  }

  /**
   * Calculate monthly attendance data for a child
   */
  private async calculateMonthlyAttendance(
    childId: string,
    month: number,
    year: number
  ): Promise<CAFAttendanceData> {
    const supabase = this.getClient()

    // Get child info
    const { data: child, error: childError } = await supabase
      .from('child')
      .select('first_name, last_name, birth_date')
      .eq('id', childId)
      .single()

    if (childError) throw childError

    // Get attendance records for the month
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0]
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    const { data: attendanceRecords, error: attendanceError } = await supabase
      .from('attendance')
      .select('*')
      .eq('child_id', childId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })

    if (attendanceError) throw attendanceError

    // Calculate total days in month
    const totalDaysInMonth = new Date(year, month, 0).getDate()

    // Build daily entries
    const dailyEntries: Array<{ date: string; present: boolean; hours: number | null }> = []
    let attendanceDays = 0

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const date = new Date(year, month - 1, day).toISOString().split('T')[0]
      const record = attendanceRecords.find((r: any) => r.date === date)

      const isPresent = record && record.status === 'PRESENT'
      const hours = record?.total_hours || null

      dailyEntries.push({
        date,
        present: isPresent,
        hours
      })

      if (isPresent) {
        attendanceDays++
      }
    }

    const attendanceRate = (attendanceDays / totalDaysInMonth) * 100

    return {
      child_name: `${child.first_name} ${child.last_name}`,
      birth_date: child.birth_date,
      attendance_days: attendanceDays,
      total_days_in_month: totalDaysInMonth,
      attendance_rate: Math.round(attendanceRate * 10) / 10,
      daily_entries: dailyEntries
    }
  }

  // ============================================================
  // PAYMENT PROOFS
  // ============================================================

  /**
   * Generate payment proof for CAF
   */
  async generatePaymentProof(input: GeneratePaymentProofInput): Promise<CAFDocument> {
    const supabase = this.getClient()

    // Get invoice info
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoice')
      .select(`
        *,
        payments:payment(payment_date, payment_method, amount)
      `)
      .eq('id', input.invoice_id)
      .single()

    if (invoiceError) throw invoiceError

    if (invoice.status !== 'PAID') {
      throw new Error('Invoice must be paid to generate payment proof')
    }

    // Get child from invoice
    const { data: invoiceItems, error: itemsError } = await supabase
      .from('invoice_item')
      .select('child_id')
      .eq('invoice_id', input.invoice_id)
      .limit(1)

    if (itemsError) throw itemsError

    const childId = invoiceItems[0]?.child_id

    if (!childId) {
      throw new Error('No child found for this invoice')
    }

    // Get latest payment
    const latestPayment = invoice.payments.sort((a: any, b: any) =>
      new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
    )[0]

    // Build payment data
    const paymentData: CAFPaymentData = {
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.invoice_date,
      total_amount: invoice.total_amount,
      caf_contribution: invoice.caf_contribution,
      family_contribution: invoice.total_amount - invoice.caf_contribution,
      payment_date: latestPayment.payment_date,
      payment_method: latestPayment.payment_method
    }

    // Generate document number
    const documentNumber = await this.generateDocumentNumber(input.nursery_id, input.year, input.month)

    // Create document
    const { data, error } = await supabase
      .from('caf_document')
      .insert({
        document_number: documentNumber,
        nursery_id: input.nursery_id,
        family_id: input.family_id,
        child_id: childId,
        document_type: 'payment_proof',
        month: input.month,
        year: input.year,
        attendance_data: null,
        payment_data: paymentData,
        generated_at: new Date().toISOString(),
        generated_by_id: input.generated_by_id,
        is_sent: false
      })
      .select()
      .single()

    if (error) throw error

    return data as CAFDocument
  }

  // ============================================================
  // CRUD OPERATIONS
  // ============================================================

  /**
   * Get document by ID
   */
  async getById(documentId: string): Promise<CAFDocument | null> {
    const supabase = this.getClient()

    const { data, error } = await supabase
      .from('caf_document')
      .select(`
        *,
        nursery:nursery(id, name, address, city, postal_code),
        family:family(id, name),
        child:child(id, first_name, last_name),
        generated_by:profiles!generated_by_id(id, first_name, last_name)
      `)
      .eq('id', documentId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data as any
  }

  /**
   * Get attendance certificate for child/month/year
   */
  async getAttendanceCertificate(
    childId: string,
    month: number,
    year: number
  ): Promise<CAFDocument | null> {
    const supabase = this.getClient()

    const { data, error } = await supabase
      .from('caf_document')
      .select('*')
      .eq('child_id', childId)
      .eq('document_type', 'attendance_certificate')
      .eq('month', month)
      .eq('year', year)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data as CAFDocument
  }

  /**
   * Get all documents for a family
   */
  async getByFamily(familyId: string): Promise<CAFDocument[]> {
    const supabase = this.getClient()

    const { data, error } = await supabase
      .from('caf_document')
      .select(`
        *,
        child:child(id, first_name, last_name)
      `)
      .eq('family_id', familyId)
      .order('year', { ascending: false })
      .order('month', { ascending: false })

    if (error) throw error
    return (data as any[]) || []
  }

  /**
   * Get all documents for a child
   */
  async getByChild(childId: string): Promise<CAFDocument[]> {
    const supabase = this.getClient()

    const { data, error } = await supabase
      .from('caf_document')
      .select('*')
      .eq('child_id', childId)
      .order('year', { ascending: false })
      .order('month', { ascending: false })

    if (error) throw error
    return (data as CAFDocument[]) || []
  }

  /**
   * Get all documents for a nursery
   */
  async getByNursery(nurseryId: string, year?: number, month?: number): Promise<CAFDocument[]> {
    const supabase = this.getClient()

    let query = supabase
      .from('caf_document')
      .select(`
        *,
        family:family(id, name),
        child:child(id, first_name, last_name)
      `)
      .eq('nursery_id', nurseryId)
      .order('generated_at', { ascending: false })

    if (year) {
      query = query.eq('year', year)
    }

    if (month) {
      query = query.eq('month', month)
    }

    const { data, error } = await query

    if (error) throw error
    return (data as any[]) || []
  }

  /**
   * Update document PDF URL
   */
  async updatePdfUrl(documentId: string, pdfUrl: string): Promise<CAFDocument> {
    const supabase = this.getClient()

    const { data, error } = await supabase
      .from('caf_document')
      .update({
        pdf_url: pdfUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)
      .select()
      .single()

    if (error) throw error
    return data as CAFDocument
  }

  /**
   * Mark document as sent
   */
  async markAsSent(documentId: string): Promise<CAFDocument> {
    const supabase = this.getClient()

    const { data, error } = await supabase
      .from('caf_document')
      .update({
        is_sent: true,
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)
      .select()
      .single()

    if (error) throw error
    return data as CAFDocument
  }

  /**
   * Delete a document
   */
  async delete(documentId: string): Promise<void> {
    const supabase = this.getClient()

    const { error } = await supabase
      .from('caf_document')
      .delete()
      .eq('id', documentId)

    if (error) throw error
  }

  // ============================================================
  // SENDING & NOTIFICATIONS
  // ============================================================

  /**
   * Send document to family (email + app notification)
   */
  async send(documentId: string): Promise<void> {
    const supabase = this.getClient()

    const document = await this.getById(documentId)
    if (!document) throw new Error('Document not found')

    // Get guardians for this family
    const { data: guardians, error: guardiansError } = await supabase
      .from('guardian')
      .select('id, email, first_name, last_name')
      .eq('family_id', document.family_id)

    if (guardiansError) throw guardiansError

    const documentTypeName = document.document_type === 'attendance_certificate'
      ? 'Attestation de présence CAF'
      : 'Justificatif de paiement CAF'

    // Create notifications for guardians
    for (const guardian of guardians) {
      // Create in-app notification
      await supabase
        .from('parent_notification')
        .insert({
          guardian_id: guardian.id,
          notification_type: 'document_uploaded',
          title: `${documentTypeName} disponible`,
          message: `${documentTypeName} pour ${getMonthName(document.month)} ${document.year}`,
          data: {
            document_id: documentId,
            document_type: document.document_type,
            month: document.month,
            year: document.year
          },
          is_read: false
        })

      // TODO: Send email with PDF attachment
    }

    // Mark as sent
    await this.markAsSent(documentId)
  }

  /**
   * Bulk generate attendance certificates for all children in a nursery for a month
   */
  async bulkGenerateAttendanceCertificates(
    nurseryId: string,
    month: number,
    year: number,
    generatedById: string
  ): Promise<CAFDocument[]> {
    const supabase = this.getClient()

    // Get all active children in nursery
    const { data: children, error: childrenError } = await supabase
      .from('child')
      .select('id, family_id')
      .eq('nursery_id', nurseryId)
      .eq('is_active', true)

    if (childrenError) throw childrenError

    const documents: CAFDocument[] = []

    for (const child of children) {
      if (!child.family_id) continue

      try {
        // Check if document already exists
        const existing = await this.getAttendanceCertificate(child.id, month, year)
        if (existing) {
          documents.push(existing)
          continue
        }

        const document = await this.generateAttendanceCertificate({
          nursery_id: nurseryId,
          family_id: child.family_id,
          child_id: child.id,
          month,
          year,
          generated_by_id: generatedById
        })

        documents.push(document)
      } catch (error) {
        console.error(`Failed to generate certificate for child ${child.id}:`, error)
      }
    }

    return documents
  }

  /**
   * Bulk send documents for a nursery/month
   */
  async bulkSend(nurseryId: string, month: number, year: number): Promise<void> {
    const documents = await this.getByNursery(nurseryId, year, month)

    for (const doc of documents) {
      if (!doc.is_sent) {
        try {
          await this.send(doc.id)
        } catch (error) {
          console.error(`Failed to send document ${doc.id}:`, error)
        }
      }
    }
  }

  // ============================================================
  // UTILITIES
  // ============================================================

  /**
   * Generate unique document number
   */
  private async generateDocumentNumber(nurseryId: string, year: number, month: number): Promise<string> {
    const supabase = this.getClient()

    // Get count of documents for this nursery/year/month
    const { count, error } = await supabase
      .from('caf_document')
      .select('*', { count: 'exact', head: true })
      .eq('nursery_id', nurseryId)
      .eq('year', year)
      .eq('month', month)

    if (error) throw error

    const sequence = (count || 0) + 1
    const monthStr = month.toString().padStart(2, '0')
    return `CAF-${year}${monthStr}-${sequence.toString().padStart(4, '0')}`
  }

  /**
   * Get statistics for a nursery
   */
  async getStats(nurseryId: string, year: number, month: number): Promise<{
    total_attendance_certificates: number
    total_payment_proofs: number
    total_sent: number
    total_pending: number
  }> {
    const documents = await this.getByNursery(nurseryId, year, month)

    const stats = {
      total_attendance_certificates: documents.filter(d => d.document_type === 'attendance_certificate').length,
      total_payment_proofs: documents.filter(d => d.document_type === 'payment_proof').length,
      total_sent: documents.filter(d => d.is_sent).length,
      total_pending: documents.filter(d => !d.is_sent).length
    }

    return stats
  }
}

// Helper function
function getMonthName(month: number): string {
  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ]
  return months[month - 1] || ''
}

// Singleton export
export const cafDocumentService = new CAFDocumentService()
