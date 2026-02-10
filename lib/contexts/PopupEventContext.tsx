'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/contexts/AuthContext'
import { popupEventsService, PopupEvent } from '@/lib/services/popup-events.service'

// ============================================================================
// TYPES
// ============================================================================

interface PopupEventContextType {
  /** Current popup to display (null if none) */
  currentPopup: PopupEvent | null

  /** Queue of pending popups (sorted by priority) */
  pendingPopups: PopupEvent[]

  /** Dismiss current popup (optionally with "don't show again") */
  dismissPopup: (dontShowAgain?: boolean) => Promise<void>

  /** Record CTA button click */
  onCtaClick: () => Promise<void>

  /** Record promo code copy */
  onPromoCopy: () => Promise<void>

  /** Manual trigger for testing */
  triggerPopup: (eventKey: string) => Promise<void>

  /** Loading state */
  isLoading: boolean
}

// ============================================================================
// CONTEXT
// ============================================================================

const PopupEventContext = createContext<PopupEventContextType | undefined>(undefined)

// ============================================================================
// PROVIDER
// ============================================================================

export function PopupEventProvider({ children }: { children: React.ReactNode }) {
  const { session, isLoading: authLoading } = useAuth()
  const [pendingPopups, setPendingPopups] = useState<PopupEvent[]>([])
  const [currentPopup, setCurrentPopup] = useState<PopupEvent | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const hasLoaded = useRef(false)

  // Load popup events when user session is ready
  useEffect(() => {
    // Skip if already loaded or auth still loading
    if (hasLoaded.current || authLoading) return

    // Skip if no session
    if (!session?.user?.id) {
      setIsLoading(false)
      return
    }

    hasLoaded.current = true
    loadPopupEvents()
  }, [session?.user?.id, authLoading])

  const loadPopupEvents = useCallback(async () => {
    if (!session?.user?.id) return

    setIsLoading(true)
    try {
      // Get enterprise created_at for welcome popup detection
      const enterpriseCreatedAt = session.enterprise?.created_at || null

      // Check if first-login welcome should be shown
      const shouldShowWelcome = await popupEventsService.shouldShowWelcomePopup(
        session.user.id,
        enterpriseCreatedAt
      )

      // Get all active events for user
      const events = await popupEventsService.getActiveEventsForUser(
        session.user.id,
        session.role,
        session.enterprise?.id
      )

      // Filter based on special conditions
      let filteredEvents = events

      // If welcome should not be shown, remove it from the list
      if (!shouldShowWelcome) {
        filteredEvents = events.filter(e => e.event_type !== 'first_login_after_setup')
      }

      // Sort by priority (highest first)
      const sortedEvents = filteredEvents.sort((a, b) => b.priority - a.priority)

      setPendingPopups(sortedEvents)

      // Show first popup if any
      if (sortedEvents.length > 0) {
        const firstPopup = sortedEvents[0]
        setCurrentPopup(firstPopup)
        // Record view
        await popupEventsService.recordView(session.user.id, firstPopup.id)
      }
    } catch (error) {
      console.error('Error loading popup events:', error)
    } finally {
      setIsLoading(false)
    }
  }, [session])

  const dismissPopup = useCallback(async (dontShowAgain: boolean = false) => {
    if (!currentPopup || !session?.user?.id) return

    // Record dismissal in database
    await popupEventsService.recordDismissal(
      session.user.id,
      currentPopup.id,
      dontShowAgain
    )

    // Move to next popup or clear
    const remaining = pendingPopups.filter(p => p.id !== currentPopup.id)
    setPendingPopups(remaining)

    if (remaining.length > 0) {
      const nextPopup = remaining[0]
      setCurrentPopup(nextPopup)
      await popupEventsService.recordView(session.user.id, nextPopup.id)
    } else {
      setCurrentPopup(null)
    }
  }, [currentPopup, pendingPopups, session])

  const onCtaClick = useCallback(async () => {
    if (!currentPopup || !session?.user?.id) return
    await popupEventsService.recordCtaClick(session.user.id, currentPopup.id)
  }, [currentPopup, session])

  const onPromoCopy = useCallback(async () => {
    if (!currentPopup || !session?.user?.id) return
    await popupEventsService.recordPromoCopy(session.user.id, currentPopup.id)
  }, [currentPopup, session])

  const triggerPopup = useCallback(async (eventKey: string) => {
    if (!session?.user?.id) return

    const event = await popupEventsService.getEventByKey(eventKey)
    if (event) {
      setCurrentPopup(event)
      await popupEventsService.recordView(session.user.id, event.id)
    }
  }, [session])

  return (
    <PopupEventContext.Provider
      value={{
        currentPopup,
        pendingPopups,
        dismissPopup,
        onCtaClick,
        onPromoCopy,
        triggerPopup,
        isLoading
      }}
    >
      {children}
    </PopupEventContext.Provider>
  )
}

// ============================================================================
// HOOK
// ============================================================================

export function usePopupEvent() {
  const context = useContext(PopupEventContext)
  if (!context) {
    throw new Error('usePopupEvent must be used within PopupEventProvider')
  }
  return context
}
