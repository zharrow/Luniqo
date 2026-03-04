import { createClient } from '@/lib/supabase/client'

// ============================================================================
// TYPES
// ============================================================================

export type PopupEventType =
  | 'first_login_after_setup'
  | 'seasonal_valentine'
  | 'seasonal_christmas'
  | 'seasonal_new_year'
  | 'promotional'
  | 'announcement'

export type PopupTheme =
  | 'neutral'
  | 'valentine'
  | 'christmas'
  | 'celebration'
  | 'warning'
  | 'success'

export interface PopupEvent {
  id: string
  event_key: string
  event_type: PopupEventType
  title: string
  description: string | null
  image_url: string | null
  emoji: string | null
  theme: PopupTheme
  custom_styles: Record<string, unknown> | null
  cta_label: string | null
  cta_url: string | null
  promo_code: string | null
  promo_description: string | null
  target_roles: string[]
  target_enterprise_ids: string[]
  start_date: string | null
  end_date: string | null
  dismissible: boolean
  show_dont_show_again: boolean
  priority: number
  max_views: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UserPopupView {
  id: string
  user_id: string
  popup_event_id: string
  view_count: number
  first_viewed_at: string
  last_viewed_at: string
  dismissed_at: string | null
  dont_show_again: boolean
  cta_clicked_at: string | null
  promo_copied_at: string | null
}

// ============================================================================
// POPUP EVENTS SERVICE
// Note: Uses 'as any' casts because popup tables don't exist in generated types yet
// ============================================================================

export class PopupEventsService {
  private supabase = createClient()

  /**
   * Get all active popup events for a user based on their role
   * Filters by: active status, date range, role targeting, not dismissed
   */
  async getActiveEventsForUser(
    userId: string,
    userRole: string,
    enterpriseId?: string
  ): Promise<PopupEvent[]> {
    const now = new Date().toISOString()

    // Get all active events within date range
    const { data: events, error } = await (this.supabase as any)
      .from('popup_event')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false })

    if (error) {
      console.error('Error fetching popup events:', error.message || JSON.stringify(error))
      return []
    }

    if (!events || events.length === 0) {
      return []
    }

    // Filter by date range
    const dateFilteredEvents = (events as PopupEvent[]).filter((event) => {
      const startOk = !event.start_date || new Date(event.start_date) <= new Date(now)
      const endOk = !event.end_date || new Date(event.end_date) >= new Date(now)
      return startOk && endOk
    })

    // Filter by role (if target_roles is empty or null, show to all)
    const roleFilteredEvents = dateFilteredEvents.filter((event) => {
      if (!event.target_roles || event.target_roles.length === 0) {
        return true
      }
      return event.target_roles.includes(userRole)
    })

    // Filter by enterprise (if target_enterprise_ids is set)
    const enterpriseFilteredEvents = roleFilteredEvents.filter((event) => {
      if (!event.target_enterprise_ids || event.target_enterprise_ids.length === 0) {
        return true
      }
      return enterpriseId && event.target_enterprise_ids.includes(enterpriseId)
    })

    // Get user's view history for these events
    const eventIds = enterpriseFilteredEvents.map((e) => e.id)

    if (eventIds.length === 0) {
      return []
    }

    const { data: views } = await (this.supabase as any)
      .from('user_popup_view')
      .select('*')
      .eq('user_id', userId)
      .in('popup_event_id', eventIds)

    const viewMap = new Map<string, UserPopupView>(
      ((views || []) as UserPopupView[]).map((v) => [v.popup_event_id, v])
    )

