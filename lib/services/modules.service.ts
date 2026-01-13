// Module Permissions Service
// Manages modules, module access permissions, and access requests

import { createClient } from '@/lib/supabase/client'
import { messagingService } from '@/lib/services/messaging.service'
import type {
  Module,
  ModuleInsert,
  EnterpriseModuleAccess,
  EnterpriseModuleAccessInsert,
  ModuleAccessRequest,
  ModuleAccessRequestInsert,
} from '@/types/database.types'

class ModulesService {
  // ============================================================================
  // MODULE CATALOG MANAGEMENT
  // ============================================================================

  /**
   * Get all active modules from the catalog
   */
  async getModules(): Promise<Module[]> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('module')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching modules:', error)
      throw new Error(`Failed to fetch modules: ${error.message}`)
    }

    return data || []
  }

  /**
   * Get a specific module by ID
   */
  async getModuleById(moduleId: string): Promise<Module | null> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('module')
      .select('*')
      .eq('id', moduleId)
      .single()

    if (error) {
      console.error(`Error fetching module ${moduleId}:`, error)
      return null
    }

    return data
  }

  // ============================================================================
  // ENTERPRISE MODULE ACCESS (PERMISSIONS)
  // ============================================================================

  /**
   * Get all module IDs accessible by an enterprise
   * @returns Array of module IDs (e.g., ['base', 'cleaning', 'haccp'])
   */
  async getEnterpriseModules(enterpriseId: string): Promise<string[]> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('enterprise_module_access')
      .select('module_id')
      .eq('enterprise_id', enterpriseId)
      .eq('is_active', true)

    if (error) {
      console.error(`Error fetching enterprise modules:`, error)
      throw new Error(`Failed to fetch enterprise modules: ${error.message}`)
    }

    return (data || []).map((row: any) => row.module_id)
  }

  /**
   * Check if an enterprise has access to a specific module
   */
  async hasModuleAccess(enterpriseId: string, moduleId: string): Promise<boolean> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('enterprise_module_access')
      .select('id')
      .eq('enterprise_id', enterpriseId)
      .eq('module_id', moduleId)
      .eq('is_active', true)
      .maybeSingle()

    if (error) {
      console.error(`Error checking module access:`, error)
      return false
    }

    return !!data
  }

  /**
   * Get detailed module access information for an enterprise
   */
  async getEnterpriseModuleAccess(
    enterpriseId: string
  ): Promise<EnterpriseModuleAccess[]> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('enterprise_module_access')
      .select('*')
      .eq('enterprise_id', enterpriseId)
      .eq('is_active', true)

    if (error) {
      console.error(`Error fetching enterprise module access:`, error)
      throw new Error(`Failed to fetch module access: ${error.message}`)
    }

    return data || []
  }

  /**
   * Grant module access to an enterprise (Developer only)
   */
  async grantModuleAccess(
    enterpriseId: string,
    moduleId: string,
    grantedById: string
  ): Promise<void> {
    const supabase = createClient()

    const access: EnterpriseModuleAccessInsert = {
      enterprise_id: enterpriseId,
      module_id: moduleId,
      granted_by_id: grantedById,
      is_active: true,
    }

    const { error } = await supabase
      .from('enterprise_module_access')
      .upsert(access as any, {
        onConflict: 'enterprise_id,module_id',
      })

    if (error) {
      console.error('Error granting module access:', error)
      throw new Error(`Failed to grant module access: ${error.message}`)
    }
  }

  /**
   * Revoke module access from an enterprise (Developer only)
   */
  async revokeModuleAccess(enterpriseId: string, moduleId: string): Promise<void> {
    const supabase = createClient()

    const { error } = await supabase
      .from('enterprise_module_access')
      .delete()
      .eq('enterprise_id', enterpriseId)
      .eq('module_id', moduleId)

    if (error) {
      console.error('Error revoking module access:', error)
      throw new Error(`Failed to revoke module access: ${error.message}`)
    }
  }

  // ============================================================================
  // MODULE ACCESS REQUESTS (OWNER → DEVELOPER)
  // ============================================================================

  /**
   * Request access to a module (Owner)
   * Checks for existing pending requests to prevent duplicates
   */
  async requestModuleAccess(
    enterpriseId: string,
    moduleId: string,
    ownerId: string,
    message?: string
  ): Promise<void> {
    const supabase = createClient()

    // Check for existing pending request
    const { data: existing } = await supabase
      .from('module_access_request')
      .select('id')
      .eq('enterprise_id', enterpriseId)
      .eq('module_id', moduleId)
      .eq('status', 'pending')
      .maybeSingle()

    if (existing) {
      throw new Error('Une demande d\'accès est déjà en attente pour ce module')
    }

    // Get enterprise and module info for notification
    const { data: enterprise } = await supabase
      .from('enterprise')
      .select('name')
      .eq('id', enterpriseId)
      .single() as { data: { name: string } | null }

    const { data: module } = await supabase
      .from('module')
      .select('name')
      .eq('id', moduleId)
      .single() as { data: { name: string } | null }

    const request: ModuleAccessRequestInsert = {
      enterprise_id: enterpriseId,
      module_id: moduleId,
      owner_id: ownerId,
      message: message || null,
      status: 'pending',
    }

    const { data: insertedRequest, error } = await supabase
      .from('module_access_request')
      .insert(request as any)
      .select()
      .single() as { data: { id: string } | null, error: any }

    if (error) {
      console.error('Error creating module access request:', error)
      throw new Error(`Failed to create access request: ${error.message}`)
    }

    // Create notification for all Developers
    try {
      await messagingService.createNotification({
        recipient_type: 'Developer',
        // recipient_id is null = all developers will see it
        title: 'Nouvelle demande d\'accès',
        content: `${enterprise?.name || 'Une entreprise'} demande l'accès au module "${module?.name || 'inconnu'}"`,
        type: 'module_access_request',
        priority: 'Info',
        resource_type: 'module_access_request',
        resource_id: insertedRequest?.id
      })
    } catch (notifError) {
      console.error('Error creating notification:', notifError)
      // Don't fail the request if notification fails
    }
  }

  /**
   * Get all pending module access requests (Developer)
   */
  async getAllPendingRequests(): Promise<ModuleAccessRequest[]> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('module_access_request')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching pending requests:', error)
      throw new Error(`Failed to fetch pending requests: ${error.message}`)
    }

    return data || []
  }

  /**
   * Get module access requests for a specific enterprise
   */
  async getEnterpriseRequests(enterpriseId: string): Promise<ModuleAccessRequest[]> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('module_access_request')
      .select('*')
      .eq('enterprise_id', enterpriseId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching enterprise requests:', error)
      throw new Error(`Failed to fetch requests: ${error.message}`)
    }

    return data || []
  }

  /**
   * Approve a module access request (Developer)
   * Grants access AND updates request status
   */
  async approveRequest(requestId: string, reviewedById: string): Promise<void> {
    const supabase = createClient()

    // Get request details
    const { data: request, error: fetchError } = await supabase
      .from('module_access_request')
      .select('*')
      .eq('id', requestId)
      .single()

    if (fetchError || !request) {
      throw new Error('Demande introuvable')
    }

    const requestData = request as any

    // Get module info for notification
    const { data: module } = await supabase
      .from('module')
      .select('name')
      .eq('id', requestData.module_id)
      .single() as { data: { name: string } | null }

    // Grant module access
    await this.grantModuleAccess(
      requestData.enterprise_id,
      requestData.module_id,
      reviewedById
    )

    // Update request status
    const { error: updateError } = await supabase
      .from('module_access_request')
      // @ts-ignore - Type issue with Supabase client after migration
      .update({
        status: 'approved',
        reviewed_by_id: reviewedById,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', requestId)

    if (updateError) {
      console.error('Error updating request status:', updateError)
      throw new Error(`Failed to update request: ${updateError.message}`)
    }

    // Create notification for the Owner
    try {
      await messagingService.createNotification({
        enterprise_id: requestData.enterprise_id,
        recipient_type: 'Owner',
        recipient_id: requestData.owner_id,
        title: 'Demande d\'accès approuvée',
        content: `Votre demande d'accès au module "${module?.name || 'inconnu'}" a été approuvée`,
        type: 'module_access_request',
        priority: 'Info',
        resource_type: 'module_access_request',
        resource_id: requestId
      })
    } catch (notifError) {
      console.error('Error creating notification:', notifError)
      // Don't fail the approval if notification fails
    }
  }

  /**
   * Reject a module access request (Developer)
   */
  async rejectRequest(requestId: string, reviewedById: string): Promise<void> {
    const supabase = createClient()

    // Get request details for notification
    const { data: request } = await supabase
      .from('module_access_request')
      .select('*')
      .eq('id', requestId)
      .single()

    const requestData = request as any

    // Get module info for notification
    const { data: module } = await supabase
      .from('module')
      .select('name')
      .eq('id', requestData?.module_id)
      .single() as { data: { name: string } | null }

    const { error } = await supabase
      .from('module_access_request')
      // @ts-ignore - Type issue with Supabase client after migration
      .update({
        status: 'rejected',
        reviewed_by_id: reviewedById,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', requestId)

    if (error) {
      console.error('Error rejecting request:', error)
      throw new Error(`Failed to reject request: ${error.message}`)
    }

    // Create notification for the Owner
    try {
      await messagingService.createNotification({
        enterprise_id: requestData.enterprise_id,
        recipient_type: 'Owner',
        recipient_id: requestData.owner_id,
        title: 'Demande d\'accès rejetée',
        content: `Votre demande d'accès au module "${module?.name || 'inconnu'}" a été rejetée`,
        type: 'module_access_request',
        priority: 'Warning',
        resource_type: 'module_access_request',
        resource_id: requestId
      })
    } catch (notifError) {
      console.error('Error creating notification:', notifError)
      // Don't fail the rejection if notification fails
    }
  }

  /**
   * Check if there's a pending request for a module
   */
  async hasPendingRequest(enterpriseId: string, moduleId: string): Promise<boolean> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('module_access_request')
      .select('id')
      .eq('enterprise_id', enterpriseId)
      .eq('module_id', moduleId)
      .eq('status', 'pending')
      .maybeSingle()

    if (error) {
      console.error('Error checking pending request:', error)
      return false
    }

    return !!data
  }
}

// Export singleton instance
export const modulesService = new ModulesService()
