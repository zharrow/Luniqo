// Permissions Service
// High-level wrapper for checking route access permissions

import { modulesService } from './modules.service'
import { getModuleForRoute } from '@/lib/config/module-routes'

class PermissionsService {
  /**
   * Check if an enterprise can access a specific route
   * @param enterpriseId - The enterprise ID
   * @param pathname - The route pathname (e.g., '/owner/children')
   * @returns true if access is granted, false otherwise
   */
  async canAccessRoute(enterpriseId: string, pathname: string): Promise<boolean> {
    const moduleId = getModuleForRoute(pathname)

    // If no module required for this route, allow access
    if (!moduleId) {
      return true
    }

    // Check if enterprise has access to the required module
    return await modulesService.hasModuleAccess(enterpriseId, moduleId)
  }

  /**
   * Get all accessible module IDs for an enterprise
   * @param enterpriseId - The enterprise ID
   * @returns Array of module IDs (e.g., ['base', 'cleaning'])
   */
  async getAccessibleModules(enterpriseId: string): Promise<string[]> {
    return await modulesService.getEnterpriseModules(enterpriseId)
  }

  /**
   * Check if a specific module is accessible
   * @param enterpriseId - The enterprise ID
   * @param moduleId - The module ID
   * @returns true if accessible, false otherwise
   */
  async hasModuleAccess(enterpriseId: string, moduleId: string): Promise<boolean> {
    return await modulesService.hasModuleAccess(enterpriseId, moduleId)
  }
}

// Export singleton instance
export const permissionsService = new PermissionsService()
