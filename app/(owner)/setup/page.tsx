'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import EnterpriseSetupForm from '@/components/EnterpriseSetupForm'

export default function SetupPage() {
  const { session, isLoading, role, enterprise } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      // Rediriger si pas Owner
      if (!session || role !== 'Owner') {
        router.push('/login')
        return
      }

      // Rediriger vers dashboard si l'entreprise existe déjà
      if (enterprise) {
        router.push('/owner/dashboard')
      }
    }
  }, [session, isLoading, role, enterprise, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  // Si pas de session ou pas Owner, ne rien afficher (redirection en cours)
  if (!session || role !== 'Owner') {
    return null
  }

  // Si entreprise existe déjà, ne rien afficher (redirection en cours)
  if (enterprise) {
    return null
  }

  return <EnterpriseSetupForm ownerId={session.user.id} />
}
