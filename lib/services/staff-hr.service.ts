import { createClient } from '@/lib/supabase/client'

// ============================================================================
// TYPES
// ============================================================================

export interface StaffQualification {
  id: string
  employee_id: string
  qualification_type: string
  qualification_name: string
  issuing_organization?: string
  issue_date: string
  expiry_date?: string
  certificate_number?: string
  document_url?: string
  qualification_level?: string
  is_verified: boolean
  verified_by_id?: string
  verified_at?: string
  is_active: boolean
  notes?: string
  created_at: string
  updated_at: string
}

export interface CreateQualificationInput {
  employee_id: string
  qualification_type: string
  qualification_name: string
  issuing_organization?: string
  issue_date: string
  expiry_date?: string
  certificate_number?: string
  document_url?: string
  qualification_level?: string
  notes?: string
}

export interface UpdateQualificationInput {
  qualification_type?: string
  qualification_name?: string
  issuing_organization?: string
  issue_date?: string
  expiry_date?: string
  certificate_number?: string
  document_url?: string
  qualification_level?: string
  is_active?: boolean
  notes?: string
}

export interface StaffDocument {
  id: string
  employee_id: string
  document_type: string
  file_url: string
  file_name: string
  file_size?: number
  mime_type?: string
  issue_date?: string
  expiry_date?: string
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  reviewed_by_id?: string
  reviewed_at?: string
  rejection_reason?: string
  is_confidential: boolean
  uploaded_by_id?: string
  created_at: string
  updated_at: string
}

export interface CreateDocumentInput {
  employee_id: string
  document_type: string
  file_url: string
  file_name: string
  file_size?: number
  mime_type?: string
  issue_date?: string
  expiry_date?: string
  is_confidential?: boolean
  uploaded_by_id?: string
}

export interface UpdateDocumentInput {
  document_type?: string
  issue_date?: string
  expiry_date?: string
  status?: 'pending' | 'approved' | 'rejected' | 'expired'
  rejection_reason?: string
  is_confidential?: boolean
}

export interface StaffAuthorization {
  id: string
  employee_id: string
  nursery_id: string
  authorization_type: string
  granted_date: string
  expiry_date?: string
  granted_by_id: string
  revoked: boolean
  revoked_date?: string
  revoked_by_id?: string
  revocation_reason?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface CreateAuthorizationInput {
  employee_id: string
  nursery_id: string
  authorization_type: string
  granted_date: string
  expiry_date?: string
  granted_by_id: string
  notes?: string
}

export interface QualificationWithEmployee extends StaffQualification {
  employee_name: string
  employee_email: string
}

export interface DocumentWithEmployee extends StaffDocument {
  employee_name: string
  employee_email: string
}

// ============================================================================
// STAFF HR SERVICE
// Description: Manages staff qualifications, documents, and authorizations
// ============================================================================

export class StaffHRService {
  private supabase: any

  constructor() {
    this.supabase = createClient()
  }

  // ==========================================================================
  // QUALIFICATIONS METHODS
  // ==========================================================================

  /**
   * Add a new qualification for an employee
   */
  async addQualification(data: CreateQualificationInput): Promise<StaffQualification> {
    const { data: qualification, error } = await this.supabase
      .from('staff_qualification')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return qualification
  }

