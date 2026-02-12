import posthog from 'posthog-js'

// ============================================
// USER IDENTIFICATION
// ============================================

/**
 * Identify a user with their profile data
 * Call this after login to associate events with the user
 */
export function identifyUser(userId: string, properties?: {
  email?: string
  role?: 'Developer' | 'Owner' | 'Employee'
  enterprise_id?: string
  enterprise_name?: string
  nursery_id?: string
  nursery_name?: string
  first_name?: string
  last_name?: string
}) {
  if (typeof window === 'undefined') return

  posthog.identify(userId, {
    ...properties,
    $set_once: {
      first_seen: new Date().toISOString(),
    },
  })
}

/**
 * Reset user identity (call on logout)
 */
export function resetUser() {
  if (typeof window === 'undefined') return
  posthog.reset()
}

// ============================================
// PAGE & NAVIGATION EVENTS
// ============================================

/**
 * Track when user navigates to a specific module
 */
export function trackModuleVisit(moduleName: string, properties?: Record<string, unknown>) {
  posthog.capture('module_visited', {
    module: moduleName,
    ...properties,
  })
}

// ============================================
// FEATURE USAGE EVENTS
// ============================================

/**
 * Track when a feature is used
 */
export function trackFeatureUsed(featureName: string, properties?: Record<string, unknown>) {
  posthog.capture('feature_used', {
    feature: featureName,
    ...properties,
  })
}

/**
 * Track button/CTA clicks
 */
export function trackClick(elementName: string, properties?: Record<string, unknown>) {
  posthog.capture('element_clicked', {
    element: elementName,
    ...properties,
  })
}

// ============================================
// LUNIQO-SPECIFIC EVENTS
// ============================================

/**
 * Track cleaning session events
 */
export function trackSession(action: 'created' | 'completed' | 'viewed', properties?: {
  session_id?: string
  nursery_id?: string
  rooms_count?: number
  tasks_count?: number
  completion_rate?: number
}) {
  posthog.capture(`session_${action}`, properties)
}

/**
 * Track task completion
 */
export function trackTaskCompleted(properties: {
  task_id: string
  task_name: string
  room_name?: string
  nursery_id?: string
  time_to_complete_seconds?: number
}) {
  posthog.capture('task_completed', properties)
}

/**
 * Track HACCP module usage
 */
export function trackHaccpModule(moduleName: string, action: 'viewed' | 'entry_created' | 'entry_updated', properties?: Record<string, unknown>) {
  posthog.capture('haccp_module_action', {
    module: moduleName,
    action,
    ...properties,
  })
}

/**
 * Track tablet interface usage
 */
export function trackTabletUsage(action: 'login' | 'logout' | 'room_selected' | 'task_completed', properties?: Record<string, unknown>) {
  posthog.capture('tablet_action', {
    action,
    interface: 'tablet',
    ...properties,
  })
}

/**
 * Track nursery switching
 */
export function trackNurserySwitched(properties: {
  from_nursery_id?: string
  to_nursery_id: string
  nursery_name: string
}) {
  posthog.capture('nursery_switched', properties)
}

// ============================================
// ONBOARDING & SETUP
// ============================================

/**
 * Track onboarding funnel
 */
export function trackOnboarding(step: 'started' | 'enterprise_created' | 'nursery_created' | 'first_room_created' | 'first_employee_added' | 'completed', properties?: Record<string, unknown>) {
  posthog.capture('onboarding_step', {
    step,
    ...properties,
  })
}

// ============================================
// ERRORS & ISSUES
// ============================================

/**
 * Track errors encountered by users
 */
export function trackError(errorType: string, properties?: {
  error_message?: string
  page?: string
  user_action?: string
}) {
  posthog.capture('error_occurred', {
    error_type: errorType,
    ...properties,
  })
}

// ============================================
// FEATURE FLAGS (for A/B testing)
// ============================================

/**
 * Check if a feature flag is enabled
 */
export function isFeatureEnabled(flagName: string): boolean {
  if (typeof window === 'undefined') return false
  return posthog.isFeatureEnabled(flagName) ?? false
}

/**
 * Get feature flag value (for multivariate flags)
 */
export function getFeatureFlagValue(flagName: string): string | boolean | undefined {
  if (typeof window === 'undefined') return undefined
  return posthog.getFeatureFlag(flagName)
}

// ============================================
// GENERIC EVENT TRACKING
// ============================================

/**
 * Track any custom event
 */
export function trackEvent(eventName: string, properties?: Record<string, unknown>) {
  posthog.capture(eventName, properties)
}
