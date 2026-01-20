import { createClient } from '@/lib/supabase/client'

const supabase: any = createClient()

// ============================================================
// TYPES & INTERFACES
// ============================================================

export interface TaxCertificate {
  id: string
  certificate_number: string
  nursery_id: string
  family_id: string
  child_id: string
  year: number
  total_paid: number
  caf_contribution: number
  deductible_amount: number
  tax_credit_amount: number
  start_date: string
  end_date: string
  issued_at: string
  issued_by_id: string
  pdf_url: string | null
  is_sent: boolean
  sent_at: string | null
  created_at: string
  updated_at: string
}

export interface GenerateCertificateInput {
  nursery_id: string
  family_id: string
  child_id: string
  year: number
  issued_by_id: string
}

export interface CertificateCalculation {
  total_paid: number
  caf_contribution: number
  family_paid: number
  deductible_amount: number
  tax_credit_amount: number
  tax_credit_cap: number
}

export interface AnnualSummary {
  family_id: string
  family_name: string
  year: number
  children: ChildTaxSummary[]
  total_paid: number
  total_caf_contribution: number
  total_deductible: number
  total_tax_credit: number
}

export interface ChildTaxSummary {
  child_id: string
  child_name: string
  total_paid: number
  caf_contribution: number
  deductible_amount: number
  tax_credit_amount: number
  attendance_days: number
}

// French tax constants
const TAX_CREDIT_RATE = 0.5 // 50% tax credit
const TAX_CREDIT_CAP_PER_CHILD = 2300 // Max 2300€ per child
const CURRENT_YEAR = new Date().getFullYear()

// ============================================================
// TAX CERTIFICATE SERVICE
// ============================================================

export class TaxCertificateService {
  private getClient(): any {
    return createClient()
  }

  // ============================================================
  // CERTIFICATE GENERATION
  // ============================================================

  /**
   * Generate a tax certificate for a family/child for a specific year
   */
  async generate(input: GenerateCertificateInput): Promise<TaxCertificate> {
    const supabase = this.getClient()

    // Check if certificate already exists
    const existing = await this.getByFamilyChildYear(input.family_id, input.child_id, input.year)
    if (existing) {
      throw new Error('Certificate already exists for this family/child/year')
    }

    // Calculate amounts
    const calculation = await this.calculateDeductibleAmount(input.family_id, input.child_id, input.year)

    // Generate certificate number
    const certificateNumber = await this.generateCertificateNumber(input.nursery_id, input.year)

    // Create certificate
    const { data, error } = await supabase
      .from('tax_certificate')
      .insert({
        certificate_number: certificateNumber,
        nursery_id: input.nursery_id,
        family_id: input.family_id,
        child_id: input.child_id,
        year: input.year,
        total_paid: calculation.total_paid,
        caf_contribution: calculation.caf_contribution,
        deductible_amount: calculation.deductible_amount,
        tax_credit_amount: calculation.tax_credit_amount,
        start_date: `${input.year}-01-01`,
        end_date: `${input.year}-12-31`,
        issued_at: new Date().toISOString(),
        issued_by_id: input.issued_by_id,
        is_sent: false
      })
      .select()
      .single()

    if (error) throw error

    return data as TaxCertificate
  }

  /**
   * Generate certificates for all families in a nursery for a specific year
   */
  async generateForAllFamilies(nurseryId: string, year: number, issuedById: string): Promise<TaxCertificate[]> {
    const supabase = this.getClient()

    // Get all active children in nursery for that year
    const { data: children, error: childrenError } = await supabase
      .from('child')
      .select('id, family_id')
      .eq('nursery_id', nurseryId)
      .eq('is_active', true)

    if (childrenError) throw childrenError

    const certificates: TaxCertificate[] = []

    // Generate certificate for each child
    for (const child of children) {
      if (!child.family_id) continue

      try {
        // Check if certificate already exists
        const existing = await this.getByFamilyChildYear(child.family_id, child.id, year)
        if (existing) {
          certificates.push(existing)
          continue
        }

        const certificate = await this.generate({
          nursery_id: nurseryId,
          family_id: child.family_id,
          child_id: child.id,
          year,
          issued_by_id: issuedById
        })

        certificates.push(certificate)
      } catch (error) {
        console.error(`Failed to generate certificate for child ${child.id}:`, error)
      }
    }

    return certificates
  }

  /**
   * Regenerate a certificate (e.g., if payments were corrected)
   */
  async regenerate(certificateId: string, issuedById: string): Promise<TaxCertificate> {
    const supabase = this.getClient()

    const existing = await this.getById(certificateId)
    if (!existing) throw new Error('Certificate not found')

    // Delete old certificate
    await this.delete(certificateId)

    // Generate new one
    return this.generate({
      nursery_id: existing.nursery_id,
      family_id: existing.family_id,
      child_id: existing.child_id,
      year: existing.year,
      issued_by_id: issuedById
    })
  }

  // ============================================================
  // CALCULATIONS
  // ============================================================

