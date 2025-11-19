'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircleIcon } from '@heroicons/react/24/outline'
import { Confetti } from '@/components/ui/confetti'
import { SparklesText } from '@/components/ui/sparkles-text'

export default function SuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [countdown, setCountdown] = useState(5)

  const roomName = searchParams.get('room') || 'la pièce'
  const completedCount = searchParams.get('completed') || '0'
  const totalCount = searchParams.get('total') || '0'
  const progress = searchParams.get('progress') || '0'

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          router.push('/tablet/home')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 flex items-center justify-center p-8 tablet-mode">
      <Confetti />

      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Success Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse" />
            <CheckCircleIcon className="w-32 h-32 text-primary relative" />
          </div>
        </div>

        {/* Success Message */}
        <div className="space-y-4">
          <SparklesText
            className="text-6xl font-bold"
            colors={{ first: '#a855f7', second: '#ec4899' }}
          >
            Félicitations !
          </SparklesText>

          <h2 className="text-4xl font-semibold text-foreground/80">
            Tâches validées avec succès
          </h2>
        </div>

        {/* Stats */}
        <div className="bg-card/80 backdrop-blur-sm border border-border rounded-3xl p-8 space-y-6">
          <div className="space-y-2">
            <p className="text-3xl font-medium text-muted-foreground">
              {roomName}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-primary/10 rounded-2xl p-6">
              <div className="text-5xl font-bold text-primary mb-2">
                {completedCount}
              </div>
              <div className="text-xl text-muted-foreground">
                Tâches complétées
              </div>
            </div>

            <div className="bg-accent/10 rounded-2xl p-6">
              <div className="text-5xl font-bold text-primary mb-2">
                {progress}%
              </div>
              <div className="text-xl text-muted-foreground">
                Progression
              </div>
            </div>
          </div>
        </div>

        {/* Countdown */}
        <div className="text-2xl text-muted-foreground">
          Retour à l'accueil dans <span className="font-bold text-primary">{countdown}</span>s
        </div>

        {/* Manual Return Button */}
        <button
          onClick={() => router.push('/tablet/home')}
          className="btn btn-primary text-2xl px-12 py-6 rounded-2xl"
        >
          Retourner à l'accueil
        </button>
      </div>
    </div>
  )
}
