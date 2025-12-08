'use client'

import { useRequireAuth } from '@/lib/contexts/AuthContext'

export default function DeveloperLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Protect Developer routes - redirect if not Developer
  const { session, isLoading } = useRequireAuth(['Developer'])

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

  return <>{children}</>
}
