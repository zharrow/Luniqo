'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const [supabase] = useState(() => createClient())

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
      if (event === 'SIGNED_IN' && supabaseSession) {
        await checkSession()
      } else if (event === 'SIGNED_OUT') {
        setSession(null)
      }
    })

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
          checkSession()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  async function checkSession() {
    // Store current session before check
    const previousSession = session

    try {
      setIsLoading(true)

      // Add timeout to prevent infinite loading (30 seconds)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Session check timeout')), 30000)
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
    console.log('🎯 AuthContext: handleLoginWithEmail called')
    const response = await loginWithEmail(credentials.email, credentials.password)
    console.log('🎯 AuthContext: loginWithEmail response:', response)

    if (response.success && response.data) {
      console.log('🎯 AuthContext: Creating new session...')
      const newSession: AuthSession = {
        user: response.data,
        role: response.role!,
        enterprise: response.enterprise
      }
      setSession(newSession)
      console.log('🎯 AuthContext: Session set successfully')
    }

    console.log('🎯 AuthContext: Returning response')
    return response
  }

  async function handleLogout() {
    await authLogout()
    setSession(null)
    router.push('/login')
  }

  async function refreshSession() {
    await checkSession()
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
