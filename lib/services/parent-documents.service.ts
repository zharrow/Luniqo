import { createClient } from '@/lib/supabase/client'

const supabase: any = createClient()

// ============================================================
// TYPES & INTERFACES
// ============================================================

export interface ParentDocumentShare {
  id: string
  nursery_id: string
  document_type: DocumentType
  title: string
  description: string | null
  file_url: string
  file_size: number | null
  file_mime_type: string | null
  share_scope: ShareScope
  target_family_ids: string[] | null
  target_child_id: string | null
  requires_acknowledgment: boolean
  uploaded_by_id: string
  uploaded_at: string
  expires_at: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DocumentAcknowledgment {
  id: string
  document_id: string
  guardian_id: string
  acknowledged_at: string
  download_count: number
  last_downloaded_at: string | null
  created_at: string
}

export type DocumentType =
  | 'menu'
  | 'calendar'
  | 'regulation'
  | 'invoice'
  | 'certificate'
  | 'report'
  | 'photo_album'
  | 'announcement'
  | 'consent_form'

export type ShareScope = 'all_families' | 'specific_families' | 'specific_child'

export interface ShareDocumentInput {
  nursery_id: string
  document_type: DocumentType
  title: string
  description?: string
  file_url: string
  file_size?: number
  file_mime_type?: string
  share_scope: ShareScope
  target_family_ids?: string[]
  target_child_id?: string
  requires_acknowledgment?: boolean
  uploaded_by_id: string
  expires_at?: string
}

export interface UpdateDocumentInput {
  title?: string
  description?: string
  share_scope?: ShareScope
  target_family_ids?: string[]
  target_child_id?: string
  requires_acknowledgment?: boolean
  expires_at?: string
  is_active?: boolean
}

export interface DocumentWithStats {
  document: ParentDocumentShare
  total_recipients: number
  acknowledged_count: number
  downloaded_count: number
  acknowledgment_rate: number
}

// ============================================================
// PARENT DOCUMENTS SERVICE
// ============================================================

export class ParentDocumentsService {
  private getClient(): any {
    return createClient()
  }

  // ============================================================
  // DOCUMENT SHARING
  // ============================================================

  /**
   * Share a document with families
   */
  async shareDocument(input: ShareDocumentInput): Promise<ParentDocumentShare> {
    const supabase = this.getClient()

    const { data, error } = await supabase
      .from('parent_document_share')
      .insert({
        nursery_id: input.nursery_id,
        document_type: input.document_type,
        title: input.title,
        description: input.description || null,
        file_url: input.file_url,
        file_size: input.file_size || null,
        file_mime_type: input.file_mime_type || null,
        share_scope: input.share_scope,
        target_family_ids: input.target_family_ids || null,
        target_child_id: input.target_child_id || null,
        requires_acknowledgment: input.requires_acknowledgment || false,
        uploaded_by_id: input.uploaded_by_id,
        uploaded_at: new Date().toISOString(),
        expires_at: input.expires_at || null,
        is_active: true
      })
      .select()
      .single()

    if (error) throw error

    // Create notifications for recipients
    await this.notifyRecipients(data as ParentDocumentShare)

    return data as ParentDocumentShare
  }

  /**
   * Get documents for a guardian
   */
  async getDocumentsByGuardian(guardianId: string): Promise<ParentDocumentShare[]> {
    const supabase = this.getClient()

    // Get guardian's family
    const { data: guardian, error: guardianError } = await supabase
      .from('guardian')
      .select('family_id')
      .eq('id', guardianId)
      .single()

    if (guardianError) throw guardianError

    const familyId = guardian.family_id

    // Get all active documents visible to this family
    const { data, error } = await supabase
      .from('parent_document_share')
      .select(`
        *,
        uploaded_by:profiles!uploaded_by_id(id, first_name, last_name),
        acknowledgments:document_acknowledgment(id, guardian_id, acknowledged_at)
      `)
      .eq('is_active', true)
      .or(`share_scope.eq.all_families,target_family_ids.cs.{${familyId}}`)
      .order('uploaded_at', { ascending: false })

    if (error) throw error

    // Filter out expired documents
    const now = new Date().toISOString()
    return (data as any[]).filter((doc: any) => !doc.expires_at || doc.expires_at > now)
  }

  /**
   * Get documents for a child (seen by parents)
   */
  async getDocumentsByChild(childId: string): Promise<ParentDocumentShare[]> {
    const supabase = this.getClient()

    const { data, error } = await supabase
      .from('parent_document_share')
      .select(`
        *,
        uploaded_by:profiles!uploaded_by_id(id, first_name, last_name)
      `)
      .eq('is_active', true)
      .eq('target_child_id', childId)
      .order('uploaded_at', { ascending: false })

    if (error) throw error

    // Filter out expired documents
    const now = new Date().toISOString()
    return (data as any[]).filter((doc: any) => !doc.expires_at || doc.expires_at > now)
  }

