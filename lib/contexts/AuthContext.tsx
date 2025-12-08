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

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Cache duration: 30 seconds
const SESSION_CACHE_TTL = 30 * 1000

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const lastCheckTimestamp = useRef<number>(0)

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      setIsLoading(false)
      return
    }

    // Check initial session
    checkSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, supabaseSession) => {
      console.log('🔐 Auth state change:', event)

      if (event === 'SIGNED_IN' && supabaseSession) {
        await checkSession()
      } else if (event === 'SIGNED_OUT') {
        // Only clear session if it was an intentional logout
        console.warn('⚠️ SIGNED_OUT event detected, keeping session to prevent accidental logout')
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('🔄 Token refreshed successfully')
        await checkSession(true)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function checkSession(force = false) {
    // Cache: Skip if last check was less than 30 seconds ago (unless forced)
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
      setIsLoading(true)

      // Reduced timeout to 5 seconds
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Session check timeout')), 5000)
      )

      const sessionCheckPromise = (async () => {
        // Check Supabase Auth session
        const { data: { session: supabaseSession } } = await supabase.auth.getSession()

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
    } catch (error) {
      console.error('Session check error:', error)
      // On timeout/error, keep the previous session instead of logging out
      if (!previousSession) {
        setSession(null)
      } else {
        console.warn('Keeping previous session due to check failure')
        setSession(previousSession)
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function handleLoginWithEmail(credentials: EmailPasswordCredentials): Promise<AuthResponse> {
    const response = await loginWithEmail(credentials.email, credentials.password)

    if (response.success && response.data) {
      const newSession: AuthSession = {
        user: response.data,
        role: response.role!,
        enterprise: response.enterprise,
        accessibleRooms: response.accessibleRooms
      }
      setSession(newSession)

      // Role-based redirects
      if (response.role === 'Owner' && !response.enterprise) {
        // Owner without enterprise → setup
        setTimeout(() => router.push('/setup'), 100)
      } else if (response.role === 'Developer') {
        // Developer → analytics
        setTimeout(() => router.push('/analytics'), 100)
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
    }

    return response
  }

  async function handleLogout() {
    console.log('🚪 Intentional logout initiated')
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
