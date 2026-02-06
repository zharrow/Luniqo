// Module → Routes Mapping Configuration
// Maps each module ID to the routes it protects

export interface ModuleRouteMapping {
  moduleId: string
  routes: string[]
}

/**
 * Maps module IDs to their protected routes
 * Used for determining which module is required to access a given route
 */
export const MODULE_ROUTES: ModuleRouteMapping[] = [
  {
    moduleId: 'base',
    routes: [
      '/owner/dashboard',
      '/owner/nurseries',
      '/owner/profile',
      '/owner/messages',
      '/owner/users',
      '/setup',
    ],
  },
  {
    moduleId: 'cleaning',
    routes: ['/owner/rooms', '/owner/tasks', '/owner/sessions', '/owner/history'],
  },
  {
    moduleId: 'haccp',
    routes: ['/owner/haccp'],
  },
  {
    moduleId: 'children',
    routes: ['/owner/children', '/owner/families', '/owner/sections'],
  },
  {
    moduleId: 'attendance',
    routes: ['/owner/activities', '/owner/observations'],
  },
  {
    moduleId: 'staff',
    routes: ['/owner/staff', '/owner/planning', '/owner/absences', '/owner/compliance'],
  },
  {
    moduleId: 'enrollment',
    routes: [
      '/owner/applications',
      '/owner/waiting-list',
      '/owner/admissions',
      '/owner/contracts',
      '/owner/rate-grids',
    ],
  },
  {
    moduleId: 'billing',
    routes: ['/owner/billing'],
  },
  {
    moduleId: 'parent_portal',
    routes: ['/owner/parent-portal'],
  },
]

/**
 * Get the required module ID for a given route pathname
 * @param pathname - The route pathname (e.g., '/owner/children')
 * @returns The module ID required, or null if no module required
 */
export function getModuleForRoute(pathname: string): string | null {
  for (const mapping of MODULE_ROUTES) {
    if (mapping.routes.some((route) => pathname.startsWith(route))) {
      return mapping.moduleId
    }
  }
  return null
}

/**
 * Get all routes protected by a specific module
 * @param moduleId - The module ID
 * @returns Array of route paths
 */
export function getRoutesForModule(moduleId: string): string[] {
  const mapping = MODULE_ROUTES.find((m) => m.moduleId === moduleId)
  return mapping?.routes || []
}