  /**
   * Get documents for a family
   */
  async getDocumentsByFamily(familyId: string): Promise<ParentDocumentShare[]> {
    const supabase = this.getClient()

    const { data, error } = await supabase
      .from('parent_document_share')
      .select(`
        *,
        uploaded_by:profiles!uploaded_by_id(id, first_name, last_name)
      `)
      .eq('is_active', true)
      .or(`share_scope.eq.all_families,target_family_ids.cs.{${familyId}}`)
      .order('uploaded_at', { ascending: false })

    if (error) throw error

    // Filter out expired documents
    const now = new Date().toISOString()
    return (data as any[]).filter((doc: any) => !doc.expires_at || doc.expires_at > now)
  }

  /**
   * Get all documents for a nursery (Owner view)
   */
  async getDocumentsByNursery(nurseryId: string): Promise<ParentDocumentShare[]> {
    const supabase = this.getClient()

    const { data, error } = await supabase
      .from('parent_document_share')
      .select(`
        *,
        uploaded_by:profiles!uploaded_by_id(id, first_name, last_name)
      `)
      .eq('nursery_id', nurseryId)
      .order('uploaded_at', { ascending: false })

    if (error) throw error
    return (data as any[]) || []
  }

  /**
   * Get a single document by ID
   */
  async getById(documentId: string): Promise<ParentDocumentShare | null> {
    const supabase = this.getClient()

    const { data, error } = await supabase
      .from('parent_document_share')
      .select(`
        *,
        uploaded_by:profiles!uploaded_by_id(id, first_name, last_name)
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
   * Update a document
   */
  async updateDocument(documentId: string, input: UpdateDocumentInput): Promise<ParentDocumentShare> {
    const supabase = this.getClient()

    const { data, error } = await supabase
      .from('parent_document_share')
      .update({
        ...input,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)
      .select()
      .single()

    if (error) throw error
    return data as ParentDocumentShare
  }

  /**
   * Delete a document (soft delete - set is_active to false)
   */
  async deleteDocument(documentId: string): Promise<void> {
    const supabase = this.getClient()

    const { error } = await supabase
      .from('parent_document_share')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)

    if (error) throw error
  }

  /**
   * Permanently delete a document
   */
  async permanentlyDeleteDocument(documentId: string): Promise<void> {
    const supabase = this.getClient()

    const { error } = await supabase
      .from('parent_document_share')
      .delete()
      .eq('id', documentId)

    if (error) throw error
  }

  // ============================================================
  // ACKNOWLEDGMENTS
  // ============================================================

  /**
   * Acknowledge a document (guardian confirms they've read it)
   */
  async acknowledgeDocument(documentId: string, guardianId: string): Promise<DocumentAcknowledgment> {
    const supabase = this.getClient()

    // Check if already acknowledged
    const { data: existing, error: checkError } = await supabase
      .from('document_acknowledgment')
      .select('*')
      .eq('document_id', documentId)
      .eq('guardian_id', guardianId)
      .single()

    if (existing) {
      // Already acknowledged, just return it
      return existing as DocumentAcknowledgment
    }

    // Create new acknowledgment
    const { data, error } = await supabase
      .from('document_acknowledgment')
      .insert({
        document_id: documentId,
        guardian_id: guardianId,
        acknowledged_at: new Date().toISOString(),
        download_count: 0
      })
      .select()
      .single()

    if (error) throw error
    return data as DocumentAcknowledgment
  }

  /**
   * Record a document download
   */
  async recordDownload(documentId: string, guardianId: string): Promise<DocumentAcknowledgment> {
    const supabase = this.getClient()

    // Get or create acknowledgment
    let acknowledgment = await this.getAcknowledgment(documentId, guardianId)

    if (!acknowledgment) {
      // Create new acknowledgment with download count
      const { data, error } = await supabase
        .from('document_acknowledgment')
        .insert({
          document_id: documentId,
          guardian_id: guardianId,
          acknowledged_at: new Date().toISOString(),
          download_count: 1,
          last_downloaded_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return data as DocumentAcknowledgment
    }

    // Update existing acknowledgment
    const { data, error } = await supabase
      .from('document_acknowledgment')
      .update({
        download_count: acknowledgment.download_count + 1,
        last_downloaded_at: new Date().toISOString()
      })
      .eq('id', acknowledgment.id)
      .select()
      .single()

    if (error) throw error
    return data as DocumentAcknowledgment
  }

  /**
   * Get acknowledgment for a specific guardian and document
   */
  async getAcknowledgment(documentId: string, guardianId: string): Promise<DocumentAcknowledgment | null> {
    const supabase = this.getClient()

    const { data, error } = await supabase
      .from('document_acknowledgment')
      .select('*')
      .eq('document_id', documentId)
      .eq('guardian_id', guardianId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data as DocumentAcknowledgment
  }

  /**
   * Get all acknowledgments for a document
   */
  async getAcknowledgments(documentId: string): Promise<DocumentAcknowledgment[]> {
    const supabase = this.getClient()

    const { data, error } = await supabase
      .from('document_acknowledgment')
      .select(`
        *,
        guardian:guardian(id, first_name, last_name)
      `)
      .eq('document_id', documentId)
      .order('acknowledged_at', { ascending: false })

    if (error) throw error
    return (data as any[]) || []
  }

  // ============================================================
  // STATISTICS
  // ============================================================

  /**
   * Get document statistics with acknowledgment data
   */
  async getDocumentStats(documentId: string): Promise<DocumentWithStats> {
    const supabase = this.getClient()

    const document = await this.getById(documentId)
    if (!document) throw new Error('Document not found')

    const acknowledgments = await this.getAcknowledgments(documentId)

    // Calculate total recipients based on share scope
    let totalRecipients = 0
    if (document.share_scope === 'all_families') {
      // Count all guardians in nursery
      const { count, error } = await supabase
        .from('guardian')
        .select('*', { count: 'exact', head: true })
        .eq('family_id', supabase.rpc('get_families_by_nursery', { nursery_id: document.nursery_id }))

      if (error) throw error
      totalRecipients = count || 0
    } else if (document.share_scope === 'specific_families' && document.target_family_ids) {
      // Count guardians in target families
      const { count, error } = await supabase
        .from('guardian')
        .select('*', { count: 'exact', head: true })
        .in('family_id', document.target_family_ids)

      if (error) throw error
      totalRecipients = count || 0
    } else if (document.share_scope === 'specific_child' && document.target_child_id) {
      // Count guardians of specific child
      const { count, error } = await supabase
        .from('guardian_child')
        .select('*', { count: 'exact', head: true })
        .eq('child_id', document.target_child_id)

      if (error) throw error
      totalRecipients = count || 0
    }

    const acknowledgedCount = acknowledgments.length
    const downloadedCount = acknowledgments.reduce((sum, ack) => sum + ack.download_count, 0)
    const acknowledgmentRate = totalRecipients > 0 ? (acknowledgedCount / totalRecipients) * 100 : 0

    return {
      document,
      total_recipients: totalRecipients,
      acknowledged_count: acknowledgedCount,
      downloaded_count: downloadedCount,
      acknowledgment_rate: Math.round(acknowledgmentRate * 10) / 10 // Round to 1 decimal
    }
  }

  /**
   * Get documents pending acknowledgment for a guardian
   */
  async getPendingAcknowledgments(guardianId: string): Promise<ParentDocumentShare[]> {
    const supabase = this.getClient()

    const documents = await this.getDocumentsByGuardian(guardianId)

    // Filter for documents that require acknowledgment but haven't been acknowledged
    const pending: ParentDocumentShare[] = []

    for (const doc of documents) {
      if (!doc.requires_acknowledgment) continue

      const acknowledgment = await this.getAcknowledgment(doc.id, guardianId)
      if (!acknowledgment) {
        pending.push(doc)
      }
    }

    return pending
  }

  // ============================================================
  // NOTIFICATIONS
  // ============================================================

  /**
   * Notify recipients when a new document is shared
   */
  private async notifyRecipients(document: ParentDocumentShare): Promise<void> {
    const supabase = this.getClient()

    // Get recipient guardians based on share scope
    let guardianIds: string[] = []

    if (document.share_scope === 'all_families') {
      // Get all guardians in nursery
      const { data: families, error: familiesError } = await supabase
        .from('family')
        .select('id')
        .eq('nursery_id', document.nursery_id)

      if (familiesError) throw familiesError

      const familyIds = families.map((f: any) => f.id)

      const { data: guardians, error: guardiansError } = await supabase
        .from('guardian')
        .select('id')
        .in('family_id', familyIds)

      if (guardiansError) throw guardiansError

      guardianIds = guardians.map((g: any) => g.id)
    } else if (document.share_scope === 'specific_families' && document.target_family_ids) {
      // Get guardians in target families
      const { data: guardians, error } = await supabase
        .from('guardian')
        .select('id')
        .in('family_id', document.target_family_ids)

      if (error) throw error

      guardianIds = guardians.map((g: any) => g.id)
    } else if (document.share_scope === 'specific_child' && document.target_child_id) {
      // Get guardians of specific child
      const { data: guardianChildren, error } = await supabase
        .from('guardian_child')
        .select('guardian_id')
        .eq('child_id', document.target_child_id)

      if (error) throw error

      guardianIds = guardianChildren.map((gc: any) => gc.guardian_id)
    }

    // Create notification for each guardian
    // Note: This uses the parentMessagingService which should be imported
    // For now, we'll insert directly to avoid circular dependencies
    for (const guardianId of guardianIds) {
      await supabase
        .from('parent_notification')
        .insert({
          guardian_id: guardianId,
          notification_type: 'document_uploaded',
          title: 'Nouveau document',
          message: `${document.title} est disponible`,
          data: {
            document_id: document.id,
            document_type: document.document_type
          },
          is_read: false
        })
    }
  }
}

// Singleton export
export const parentDocumentsService = new ParentDocumentsService()
