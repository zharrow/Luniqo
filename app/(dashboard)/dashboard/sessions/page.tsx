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

export default function SessionsPage() {
  const { session: authSession, isLoading: authLoading } = useRequireAuth(['Admin'])
  const [todaySession, setTodaySession] = useState<SessionWithStats | null>(null)
  const [recentSessions, setRecentSessions] = useState<SessionWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

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

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETEE':
        return 'bg-success-50 text-success-700 border-success-200'
      case 'EN_COURS':
        return 'bg-primary-50 text-primary-700 border-primary-200'
      case 'INCOMPLETE':
        return 'bg-warning-50 text-warning-700 border-warning-200'
      default:
        return 'bg-neutral-50 text-neutral-700 border-neutral-200'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'COMPLETEE': return 'Complétée'
      case 'EN_COURS': return 'En cours'
      case 'INCOMPLETE': return 'Incomplète'
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
            <h1 className="text-3xl font-bold text-neutral-900 mb-2" style={{ fontFamily: 'Quicksand, sans-serif' }}>
              Sessions de Nettoyage
            </h1>
            <p className="text-neutral-600">
              Gérez vos sessions de nettoyage quotidiennes
            </p>
          </div>
        </div>

        {/* Today's Session */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            Session du jour
          </h2>

          {!todaySession ? (
            <div className="card p-8 text-center">
              <CalendarIcon className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 mb-2">
                Aucune session pour aujourd'hui
              </h3>
              <p className="text-neutral-600 mb-6">
                Créez la session de nettoyage du {formatDate(new Date().toISOString())}
              </p>
              <button
                onClick={createTodaySession}
                disabled={creating}
                className="btn btn-primary inline-flex items-center gap-2"
              >
                <PlusIcon className="w-5 h-5" />
                {creating ? 'Création...' : 'Créer la session du jour'}
              </button>
            </div>
          ) : (
            <Link href={`/dashboard/sessions/${todaySession.id}`}>
              <div className="card p-6 hover:shadow-lg transition-all cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-neutral-900">
                        {formatDate(todaySession.date)}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(todaySession.status)}`}>
                        {getStatusLabel(todaySession.status)}
                      </span>
                    </div>
                    {todaySession.notes && (
                      <p className="text-sm text-neutral-600">{todaySession.notes}</p>
                    )}
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-600">Progression</span>
                    <span className="font-semibold text-neutral-900">
                      {todaySession.completed_tasks} / {todaySession.total_tasks} tâches
                    </span>
                  </div>

                  <div className="relative w-full h-3 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-300"
                      style={{ width: `${todaySession.completion_percentage}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ChartBarIcon className="w-4 h-4 text-neutral-500" />
                      <span className="text-sm text-neutral-600">
                        {todaySession.completion_percentage}% complété
                      </span>
                    </div>
                    <span className="text-sm text-primary-600 font-medium">
                      Voir les détails →
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          )}
        </div>

        {/* Recent Sessions */}
        <div>
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            Sessions récentes
          </h2>

          {recentSessions.length === 0 ? (
            <div className="card p-8 text-center">
              <ClockIcon className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 mb-2">
                Aucune session
              </h3>
              <p className="text-neutral-600">
                Les sessions passées apparaîtront ici
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentSessions.map((session) => (
                <Link key={session.id} href={`/dashboard/sessions/${session.id}`}>
                  <div className="card p-6 hover:shadow-lg transition-all cursor-pointer h-full">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 text-neutral-400" />
                        <h3 className="font-semibold text-neutral-900">
                          {formatDateShort(session.date)}
                        </h3>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(session.status)}`}>
                        {getStatusLabel(session.status)}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-600">Tâches</span>
                        <span className="font-medium text-neutral-900">
                          {session.completed_tasks} / {session.total_tasks}
                        </span>
                      </div>

                      <div className="relative w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className={`absolute top-0 left-0 h-full transition-all ${
                            session.completion_percentage === 100
                              ? 'bg-success-500'
                              : 'bg-primary-500'
                          }`}
                          style={{ width: `${session.completion_percentage}%` }}
                        ></div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-neutral-500">
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
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