    // Filter out events user has dismissed with "don't show again"
    // or has exceeded max_views
    return enterpriseFilteredEvents.filter((event) => {
      const view = viewMap.get(event.id)
      if (!view) return true // Never seen

      if (view.dont_show_again) return false

      if (event.max_views && view.view_count >= event.max_views) {
        return false
      }

      return true
    })
  }

  /**
   * Check if first-login welcome popup should be shown
   * Logic: Enterprise created recently (within 10 min) AND welcome not yet shown
   */
  async shouldShowWelcomePopup(
    userId: string,
    enterpriseCreatedAt: string | null
  ): Promise<boolean> {
    if (!enterpriseCreatedAt) return false

    // Get the welcome event
    const { data: welcomeEvent, error: eventError } = await (this.supabase as any)
      .from('popup_event')
      .select('id')
      .eq('event_key', 'welcome_after_setup')
      .eq('is_active', true)
      .single()

    if (eventError || !welcomeEvent) {
      return false
    }

    // Check if welcome event was already shown
    const { data: existingView } = await (this.supabase as any)
      .from('user_popup_view')
      .select('id')
      .eq('user_id', userId)
      .eq('popup_event_id', welcomeEvent.id)
      .single()

    if (existingView) return false

    // Check if enterprise was created recently (within 10 minutes)
    const createdAt = new Date(enterpriseCreatedAt)
    const now = new Date()
    const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60)

    return diffMinutes <= 10
  }

  /**
   * Get a specific popup event by key
   */
  async getEventByKey(eventKey: string): Promise<PopupEvent | null> {
    const { data, error } = await (this.supabase as any)
      .from('popup_event')
      .select('*')
      .eq('event_key', eventKey)
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('Error fetching popup event:', error)
      return null
    }

    return data as PopupEvent
  }

  /**
   * Record that a user has viewed a popup
   */
  async recordView(userId: string, popupEventId: string): Promise<void> {
    const { data: existing } = await (this.supabase as any)
      .from('user_popup_view')
      .select('id, view_count')
      .eq('user_id', userId)
      .eq('popup_event_id', popupEventId)
      .single()

    if (existing) {
      // Update existing view
      await (this.supabase as any)
        .from('user_popup_view')
        .update({
          view_count: existing.view_count + 1,
          last_viewed_at: new Date().toISOString()
        })
        .eq('id', existing.id)
    } else {
      // Create new view record
      await (this.supabase as any)
        .from('user_popup_view')
        .insert({
          user_id: userId,
          popup_event_id: popupEventId,
          view_count: 1,
          first_viewed_at: new Date().toISOString(),
          last_viewed_at: new Date().toISOString()
        })
    }
  }

  /**
   * Record user dismissal (with optional "don't show again")
   */
  async recordDismissal(
    userId: string,
    popupEventId: string,
    dontShowAgain: boolean = false
  ): Promise<void> {
    const { data: existing } = await (this.supabase as any)
      .from('user_popup_view')
      .select('id')
      .eq('user_id', userId)
      .eq('popup_event_id', popupEventId)
      .single()

    if (existing) {
      await (this.supabase as any)
        .from('user_popup_view')
        .update({
          dismissed_at: new Date().toISOString(),
          dont_show_again: dontShowAgain
        })
        .eq('id', existing.id)
    } else {
      await (this.supabase as any)
        .from('user_popup_view')
        .insert({
          user_id: userId,
          popup_event_id: popupEventId,
          dismissed_at: new Date().toISOString(),
          dont_show_again: dontShowAgain
        })
    }
  }

  /**
   * Record CTA button click
   */
  async recordCtaClick(userId: string, popupEventId: string): Promise<void> {
    const { data: existing } = await (this.supabase as any)
      .from('user_popup_view')
      .select('id')
      .eq('user_id', userId)
      .eq('popup_event_id', popupEventId)
      .single()

    if (existing) {
      await (this.supabase as any)
        .from('user_popup_view')
        .update({
          cta_clicked_at: new Date().toISOString()
        })
        .eq('id', existing.id)
    } else {
      await (this.supabase as any)
        .from('user_popup_view')
        .insert({
          user_id: userId,
          popup_event_id: popupEventId,
          cta_clicked_at: new Date().toISOString()
        })
    }
  }

  /**
   * Record promo code copy
   */
  async recordPromoCopy(userId: string, popupEventId: string): Promise<void> {
    const { data: existing } = await (this.supabase as any)
      .from('user_popup_view')
      .select('id')
      .eq('user_id', userId)
      .eq('popup_event_id', popupEventId)
      .single()

    if (existing) {
      await (this.supabase as any)
        .from('user_popup_view')
        .update({
          promo_copied_at: new Date().toISOString()
        })
        .eq('id', existing.id)
    } else {
      await (this.supabase as any)
        .from('user_popup_view')
        .insert({
          user_id: userId,
          popup_event_id: popupEventId,
          promo_copied_at: new Date().toISOString()
        })
    }
  }

  // ============================================================================
  // ADMIN METHODS (Developer only)
  // ============================================================================

  /**
   * Get all popup events (for admin panel)
   */
  async getAllEvents(): Promise<PopupEvent[]> {
    const { data, error } = await (this.supabase as any)
      .from('popup_event')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching all popup events:', error)
      return []
    }

    return (data || []) as PopupEvent[]
  }

  /**
   * Get popup event by ID
   */
  async getEventById(id: string): Promise<PopupEvent | null> {
    const { data, error } = await (this.supabase as any)
      .from('popup_event')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching popup event:', error)
      return null
    }

    return data as PopupEvent
  }

  /**
   * Create a new popup event
   */
  async createEvent(event: Omit<PopupEvent, 'id' | 'created_at' | 'updated_at'>): Promise<PopupEvent | null> {
    const { data, error } = await (this.supabase as any)
      .from('popup_event')
      .insert(event)
      .select()
      .single()

    if (error) {
      console.error('Error creating popup event:', error)
      throw new Error(error.message)
    }

    return data as PopupEvent
  }

  /**
   * Update a popup event
   */
  async updateEvent(id: string, updates: Partial<PopupEvent>): Promise<PopupEvent | null> {
    const { data, error } = await (this.supabase as any)
      .from('popup_event')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating popup event:', error)
      throw new Error(error.message)
    }

    return data as PopupEvent
  }

  /**
   * Delete a popup event
   */
  async deleteEvent(id: string): Promise<boolean> {
    const { error } = await (this.supabase as any)
      .from('popup_event')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting popup event:', error)
      throw new Error(error.message)
    }

    return true
  }

  /**
   * Toggle popup event active status
   */
  async toggleEventActive(id: string, isActive: boolean): Promise<PopupEvent | null> {
    return this.updateEvent(id, { is_active: isActive })
  }

  /**
   * Get analytics for a popup event
   */
  async getEventAnalytics(popupEventId: string): Promise<{
    total_views: number
    unique_viewers: number
    cta_clicks: number
    promo_copies: number
    dismissals: number
    dont_show_again_count: number
  }> {
    const { data, error } = await (this.supabase as any)
      .from('user_popup_view')
      .select('*')
      .eq('popup_event_id', popupEventId)

    if (error || !data) {
      return {
        total_views: 0,
        unique_viewers: 0,
        cta_clicks: 0,
        promo_copies: 0,
        dismissals: 0,
        dont_show_again_count: 0
      }
    }

    const views = data as UserPopupView[]
    return {
      total_views: views.reduce((sum, v) => sum + v.view_count, 0),
      unique_viewers: views.length,
      cta_clicks: views.filter(v => v.cta_clicked_at).length,
      promo_copies: views.filter(v => v.promo_copied_at).length,
      dismissals: views.filter(v => v.dismissed_at).length,
      dont_show_again_count: views.filter(v => v.dont_show_again).length
    }
  }
}

// Singleton instance
export const popupEventsService = new PopupEventsService()
