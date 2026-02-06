// Module Permissions Service
// Manages modules, module access permissions, and access requests
// Supports both enterprise-level (legacy) and nursery-level (new) granularity

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

// Types for nursery module access
export interface NurseryModuleAccess {
  id: string
  nursery_id: string
  module_id: string
  granted_at: string
  granted_by_id: string | null
  expires_at: string | null
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface NurseryModuleAccessRequest {
  id: string
  nursery_id: string
  module_id: string
  requested_by_id: string
  status: 'pending' | 'approved' | 'rejected'
  message: string | null
  reviewed_by_id: string | null
  reviewed_at: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
}

export interface ModuleAccessInfo {
  module_id: string
  granted_by_id: string | null  // NULL = Stripe, non-NULL = Manual
  expires_at: string | null
  notes: string | null
}

export interface NurseryWithModules {
  id: string
  name: string
  enterprise_id: string
  is_active: boolean
  modules: string[]  // For backwards compatibility
  moduleDetails: ModuleAccessInfo[]  // Detailed access info
}

export interface EnterpriseWithNurseries {
  id: string
  name: string
  owner_name: string
  owner_email?: string
  nurseries: NurseryWithModules[]
}

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

  // ============================================================================
  // NURSERY MODULE ACCESS (NEW - GRANULAR PERMISSIONS PER NURSERY)
  // ============================================================================

  /**
   * Get all enterprises with their nurseries and module access
   * Used for Developer permissions page
   */
  async getEnterprisesWithNurseries(): Promise<EnterpriseWithNurseries[]> {
    const supabase = createClient()

    // Get all enterprises with owner info
    const { data: enterprises, error: entError } = await supabase
      .from('enterprise')
      .select(`
        id,
        name,
        owner:profiles!enterprise_owner_id_fkey(first_name, last_name, email)
      `)
      .order('name')

    if (entError) {
      console.error('Error fetching enterprises:', entError)
      throw new Error(`Failed to fetch enterprises: ${entError.message}`)
    }

    // Get all nurseries
    const { data: nurseries, error: nursError } = await supabase
      .from('nursery')
      .select('id, name, enterprise_id, is_active')
      .eq('is_active', true)
      .order('name')

    if (nursError) {
      console.error('Error fetching nurseries:', nursError)
      throw new Error(`Failed to fetch nurseries: ${nursError.message}`)
    }

    // Get all nursery module access with details
    const { data: moduleAccess, error: accessError } = await supabase
      .from('nursery_module_access')
      .select('nursery_id, module_id, granted_by_id, expires_at, notes')
      .eq('is_active', true)

    if (accessError) {
      console.error('Error fetching module access:', accessError)
      throw new Error(`Failed to fetch module access: ${accessError.message}`)
    }

    // Build module access maps by nursery
    const modulesByNursery: Record<string, string[]> = {}
    const moduleDetailsByNursery: Record<string, ModuleAccessInfo[]> = {}
    ;(moduleAccess || []).forEach((access: any) => {
      if (!modulesByNursery[access.nursery_id]) {
        modulesByNursery[access.nursery_id] = []
        moduleDetailsByNursery[access.nursery_id] = []
      }
      modulesByNursery[access.nursery_id].push(access.module_id)
      moduleDetailsByNursery[access.nursery_id].push({
        module_id: access.module_id,
        granted_by_id: access.granted_by_id,
        expires_at: access.expires_at,
        notes: access.notes
      })
    })

    // Build result
    return (enterprises || []).map((enterprise: any) => {
      const owner = enterprise.owner
      const ownerName = owner ? `${owner.first_name || ''} ${owner.last_name || ''}`.trim() : 'N/A'

      const enterpriseNurseries = (nurseries || [])
        .filter((n: any) => n.enterprise_id === enterprise.id)
        .map((n: any) => ({
          id: n.id,
          name: n.name,
          enterprise_id: n.enterprise_id,
          is_active: n.is_active,
          modules: modulesByNursery[n.id] || [],
          moduleDetails: moduleDetailsByNursery[n.id] || []
        }))

      return {
        id: enterprise.id,
        name: enterprise.name,
        owner_name: ownerName,
        owner_email: owner?.email || undefined,
        nurseries: enterpriseNurseries
      }
    })
  }

