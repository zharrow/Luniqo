'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/types/auth.types'
import type { Enterprise, Nursery } from '@/types/database.types'

// Tablet-specific session type (Employee only)
export interface TabletSession {
  user: Profile
  enterprise: Enterprise
  accessibleRooms: string[]
  selectedNursery: Nursery
  todayShifts: Array<{
    id: string
    start_time: string
    end_time: string
    status: string
    assigned_room_id?: string
    role_during_shift?: string
  }>
}

interface TabletAuthContextType {
  session: TabletSession | null
  isLoading: boolean
  setSession: (session: TabletSession | null) => void
  switchNursery: (nursery: Nursery, shifts: TabletSession['todayShifts']) => void
  logout: () => void
}

const TabletAuthContext = createContext<TabletAuthContextType | undefined>(undefined)

const SESSION_KEY = 'tablet_user_session'

export function TabletAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<TabletSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Load session from localStorage on mount
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      setIsLoading(false)
      return
    }

    loadSession()

    // Track last visibility change time
    let lastHiddenTime = 0

    // Handle visibility change (when user returns to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Store the time when tab was hidden
        lastHiddenTime = Date.now()
      } else if (document.visibilityState === 'visible') {
        // Only refresh if tab was hidden for more than 5 minutes
        const timeHidden = Date.now() - lastHiddenTime
        if (timeHidden > 5 * 60 * 1000) {
          loadSession()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  function loadSession() {
    try {
      if (typeof window === 'undefined') {
        setIsLoading(false)
        return
      }

      const stored = localStorage.getItem(SESSION_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as TabletSession
        setSessionState(parsed)
      }
    } catch (error) {
      console.error('Error loading tablet session:', error)
    } finally {
      setIsLoading(false)
    }
  }

  function setSession(newSession: TabletSession | null) {
    try {
      if (typeof window === 'undefined') return

      if (newSession) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(newSession))
        setSessionState(newSession)
      } else {
        localStorage.removeItem(SESSION_KEY)
        setSessionState(null)
      }
    } catch (error) {
      console.error('Error saving tablet session:', error)
    }
  }

  function switchNursery(nursery: Nursery, shifts: TabletSession['todayShifts']) {
    if (!session) return
    const updated: TabletSession = {
      ...session,
      selectedNursery: nursery,
      todayShifts: shifts
    }
    setSession(updated)
  }

  function logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SESSION_KEY)
    }
    setSessionState(null)
    router.push('/tablet/login')
  }

  const value: TabletAuthContextType = {
    session,
    isLoading,
    setSession,
    switchNursery,
    logout
  }

  return <TabletAuthContext.Provider value={value}>{children}</TabletAuthContext.Provider>
}

export function useTabletAuth() {
  const context = useContext(TabletAuthContext)
  if (context === undefined) {
    throw new Error('useTabletAuth must be used within a TabletAuthProvider')
  }
  return context
}

// Hook to protect tablet pages (redirects if no session)
export function useRequireTabletAuth() {
  const { session, isLoading, logout } = useTabletAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !session) {
      router.push('/tablet/login')
    }
  }, [session, isLoading, router])

  return { session, isLoading, logout }
}