  /**
   * Get all qualifications for an employee
   */
  async getQualifications(employeeId: string): Promise<StaffQualification[]> {
    const { data, error } = await this.supabase
      .from('staff_qualification')
      .select('*')
      .eq('employee_id', employeeId)
      .order('issue_date', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Get active qualifications for an employee
   */
  async getActiveQualifications(employeeId: string): Promise<StaffQualification[]> {
    const { data, error } = await this.supabase
      .from('staff_qualification')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('is_active', true)
      .order('issue_date', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Get a single qualification by ID
   */
  async getQualificationById(qualificationId: string): Promise<StaffQualification> {
    const { data, error } = await this.supabase
      .from('staff_qualification')
      .select('*')
      .eq('id', qualificationId)
      .single()

    if (error) throw error
    return data
  }

  /**
   * Update a qualification
   */
  async updateQualification(
    qualificationId: string,
    updates: UpdateQualificationInput
  ): Promise<StaffQualification> {
    const { data, error } = await this.supabase
      .from('staff_qualification')
      .update(updates)
      .eq('id', qualificationId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Delete a qualification
   */
  async deleteQualification(qualificationId: string): Promise<void> {
    const { error } = await this.supabase
      .from('staff_qualification')
      .delete()
      .eq('id', qualificationId)

    if (error) throw error
  }

  /**
   * Verify a qualification (mark as verified by management)
   */
  async verifyQualification(
    qualificationId: string,
    verifiedById: string
  ): Promise<StaffQualification> {
    const { data, error} = await this.supabase
      .from('staff_qualification')
      .update({
        is_verified: true,
        verified_by_id: verifiedById,
        verified_at: new Date().toISOString()
      })
      .eq('id', qualificationId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Get qualifications expiring soon for a nursery (next 90 days)
   */
  async getExpiringQualifications(
    nurseryId: string,
    daysAhead: number = 90
  ): Promise<QualificationWithEmployee[]> {
    const today = new Date().toISOString().split('T')[0]
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + daysAhead)
    const futureDateStr = futureDate.toISOString().split('T')[0]

    const { data, error } = await this.supabase
      .from('staff_qualification')
      .select(`
        *,
        profiles!inner(
          first_name,
          last_name,
          email,
          enterprise_id
        )
      `)
      .eq('is_active', true)
      .gte('expiry_date', today)
      .lte('expiry_date', futureDateStr)
      .order('expiry_date', { ascending: true })

    if (error) throw error

    // Transform the data to include employee information
    return (data || []).map((q: any) => ({
      ...q,
      employee_name: `${q.profiles.first_name} ${q.profiles.last_name}`,
      employee_email: q.profiles.email
    }))
  }

  /**
   * Get expired qualifications
   */
  async getExpiredQualifications(nurseryId: string): Promise<QualificationWithEmployee[]> {
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await this.supabase
      .from('staff_qualification')
      .select(`
        *,
        profiles!inner(
          first_name,
          last_name,
          email,
          enterprise_id
        )
      `)
      .eq('is_active', true)
      .lt('expiry_date', today)
      .order('expiry_date', { ascending: false })

    if (error) throw error

    return (data || []).map((q: any) => ({
      ...q,
      employee_name: `${q.profiles.first_name} ${q.profiles.last_name}`,
      employee_email: q.profiles.email
    }))
  }

  // ==========================================================================
  // DOCUMENTS METHODS
  // ==========================================================================

  /**
   * Upload a new document for an employee
   */
  async uploadDocument(data: CreateDocumentInput): Promise<StaffDocument> {
    const { data: document, error } = await this.supabase
      .from('staff_document')
      .insert({
        ...data,
        is_confidential: data.is_confidential !== false // Default to true
      })
      .select()
      .single()

    if (error) throw error
    return document
  }

  /**
   * Get all documents for an employee
   */
  async getDocuments(employeeId: string): Promise<StaffDocument[]> {
    const { data, error } = await this.supabase
      .from('staff_document')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Get a single document by ID
   */
  async getDocumentById(documentId: string): Promise<StaffDocument> {
    const { data, error } = await this.supabase
      .from('staff_document')
      .select('*')
      .eq('id', documentId)
      .single()

    if (error) throw error
    return data
  }

  /**
   * Update a document
   */
  async updateDocument(
    documentId: string,
    updates: UpdateDocumentInput
  ): Promise<StaffDocument> {
    const { data, error } = await this.supabase
      .from('staff_document')
      .update(updates)
      .eq('id', documentId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string): Promise<void> {
    const { error } = await this.supabase
      .from('staff_document')
      .delete()
      .eq('id', documentId)

    if (error) throw error
  }

  /**
   * Approve a document
   */
  async approveDocument(
    documentId: string,
    reviewedById: string
  ): Promise<StaffDocument> {
    const { data, error } = await this.supabase
      .from('staff_document')
      .update({
        status: 'approved',
        reviewed_by_id: reviewedById,
        reviewed_at: new Date().toISOString(),
        rejection_reason: null
      })
      .eq('id', documentId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Reject a document
   */
  async rejectDocument(
    documentId: string,
    reviewedById: string,
    reason: string
  ): Promise<StaffDocument> {
    const { data, error } = await this.supabase
      .from('staff_document')
      .update({
        status: 'rejected',
        reviewed_by_id: reviewedById,
        reviewed_at: new Date().toISOString(),
        rejection_reason: reason
      })
      .eq('id', documentId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Get pending documents for a nursery (awaiting review)
   */
  async getPendingDocuments(nurseryId: string): Promise<DocumentWithEmployee[]> {
    const { data, error } = await this.supabase
      .from('staff_document')
      .select(`
        *,
        profiles!inner(
          first_name,
          last_name,
          email,
          enterprise_id
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (error) throw error

    return (data || []).map((d: any) => ({
      ...d,
      employee_name: `${d.profiles.first_name} ${d.profiles.last_name}`,
      employee_email: d.profiles.email
    }))
  }

  /**
   * Get documents expiring soon
   */
  async getExpiringDocuments(
    nurseryId: string,
    daysAhead: number = 90
  ): Promise<DocumentWithEmployee[]> {
    const today = new Date().toISOString().split('T')[0]
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + daysAhead)
    const futureDateStr = futureDate.toISOString().split('T')[0]

    const { data, error } = await this.supabase
      .from('staff_document')
      .select(`
        *,
        profiles!inner(
          first_name,
          last_name,
          email,
          enterprise_id
        )
      `)
      .eq('status', 'approved')
      .gte('expiry_date', today)
      .lte('expiry_date', futureDateStr)
      .order('expiry_date', { ascending: true })

    if (error) throw error

    return (data || []).map((d: any) => ({
      ...d,
      employee_name: `${d.profiles.first_name} ${d.profiles.last_name}`,
      employee_email: d.profiles.email
    }))
  }

  // ==========================================================================
  // AUTHORIZATIONS METHODS
  // ==========================================================================

  /**
   * Grant an authorization to an employee
   */
  async grantAuthorization(data: CreateAuthorizationInput): Promise<StaffAuthorization> {
    const { data: authorization, error } = await this.supabase
      .from('staff_authorization')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return authorization
  }

  /**
   * Get all authorizations for an employee
   */
  async getAuthorizations(employeeId: string, nurseryId: string): Promise<StaffAuthorization[]> {
    const { data, error } = await this.supabase
      .from('staff_authorization')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('nursery_id', nurseryId)
      .order('granted_date', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Get active (non-revoked) authorizations for an employee
   */
  async getActiveAuthorizations(
    employeeId: string,
    nurseryId: string
  ): Promise<StaffAuthorization[]> {
    const { data, error } = await this.supabase
      .from('staff_authorization')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('nursery_id', nurseryId)
      .eq('revoked', false)
      .order('granted_date', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Check if employee has a specific authorization
   */
  async hasAuthorization(
    employeeId: string,
    nurseryId: string,
    authorizationType: string
  ): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await this.supabase
      .from('staff_authorization')
      .select('id')
      .eq('employee_id', employeeId)
      .eq('nursery_id', nurseryId)
      .eq('authorization_type', authorizationType)
      .eq('revoked', false)
      .or(`expiry_date.is.null,expiry_date.gte.${today}`)
      .limit(1)

    if (error) throw error
    return (data || []).length > 0
  }

  /**
   * Revoke an authorization
   */
  async revokeAuthorization(
    authorizationId: string,
    revokedById: string,
    reason: string
  ): Promise<StaffAuthorization> {
    const { data, error } = await this.supabase
      .from('staff_authorization')
      .update({
        revoked: true,
        revoked_date: new Date().toISOString().split('T')[0],
        revoked_by_id: revokedById,
        revocation_reason: reason
      })
      .eq('id', authorizationId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Get all authorizations for a nursery
   */
  async getAuthorizationsByNursery(nurseryId: string): Promise<StaffAuthorization[]> {
    const { data, error } = await this.supabase
      .from('staff_authorization')
      .select('*')
      .eq('nursery_id', nurseryId)
      .order('granted_date', { ascending: false })

    if (error) throw error
    return data || []
  }
}
