'use client'

import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { sessionsService, type SessionWithStats } from '@/lib/services/sessions.service'
import {
  PlusIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function SessionsPage() {
  const { session: authSession, isLoading: authLoading } = useRequireAuth(['Owner'])
  const [todaySession, setTodaySession] = useState<SessionWithStats | null>(null)
  const [recentSessions, setRecentSessions] = useState<SessionWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [showDatePicker, setShowDatePicker] = useState(false)

  useEffect(() => {
    if (authSession?.enterprise) {
      loadSessions()
    }
  }, [authSession])

  async function loadSessions() {
    if (!authSession?.enterprise?.id) return

    try {
      setLoading(true)
      const [today, recent] = await Promise.all([
        sessionsService.getToday(authSession.enterprise.id),
        sessionsService.getAll(authSession.enterprise.id, 10)
      ])

      setTodaySession(today)
      setRecentSessions(recent)
    } catch (error) {
      console.error('Error loading sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  async function createTodaySession() {
    if (!authSession?.enterprise?.id) return

    try {
      setCreating(true)
      const today = new Date().toISOString().split('T')[0]

      await sessionsService.create(authSession.enterprise.id, {
        date: today
      })

      loadSessions()
    } catch (error) {
      console.error('Error creating session:', error)
      alert('Erreur lors de la création de la session')
    } finally {
      setCreating(false)
    }
  }

  async function createSessionForDate(date: Date) {
    if (!authSession?.enterprise?.id) return

    try {
      setCreating(true)
      const formattedDate = format(date, 'yyyy-MM-dd')

      await sessionsService.create(authSession.enterprise.id, {
        date: formattedDate
      })

      setShowDatePicker(false)
      setSelectedDate(undefined)
      loadSessions()
    } catch (error) {
      console.error('Error creating session:', error)
      alert('Erreur lors de la création de la session')
    } finally {
      setCreating(false)
    }
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
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

  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date)
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Sessions de Nettoyage
            </h1>
            <p className="text-muted-foreground">
              Gérez vos sessions de nettoyage quotidiennes
            </p>
          </div>

          <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                Créer une session pour une date
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date)
                    createSessionForDate(date)
                  }
                }}
                locale={fr}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              />
            </PopoverContent>
          </Popover>
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
            <Link href={`/dashboard/sessions/${todaySession.id}`}>
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

        {/* Recent Sessions */}
        <div>
          <h2 className="text-xl font-semibold mb-4">
            Sessions récentes
          </h2>

          {recentSessions.length === 0 ? (
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
                <ClockIcon className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  Aucune session
                </h3>
                <p className="text-muted-foreground">
                  Les sessions passées apparaîtront ici
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentSessions.map((session) => (
                <Link key={session.id} href={`/dashboard/sessions/${session.id}`}>
                  <div
                    className="relative rounded-3xl p-6 bg-white hover:-translate-y-1 transition-all duration-300 group overflow-hidden cursor-pointer h-full"
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
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 flex-1">
                          <div
                            className="inline-flex items-center justify-center w-8 h-8 rounded-2xl group-hover:scale-105 transition-all duration-300"
                            style={{ background: 'linear-gradient(to bottom right, #5a9dc91A, #5a9dc90D)' }}
                          >
                            <CalendarIcon className="w-4 h-4" style={{ color: '#2c5f7f' }} strokeWidth={1.5} />
                          </div>
                          <h3 className="font-semibold">
                            {formatDateShort(session.date)}
                          </h3>
                        </div>
                        <Badge variant={getStatusBadgeVariant(session.status)} size="sm">
                          {getStatusLabel(session.status)}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Tâches</span>
                          <span className="font-medium">
                            {session.completed_tasks} / {session.total_tasks}
                          </span>
                        </div>

                        <div className="relative w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="absolute top-0 left-0 h-full transition-all"
                            style={{
                              width: `${session.completion_percentage}%`,
                              background: session.completion_percentage === 100
                                ? 'linear-gradient(to right, #b5ead7, #4a8f5a)'
                                : 'linear-gradient(to right, #5a9dc9, #2c5f7f)'
                            }}
                          ></div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{session.completion_percentage}%</span>
                          {session.completion_percentage === 100 && (
                            <div className="flex items-center gap-1 text-success-600">
                              <CheckCircleIcon className="w-4 h-4" />
                              <span>Terminée</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
