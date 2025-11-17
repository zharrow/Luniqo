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
  const supabase = createClient()

  useEffect(() => {
    // Check initial session
    checkSession()

    // Listen for auth changes (for Developer/Admin)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, supabaseSession) => {
      if (event === 'SIGNED_IN' && supabaseSession) {
        await checkSession()
      } else if (event === 'SIGNED_OUT') {
        setSession(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function checkSession() {
    try {
      setIsLoading(true)

      // Check Supabase Auth session (Developer/Admin)
      const { data: { session: supabaseSession } } = await supabase.auth.getSession()

      if (supabaseSession) {
        const firebaseUid = supabaseSession.user.id

        // Check if Developer
        const { data: developer, error: devError } = await supabase
          .from('developer')
          .select('*')
          .eq('firebase_uid', firebaseUid)
          .single()

        if (developer && !devError) {
          setSession({
            user: developer as any,
            role: 'Developer'
          })
          setIsLoading(false)
          return
        }

        // Check if Admin
        const { data: admin, error: adminError } = await supabase
          .from('admin')
          .select('*, enterprise:enterprise_id(*)')
          .eq('firebase_uid', firebaseUid)
          .eq('is_active', true)
          .single()

        if (admin && !adminError) {
          setSession({
            user: admin as any,
            role: 'Admin',
            enterprise: (admin as any).enterprise
          })
          setIsLoading(false)
          return
        }
      }

      // Check localStorage for User (PIN) session
      const userSession = localStorage.getItem('user_session')
      if (userSession) {
        const parsed = JSON.parse(userSession)
        setSession(parsed)
      }

      setIsLoading(false)
    } catch (error) {
      console.error('Session check error:', error)
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
    }

    return response
  }

  async function handleLoginWithPin(credentials: PinCredentials): Promise<AuthResponse> {
    const response = await loginWithPin(credentials)

    if (response.success && response.data) {
      const newSession: AuthSession = {
        user: response.data,
        role: 'User',
        enterprise: response.enterprise,
        accessibleRooms: response.accessibleRooms
      }
      setSession(newSession)

      // Store in localStorage for User sessions (no Supabase Auth)
      localStorage.setItem('user_session', JSON.stringify(newSession))
    }

    return response
  }

  async function handleLogout() {
    await authLogout()
    localStorage.removeItem('user_session')
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
