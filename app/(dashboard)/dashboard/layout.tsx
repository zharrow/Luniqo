'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { session, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // If session is loaded and user is an Employee (role: 'User'), redirect to tablet
    if (!isLoading && session && session.role === 'User') {
      router.replace('/tablet/home')
    }
  }, [session, isLoading, router])

  // Show loading state while checking session
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-200 border-t-primary-500 mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  // Don't render dashboard if user is an Employee
  if (session && session.role === 'User') {
    return null
  }

  return <>{children}</>
}