  /**
   * Calculate deductible amount and tax credit for a family/child/year
   */
  async calculateDeductibleAmount(
    familyId: string,
    childId: string,
    year: number
  ): Promise<CertificateCalculation> {
    const supabase = this.getClient()

    // Get all paid invoices for this family/child in the year
    const startDate = `${year}-01-01`
    const endDate = `${year}-12-31`

    const { data: invoices, error } = await supabase
      .from('invoice')
      .select(`
        id,
        total_amount,
        caf_contribution,
        paid_amount,
        invoice_items:invoice_item(
          child_id,
          subtotal
        )
      `)
      .eq('family_id', familyId)
      .eq('status', 'PAID')
      .gte('invoice_date', startDate)
      .lte('invoice_date', endDate)

    if (error) throw error

    // Calculate totals for this specific child
    let totalPaid = 0
    let cafContribution = 0

    invoices.forEach((invoice: any) => {
      // Filter invoice items for this child
      const childItems = invoice.invoice_items.filter((item: any) => item.child_id === childId)
      const childSubtotal = childItems.reduce((sum: number, item: any) => sum + item.subtotal, 0)

      if (childSubtotal > 0) {
        // Calculate proportional CAF contribution for this child
        const childProportion = childSubtotal / invoice.total_amount
        const childCafContribution = invoice.caf_contribution * childProportion

        totalPaid += invoice.paid_amount * childProportion
        cafContribution += childCafContribution
      }
    })

    // Deductible amount = what family actually paid (excluding CAF contribution)
    const familyPaid = totalPaid - cafContribution
    const deductibleAmount = familyPaid

    // Tax credit = 50% of deductible amount, capped at 2300€
    const taxCreditAmount = Math.min(deductibleAmount * TAX_CREDIT_RATE, TAX_CREDIT_CAP_PER_CHILD)

    return {
      total_paid: Math.round(totalPaid * 100) / 100,
      caf_contribution: Math.round(cafContribution * 100) / 100,
      family_paid: Math.round(familyPaid * 100) / 100,
      deductible_amount: Math.round(deductibleAmount * 100) / 100,
      tax_credit_amount: Math.round(taxCreditAmount * 100) / 100,
      tax_credit_cap: TAX_CREDIT_CAP_PER_CHILD
    }
  }

  /**
   * Get annual summary for a family (all children)
   */
  async getAnnualSummary(familyId: string, year: number): Promise<AnnualSummary> {
    const supabase = this.getClient()

    // Get family info
    const { data: family, error: familyError } = await supabase
      .from('family')
      .select('id, name')
      .eq('id', familyId)
      .single()

    if (familyError) throw familyError

    // Get all children for this family
    const { data: children, error: childrenError } = await supabase
      .from('child')
      .select('id, first_name, last_name')
      .eq('family_id', familyId)

    if (childrenError) throw childrenError

    const childrenSummaries: ChildTaxSummary[] = []
    let totalPaid = 0
    let totalCafContribution = 0
    let totalDeductible = 0
    let totalTaxCredit = 0

    for (const child of children) {
      const calculation = await this.calculateDeductibleAmount(familyId, child.id, year)

      childrenSummaries.push({
        child_id: child.id,
        child_name: `${child.first_name} ${child.last_name}`,
        total_paid: calculation.total_paid,
        caf_contribution: calculation.caf_contribution,
        deductible_amount: calculation.deductible_amount,
        tax_credit_amount: calculation.tax_credit_amount,
        attendance_days: 0 // TODO: Calculate from attendance records
      })

      totalPaid += calculation.total_paid
      totalCafContribution += calculation.caf_contribution
      totalDeductible += calculation.deductible_amount
      totalTaxCredit += calculation.tax_credit_amount
    }

    return {
      family_id: familyId,
      family_name: family.name,
      year,
      children: childrenSummaries,
      total_paid: Math.round(totalPaid * 100) / 100,
      total_caf_contribution: Math.round(totalCafContribution * 100) / 100,
      total_deductible: Math.round(totalDeductible * 100) / 100,
      total_tax_credit: Math.round(totalTaxCredit * 100) / 100
    }
  }

  // ============================================================
  // CRUD OPERATIONS
  // ============================================================

