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
        const userEmail = supabaseSession.user.email

        if (!userEmail) {
          setIsLoading(false)
          return
        }

        // Check if Developer
        const { data: developer, error: devError } = await supabase
          .from('developer')
          .select('*')
          .eq('email', userEmail)
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

          setSession({
            user: admin as any,
            role: 'Admin',
            enterprise: (enterprise as any) || undefined
          })
          setIsLoading(false)
          return
        }
      }

      // No Supabase Auth session found
      setIsLoading(false)
    } catch (error) {
      console.error('Session check error:', error)
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
