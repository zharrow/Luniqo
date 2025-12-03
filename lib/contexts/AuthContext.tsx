'use client'

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { loginWithEmail, loginWithPin, logout as authLogout } from '@/lib/utils/auth.client'
import type {
  AuthContextType,
  AuthSession,
  EmailPasswordCredentials,
  PinCredentials,
  UserRole,
  Enterprise,
  AuthResponse
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

    // Listen for auth changes (for Super Admin/Admin)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, supabaseSession) => {
      console.log('🔐 Auth state change:', event)

      if (event === 'SIGNED_IN' && supabaseSession) {
        await checkSession()
      } else if (event === 'SIGNED_OUT') {
        // Only clear session if it was an intentional logout
        // Ignore SIGNED_OUT events when just switching apps
        console.warn('⚠️ SIGNED_OUT event detected, keeping session to prevent accidental logout')
        // Don't clear the session automatically
        // setSession(null)
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

      // Reduced timeout to 5 seconds (was 30s)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Session check timeout')), 5000)
      )

      const sessionCheckPromise = (async () => {
        // Check Supabase Auth session (Super Admin/Admin)
        const { data: { session: supabaseSession } } = await supabase.auth.getSession()

        if (supabaseSession) {
          const userEmail = supabaseSession.user.email

          if (!userEmail) {
            return null
          }

          // Check if Super Admin
          const { data: superAdmin, error: superAdminError } = await supabase
            .from('super_admin')
            .select('*')
            .eq('email', userEmail)
            .single()

          if (superAdmin && !superAdminError) {
            return {
              user: superAdmin as any,
              role: 'Developer' as const
            }
          }

          // Check if Admin
          const { data: admin, error: adminError } = await supabase
            .from('admin')
            .select('*')
            .eq('email', userEmail)
            .eq('is_active', true)
            .single()

          if (admin && !adminError) {
            // Fetch enterprise linked to this admin (enterprise.admin_id = admin.id)
            const { data: enterprise } = await supabase
              .from('enterprise')
              .select('*')
              .eq('admin_id', (admin as any).id)
              .single()

            return {
              user: admin as any,
              role: 'Admin' as const,
              enterprise: (enterprise as any) || undefined
            }
          }
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
      // Only clear session if we're on initial load (no previous session)
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
        enterprise: response.enterprise
      }
      setSession(newSession)

      // If Admin without enterprise, redirect to setup
      if (response.role === 'Admin' && !response.enterprise) {
        setTimeout(() => router.push('/setup'), 100)
      }
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