  /**
   * Get certificate by ID
   */
  async getById(certificateId: string): Promise<TaxCertificate | null> {
    const supabase = this.getClient()

    const { data, error } = await supabase
      .from('tax_certificate')
      .select(`
        *,
        nursery:nursery(id, name, address, city, postal_code),
        family:family(id, name),
        child:child(id, first_name, last_name),
        issued_by:profiles!issued_by_id(id, first_name, last_name)
      `)
      .eq('id', certificateId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data as any
  }

  /**
   * Get certificate by family/child/year
   */
  async getByFamilyChildYear(
    familyId: string,
    childId: string,
    year: number
  ): Promise<TaxCertificate | null> {
    const supabase = this.getClient()

    const { data, error } = await supabase
      .from('tax_certificate')
      .select('*')
      .eq('family_id', familyId)
      .eq('child_id', childId)
      .eq('year', year)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data as TaxCertificate
  }

  /**
   * Get all certificates for a family
   */
  async getByFamily(familyId: string): Promise<TaxCertificate[]> {
    const supabase = this.getClient()

    const { data, error } = await supabase
      .from('tax_certificate')
      .select(`
        *,
        child:child(id, first_name, last_name)
      `)
      .eq('family_id', familyId)
      .order('year', { ascending: false })

    if (error) throw error
    return (data as any[]) || []
  }

  /**
   * Get all certificates for a nursery
   */
  async getByNursery(nurseryId: string, year?: number): Promise<TaxCertificate[]> {
    const supabase = this.getClient()

    let query = supabase
      .from('tax_certificate')
      .select(`
        *,
        family:family(id, name),
        child:child(id, first_name, last_name)
      `)
      .eq('nursery_id', nurseryId)
      .order('issued_at', { ascending: false })

    if (year) {
      query = query.eq('year', year)
    }

    const { data, error } = await query

    if (error) throw error
    return (data as any[]) || []
  }

  /**
   * Update certificate PDF URL
   */
  async updatePdfUrl(certificateId: string, pdfUrl: string): Promise<TaxCertificate> {
    const supabase = this.getClient()

    const { data, error } = await supabase
      .from('tax_certificate')
      .update({
        pdf_url: pdfUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', certificateId)
      .select()
      .single()

    if (error) throw error
    return data as TaxCertificate
  }

  /**
   * Mark certificate as sent
   */
  async markAsSent(certificateId: string): Promise<TaxCertificate> {
    const supabase = this.getClient()

    const { data, error } = await supabase
      .from('tax_certificate')
      .update({
        is_sent: true,
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', certificateId)
      .select()
      .single()

    if (error) throw error
    return data as TaxCertificate
  }

  /**
   * Delete a certificate
   */
  async delete(certificateId: string): Promise<void> {
    const supabase = this.getClient()

    const { error } = await supabase
      .from('tax_certificate')
      .delete()
      .eq('id', certificateId)

    if (error) throw error
  }

  // ============================================================
  // SENDING & NOTIFICATIONS
  // ============================================================

  /**
   * Send certificate to family (email + app notification)
   */
  async send(certificateId: string): Promise<void> {
    const supabase = this.getClient()

    const certificate = await this.getById(certificateId)
    if (!certificate) throw new Error('Certificate not found')

    // Get guardians for this family
    const { data: guardians, error: guardiansError } = await supabase
      .from('guardian')
      .select('id, email, first_name, last_name')
      .eq('family_id', certificate.family_id)

    if (guardiansError) throw guardiansError

    // Create notifications for guardians
    for (const guardian of guardians) {
      // Create in-app notification
      await supabase
        .from('parent_notification')
        .insert({
          guardian_id: guardian.id,
          notification_type: 'document_uploaded',
          title: 'Attestation fiscale disponible',
          message: `Votre attestation fiscale ${certificate.year} est disponible`,
          data: {
            certificate_id: certificateId,
            year: certificate.year
          },
          is_read: false
        })

      // TODO: Send email with PDF attachment
      // This would integrate with an email service like SendGrid or AWS SES
    }

    // Mark as sent
    await this.markAsSent(certificateId)
  }

  /**
   * Bulk send certificates for a nursery/year
   */
  async bulkSend(nurseryId: string, year: number): Promise<void> {
    const certificates = await this.getByNursery(nurseryId, year)

    for (const cert of certificates) {
      if (!cert.is_sent) {
        try {
          await this.send(cert.id)
        } catch (error) {
          console.error(`Failed to send certificate ${cert.id}:`, error)
        }
      }
    }
  }

  // ============================================================
  // UTILITIES
  // ============================================================

  /**
   * Generate unique certificate number
   */
  private async generateCertificateNumber(nurseryId: string, year: number): Promise<string> {
    const supabase = this.getClient()

    // Get count of certificates for this nursery/year
    const { count, error } = await supabase
      .from('tax_certificate')
      .select('*', { count: 'exact', head: true })
      .eq('nursery_id', nurseryId)
      .eq('year', year)

    if (error) throw error

    const sequence = (count || 0) + 1
    return `ATTEST-${year}-${sequence.toString().padStart(4, '0')}`
  }

  /**
   * Get statistics for a nursery
   */
  async getStats(nurseryId: string, year: number): Promise<{
    total_certificates: number
    total_sent: number
    total_families: number
    total_amount_paid: number
    total_tax_credit: number
  }> {
    const certificates = await this.getByNursery(nurseryId, year)

    const stats = {
      total_certificates: certificates.length,
      total_sent: certificates.filter(c => c.is_sent).length,
      total_families: new Set(certificates.map(c => c.family_id)).size,
      total_amount_paid: certificates.reduce((sum, c) => sum + c.total_paid, 0),
      total_tax_credit: certificates.reduce((sum, c) => sum + c.tax_credit_amount, 0)
    }

    return stats
  }
}

// Singleton export
export const taxCertificateService = new TaxCertificateService()
