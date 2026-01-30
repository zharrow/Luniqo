'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircleIcon, ArrowRightIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'

export default function BillingSuccessPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [showConfetti, setShowConfetti] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Success icon with animation */}
        <div className={`relative inline-flex items-center justify-center ${showConfetti ? 'animate-bounce' : ''}`}>
          <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircleIcon className="h-12 w-12 text-green-600" />
          </div>
          {showConfetti && (
            <>
              <SparklesIcon className="absolute -top-2 -right-2 h-6 w-6 text-yellow-400 animate-pulse" />
              <SparklesIcon className="absolute -bottom-1 -left-3 h-5 w-5 text-blue-400 animate-pulse" />
            </>
          )}
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paiement confirmé !</h1>
          <p className="text-gray-500 mt-2">
            Votre abonnement est maintenant actif. Les modules souscrits sont
            immédiatement disponibles dans votre espace.
          </p>
        </div>

        {sessionId && (
          <p className="text-xs text-gray-400">
            Référence : {sessionId.slice(0, 20)}...
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Link href="/owner/billing">
            <Button variant="outline" className="w-full sm:w-auto">
              Voir mes abonnements
            </Button>
          </Link>
          <Link href="/owner/dashboard">
            <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white gap-2">
              Aller au tableau de bord
              <ArrowRightIcon className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
