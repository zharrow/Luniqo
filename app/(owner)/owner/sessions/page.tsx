'use client'

import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { sessionsService, type SessionWithStats } from '@/lib/services/sessions.service'
import {
  PlusIcon,
  CalendarIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'

export default function SessionsPage() {
  const { isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery } = useNursery()
  const [todaySession, setTodaySession] = useState<SessionWithStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (selectedNursery?.id) {
      autoCreateTodaySession()
      loadSessions()
    } else if (!authLoading && !selectedNursery) {
      setLoading(false)
    }
  }, [selectedNursery?.id, authLoading])

  async function loadSessions() {
    if (!selectedNursery?.id) return

    try {
      setLoading(true)
      const today = await sessionsService.getToday(selectedNursery.id)
      setTodaySession(today)
    } catch (error) {
      console.error('Error loading sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  async function createTodaySession() {
    console.log('🚀 createTodaySession called')
    console.log('📍 selectedNursery:', selectedNursery)

    if (!selectedNursery?.id) {
      console.log('❌ No selectedNursery.id, returning early')
      return
    }

    try {
      setCreating(true)
      const { getTodayLocal } = await import('@/lib/utils/date')
      const today = getTodayLocal()

      console.log('📅 Creating session for date:', today)
      console.log('🏢 Nursery ID:', selectedNursery.id)

      const result = await sessionsService.create(selectedNursery.id, {
        date: today
      })

      console.log('✅ Session created:', result)

      loadSessions()
    } catch (error) {
      console.error('❌ Error creating session:', error)
      alert('Erreur lors de la création de la session: ' + (error as any)?.message)
    } finally {
      setCreating(false)
    }
  }

  /**
   * Auto-create session for weekdays (Monday-Friday)
   */
  async function autoCreateTodaySession() {
    if (!selectedNursery?.id) return

    const today = new Date()
    const dayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    // Only create session for weekdays (Monday-Friday)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return // Skip weekends
    }

    // Check if session already exists
    const existingSession = await sessionsService.getToday(selectedNursery.id)
    if (existingSession) {
      return // Session already exists
    }

    // Create today's session automatically using local timezone
    try {
      const { getTodayLocal } = await import('@/lib/utils/date')
      const todayLocal = getTodayLocal()
      await sessionsService.create(selectedNursery.id, {
        date: todayLocal
      })
      loadSessions()
    } catch (error) {
      console.error('Error auto-creating session:', error)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  const getStatusBadgeVariant = (status: string): 'primary' | 'success' | 'danger' | 'warning' | 'neutral' => {
    switch (status) {
      case 'COMPLETEE': return 'success'
      case 'EN_COURS': return 'primary'
      default: return 'neutral'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'COMPLETEE': return 'Terminée'
      case 'EN_COURS': return 'En cours'
      default: return status
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date)
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <PageBreadcrumb
          items={[
            { label: 'Dashboard', href: '/owner/dashboard' },
            { label: 'Sessions' }
          ]}
        />

        {/* Header with Gradient - Module Clean (Bleu) */}
        <div className="relative mb-8 p-8 rounded-3xl bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 border border-sky-200/50 overflow-hidden">
          <div className="absolute inset-0 bg-[url('/patterns/dots.svg')] opacity-5"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center shadow-lg shadow-sky-500/30">
                <CalendarIcon className="w-8 h-8 text-white" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-1 bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                  Sessions de Nettoyage
                </h1>
                <p className="text-sky-700/70">
                  Gérez vos sessions de nettoyage quotidiennes
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Session */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">
            Session du jour
          </h2>

          {!todaySession ? (
            <div
              className="relative rounded-3xl p-8 bg-white transition-all duration-300 overflow-hidden text-center"
              style={{
                border: '1px solid #5a9dc933',
                boxShadow: '0 0 0 0 rgba(90,157,201,0.15)'
              }}
            >
              <div
                className="absolute inset-0 opacity-60"
                style={{ background: 'linear-gradient(to bottom right, #f8fbfd, white)' }}
              />
              <div className="relative z-10">
                <CalendarIcon className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  Aucune session pour aujourd'hui
                </h3>
                <p className="text-muted-foreground mb-6">
                  Créez la session de nettoyage du {formatDate(new Date().toISOString())}
                </p>
                <Button
                  onClick={createTodaySession}
                  disabled={creating}
                  className="inline-flex items-center gap-2 bg-[#5a9dc9] hover:bg-[#2c5f7f]"
                >
                  <PlusIcon className="w-5 h-5" />
                  {creating ? 'Création...' : 'Créer la session du jour'}
                </Button>
              </div>
            </div>
          ) : (
            <Link href={`/owner/sessions/${todaySession.id}`}>
              <div
                className="relative rounded-3xl p-6 bg-white hover:-translate-y-1 transition-all duration-300 group overflow-hidden cursor-pointer"
                style={{
                  border: '1px solid #5a9dc933',
                  boxShadow: '0 0 0 0 rgba(90,157,201,0.25)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 16px 48px -12px rgba(90,157,201,0.25)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 0 0 rgba(90,157,201,0.25)'
                }}
              >
                {/* Gradient fond */}
                <div
                  className="absolute inset-0 opacity-60"
                  style={{ background: 'linear-gradient(to bottom right, #f8fbfd, white)' }}
                />

                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">
                          {formatDate(todaySession.date)}
                        </h3>
                        <Badge variant={getStatusBadgeVariant(todaySession.status)} size="md">
                          {getStatusLabel(todaySession.status)}
                        </Badge>
                      </div>
                      {todaySession.notes && (
                        <p className="text-sm text-muted-foreground">{todaySession.notes}</p>
                      )}
                    </div>

                    {/* Chevron */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
                      style={{ backgroundColor: '#5a9dc914' }}
                    >
                      <svg className="w-4 h-4" style={{ color: '#5a9dc9' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progression</span>
                      <span className="font-semibold">
                        {todaySession.completed_tasks} / {todaySession.total_tasks} tâches
                      </span>
                    </div>

                    <div className="relative w-full h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className="absolute top-0 left-0 h-full transition-all duration-300"
                        style={{
                          width: `${todaySession.completion_percentage}%`,
                          background: 'linear-gradient(to right, #5a9dc9, #2c5f7f)'
                        }}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ChartBarIcon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {todaySession.completion_percentage}% complété
                        </span>
                      </div>
                      <span className="text-sm text-[#5a9dc9] font-medium">
                        Voir les détails →
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