  /**
   * Get module IDs accessible by a specific nursery
   */
  async getNurseryModules(nurseryId: string): Promise<string[]> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('nursery_module_access')
      .select('module_id')
      .eq('nursery_id', nurseryId)
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching nursery modules:', error)
      throw new Error(`Failed to fetch nursery modules: ${error.message}`)
    }

    return (data || []).map((row: any) => row.module_id)
  }

  /**
   * Check if a nursery has access to a specific module
   */
  async hasNurseryModuleAccess(nurseryId: string, moduleId: string): Promise<boolean> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('nursery_module_access')
      .select('id')
      .eq('nursery_id', nurseryId)
      .eq('module_id', moduleId)
      .eq('is_active', true)
      .maybeSingle()

    if (error) {
      console.error('Error checking nursery module access:', error)
      return false
    }

    return !!data
  }

  /**
   * Grant module access to a nursery (Developer only)
   */
  async grantNurseryModuleAccess(
    nurseryId: string,
    moduleId: string,
    grantedById: string,
    notes?: string,
    expiresAt?: string | null
  ): Promise<void> {
    const supabase = createClient()

    const { error } = await supabase
      .from('nursery_module_access')
      .upsert({
        nursery_id: nurseryId,
        module_id: moduleId,
        granted_by_id: grantedById,
        is_active: true,
        notes: notes || null,
        expires_at: expiresAt || null
      } as any, {
        onConflict: 'nursery_id,module_id',
      })

    if (error) {
      console.error('Error granting nursery module access:', error)
      throw new Error(`Failed to grant module access: ${error.message}`)
    }
  }

  /**
   * Revoke module access from a nursery (Developer only)
   */
  async revokeNurseryModuleAccess(nurseryId: string, moduleId: string): Promise<void> {
    const supabase = createClient()

    const { error } = await supabase
      .from('nursery_module_access')
      .delete()
      .eq('nursery_id', nurseryId)
      .eq('module_id', moduleId)

    if (error) {
      console.error('Error revoking nursery module access:', error)
      throw new Error(`Failed to revoke module access: ${error.message}`)
    }
  }

  /**
   * Bulk update modules for a nursery
   * @param nurseryId The nursery to update
   * @param moduleIds Array of module IDs that should be active
   * @param grantedById The developer granting access
   */
  async updateNurseryModules(
    nurseryId: string,
    moduleIds: string[],
    grantedById: string
  ): Promise<void> {
    // Get current modules
    const currentModules = await this.getNurseryModules(nurseryId)

    // Modules to add
    const toAdd = moduleIds.filter(m => !currentModules.includes(m))

    // Modules to remove (except 'base' which is always free)
    const toRemove = currentModules.filter(m => !moduleIds.includes(m) && m !== 'base')

    // Add new modules
    for (const moduleId of toAdd) {
      await this.grantNurseryModuleAccess(nurseryId, moduleId, grantedById)
    }

    // Remove revoked modules
    for (const moduleId of toRemove) {
      await this.revokeNurseryModuleAccess(nurseryId, moduleId)
    }
  }

  // ============================================================================
  // NURSERY MODULE ACCESS REQUESTS
  // ============================================================================

  /**
   * Get all pending nursery module access requests (Developer)
   */
  async getAllPendingNurseryRequests(): Promise<NurseryModuleAccessRequest[]> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('nursery_module_access_request')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching pending nursery requests:', error)
      throw new Error(`Failed to fetch pending requests: ${error.message}`)
    }

    return (data || []) as NurseryModuleAccessRequest[]
  }

  /**
   * Approve a nursery module access request (Developer)
   */
  async approveNurseryRequest(requestId: string, reviewedById: string): Promise<void> {
    const supabase = createClient()

    // Get request details
    const { data: request, error: fetchError } = await supabase
      .from('nursery_module_access_request')
      .select('*')
      .eq('id', requestId)
      .single()

    if (fetchError || !request) {
      throw new Error('Demande introuvable')
    }

    const requestData = request as any

    // Grant module access
    await this.grantNurseryModuleAccess(
      requestData.nursery_id,
      requestData.module_id,
      reviewedById
    )

    // Update request status
    const { error: updateError } = await supabase
      .from('nursery_module_access_request')
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
  }

  /**
   * Reject a nursery module access request (Developer)
   */
  async rejectNurseryRequest(requestId: string, reviewedById: string, reason?: string): Promise<void> {
    const supabase = createClient()

    const { error } = await supabase
      .from('nursery_module_access_request')
      // @ts-ignore - Type issue with Supabase client after migration
      .update({
        status: 'rejected',
        reviewed_by_id: reviewedById,
        reviewed_at: new Date().toISOString(),
        rejection_reason: reason || null,
      })
      .eq('id', requestId)

    if (error) {
      console.error('Error rejecting nursery request:', error)
      throw new Error(`Failed to reject request: ${error.message}`)
    }
  }
}

// Export singleton instance
export const modulesService = new ModulesService()
