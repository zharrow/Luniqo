'use client'

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { loginWithEmail, loginWithPin, logout as authLogout } from '@/lib/utils/auth.client'
import type {
  AuthContextType,
  AuthSession,
  EmailPasswordCredentials,
  UsernameCredentials,
  UserRole,
  AuthResponse,
  Profile
} from '@/types/auth.types'
import { identifyUser, resetUser } from '@/lib/analytics/posthog'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Cache duration: 5 minutes (plus long pour éviter les déconnexions)
const SESSION_CACHE_TTL = 5 * 60 * 1000
const SESSION_STORAGE_KEY = 'luniqo_auth_session'
const SESSION_TIMESTAMP_KEY = 'luniqo_auth_timestamp'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Initialize session from localStorage BEFORE first render (synchronous)
  const [session, setSessionState] = useState<AuthSession | null>(() => {
    if (typeof window === 'undefined') return null

    try {
      const savedSession = localStorage.getItem(SESSION_STORAGE_KEY)
      const savedTimestamp = localStorage.getItem(SESSION_TIMESTAMP_KEY)

      if (savedSession && savedTimestamp) {
        const timestamp = parseInt(savedTimestamp, 10)
        const age = Date.now() - timestamp

        // If session is less than 5 minutes old, restore it
        if (age < SESSION_CACHE_TTL) {
          console.log('🚀 Pre-loaded session from localStorage (age: ' + Math.round(age / 1000) + 's)')
          return JSON.parse(savedSession) as AuthSession
        }
      }
    } catch (e) {
      console.error('Failed to pre-load session:', e)
    }

    return null
  })

  // If we have a pre-loaded session, start with isLoading = false
  const [isLoading, setIsLoading] = useState(() => session === null)
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const lastCheckTimestamp = useRef<number>(0)
  const hasInitialized = useRef(false)
  const sessionRef = useRef<AuthSession | null>(session) // Ref to track current session for callbacks

  // Keep sessionRef in sync with session state
  useEffect(() => {
    sessionRef.current = session
  }, [session])

  // Wrapper to save session to localStorage automatically
  const setSession = (newSession: AuthSession | null) => {
    setSessionState(newSession)
    sessionRef.current = newSession  // Update ref immediately

    if (newSession) {
      // Save to localStorage with timestamp
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession))
      localStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString())
    } else {
      // Clear localStorage on logout
      localStorage.removeItem(SESSION_STORAGE_KEY)
      localStorage.removeItem(SESSION_TIMESTAMP_KEY)
    }
  }

  // Run initialization only once
  useEffect(() => {
    // Prevent multiple initializations
    if (hasInitialized.current) return
    hasInitialized.current = true

    // Only run on client side
    if (typeof window === 'undefined') {
      setIsLoading(false)
      return
    }

    // If we already have a session (pre-loaded), just do silent background check
    if (session) {
      const savedTimestamp = localStorage.getItem(SESSION_TIMESTAMP_KEY)
      if (savedTimestamp) {
        lastCheckTimestamp.current = parseInt(savedTimestamp, 10)
      }

      console.log('✅ Using pre-loaded session, refreshing silently in background')
      // Refresh in background (non-blocking and SILENT)
      checkSession(true, true).catch(console.error)
    } else {
      // No pre-loaded session, do full check with loading
      console.log('🔍 No session found, checking with server...')
      checkSession(false, false)
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, supabaseSession) => {
      console.log('🔐 Auth state change:', event)

      if (event === 'SIGNED_IN' && supabaseSession) {
        // If we already have a session, do a silent refresh (use ref to avoid stale closure)
        const hasExistingSession = sessionRef.current !== null
        await checkSession(true, hasExistingSession)
      } else if (event === 'SIGNED_OUT') {
        // Only clear session if it was an intentional logout
        console.warn('⚠️ SIGNED_OUT event detected, keeping session to prevent accidental logout')
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('🔄 Token refreshed successfully')
        await checkSession(true, true)  // Force refresh but SILENT (no loading state)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function checkSession(force = false, silent = false) {
    // Cache: Skip if last check was less than 5 minutes ago (unless forced)
    const now = Date.now()
    const timeSinceLastCheck = now - lastCheckTimestamp.current

    if (!force && session && timeSinceLastCheck < SESSION_CACHE_TTL) {
      console.log(`⚡ Using cached session (checked ${Math.round(timeSinceLastCheck / 1000)}s ago)`)
      setIsLoading(false)
      return
    }

    // Store current session before check
    const previousSession = session

    try {
      // Si silent = true, on ne met pas isLoading à true (vérification en arrière-plan)
      if (!silent) {
        setIsLoading(true)
      }

      // Reduced timeout to 5 seconds
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Session check timeout')), 5000)
      )

      const sessionCheckPromise = (async () => {
        // Check Supabase Auth session
        const { data: { session: supabaseSession }, error: sessionError } = await supabase.auth.getSession()

        // Handle refresh token errors gracefully
        if (sessionError) {
          console.error('Session error:', sessionError.message)
          // If refresh token is invalid, clear local session
          if (sessionError.message?.includes('Refresh Token') || sessionError.code === 'refresh_token_not_found') {
            console.warn('⚠️ Refresh token invalid, clearing session')
            return null
          }
        }

        if (supabaseSession) {
          // Get profile from unified profiles table
          const { data: profile, error: profileError } = await (supabase
            .from('profiles')
            .select('*')
            .eq('id', supabaseSession.user.id)
            .eq('is_active', true)
            .single() as any) as { data: Profile | null, error: any }

          if (!profile || profileError) {
            console.error('Profile not found:', profileError)
            return null
          }

          const authSession: AuthSession = {
            user: profile,
            role: profile.role
          }

          // For Owner, fetch their enterprise
          if (profile.role === 'Owner') {
            const { data: enterprise } = await supabase
              .from('enterprise')
              .select('*')
              .eq('owner_id', profile.id)
              .single()

            authSession.enterprise = enterprise || null

            // Load accessible modules for this enterprise
            const enterpriseData = enterprise as any
            if (enterpriseData?.id) {
              const { data: modules } = await supabase
                .from('enterprise_module_access')
                .select('module_id')
                .eq('enterprise_id', enterpriseData.id)
                .eq('is_active', true)

              authSession.accessibleModules = (modules || []).map((m: any) => m.module_id)
            }
          }

          // For Employee, fetch their enterprise and accessible rooms
          if (profile.role === 'Employee' && profile.enterprise_id) {
            const { data: enterprise } = await supabase
              .from('enterprise')
              .select('*')
              .eq('id', profile.enterprise_id)
              .single()

            authSession.enterprise = enterprise || null

            // Get accessible rooms
            const { data: rooms } = await supabase
              .from('employee_room_access')
              .select('room_id')
              .eq('employee_id', profile.id)

            authSession.accessibleRooms = (rooms || []).map((r: { room_id: string }) => r.room_id)
          }

          return authSession
        }

        return null
      })()

      const result = await Promise.race([sessionCheckPromise, timeoutPromise])
      setSession(result as AuthSession | null)

      // Update cache timestamp on successful check
      lastCheckTimestamp.current = Date.now()
    } catch (error: any) {
      console.error('Session check error:', error)

      // Check if it's an auth error (refresh token invalid, etc.)
      const isAuthError = error?.__isAuthError ||
        error?.code === 'refresh_token_not_found' ||
        error?.message?.includes('Refresh Token')

      if (isAuthError) {
        // Auth errors mean the session is truly invalid - clear it
        console.warn('⚠️ Auth error detected, clearing session')
        setSession(null)
      } else if (!previousSession) {
        // No previous session, nothing to keep
        setSession(null)
      } else {
        // Network/timeout error - keep previous session
        console.warn('Keeping previous session due to check failure (network error)')
        setSessionState(previousSession) // Use setSessionState to avoid re-saving
      }
    } finally {
      // Only set isLoading to false if not in silent mode
      if (!silent) {
        setIsLoading(false)
      }
    }
  }

  async function handleLoginWithEmail(credentials: EmailPasswordCredentials): Promise<AuthResponse> {
    const response = await loginWithEmail(credentials.email, credentials.password)

    if (response.success && response.data) {
      const newSession: AuthSession = {
        user: response.data,
        role: response.role!,
        enterprise: response.enterprise,
        accessibleRooms: response.accessibleRooms,
        accessibleModules: response.accessibleModules
      }
      setSession(newSession)

      // Identify user in PostHog
      identifyUser(response.data.id, {
        email: response.data.email,
        role: response.role,
        enterprise_id: response.enterprise?.id,
        enterprise_name: response.enterprise?.name,
        first_name: response.data.first_name || undefined,
        last_name: response.data.last_name || undefined,
      })

      // Role-based redirects
      if (response.role === 'Owner' && !response.enterprise) {
        // Owner without enterprise → setup
        setTimeout(() => router.push('/setup'), 100)
      } else if (response.role === 'Developer') {
        // Developer → dashboard
        setTimeout(() => router.push('/developer/dashboard'), 100)
      } else if (response.role === 'Owner') {
        // Owner with enterprise → dashboard
        setTimeout(() => router.push('/owner/dashboard'), 100)
      } else if (response.role === 'Employee') {
        // Employee → employee dashboard
        setTimeout(() => router.push('/employee/dashboard'), 100)
      }
    }

    return response
  }

  async function handleLoginWithPin(credentials: UsernameCredentials): Promise<AuthResponse> {
    const response = await loginWithPin(credentials)

    if (response.success && response.data) {
      const newSession: AuthSession = {
        user: response.data,
        role: 'Employee',
        enterprise: response.enterprise,
        accessibleRooms: response.accessibleRooms
      }
      setSession(newSession)

      // Identify user in PostHog (tablet login)
      identifyUser(response.data.id, {
        email: response.data.email,
        role: 'Employee',
        enterprise_id: response.enterprise?.id,
        enterprise_name: response.enterprise?.name,
        first_name: response.data.first_name || undefined,
        last_name: response.data.last_name || undefined,
      })
    }

    return response
  }

  async function handleLogout() {
    console.log('🚪 Intentional logout initiated')
    // Reset PostHog user identity
    resetUser()
    // Clear session first to prevent race conditions
    setSession(null)
    // Then clear Supabase auth
    await authLogout()
    // Finally redirect
    router.push('/login')
  }

  async function refreshSession() {
    // Force refresh (bypass cache)
    await checkSession(true)
  }

  const value: AuthContextType = {
    session,
    isLoading,
    role: session?.role || null,
    enterprise: session?.enterprise || null,
    loginWithEmail: handleLoginWithEmail,
    loginWithPin: handleLoginWithPin,
    logout: handleLogout,
    refreshSession
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Helper hooks
export function useRequireAuth(allowedRoles?: UserRole[]) {
  const { session, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !session) {
      router.push('/login')
    }

    if (!isLoading && session && allowedRoles && !allowedRoles.includes(session.role)) {
      router.push('/unauthorized')
    }
  }, [session, isLoading, allowedRoles, router])

  return { session, isLoading }
}

export function useEnterprise() {
  const { enterprise } = useAuth()
  return enterprise
}

export function useRole() {
  const { role } = useAuth()
  return role
}

/**
 * Hook to check if a specific module is accessible
 * @param moduleId - The module ID to check (e.g., 'cleaning', 'haccp')
 * @returns true if the module is accessible, false otherwise
 */
export function useModuleAccess(moduleId: string): boolean {
  const { session } = useAuth()
  if (!session?.accessibleModules) return false
  return session.accessibleModules.includes(moduleId)
}
