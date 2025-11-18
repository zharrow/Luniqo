'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import { sessionsService, type SessionWithStats } from '@/lib/services/sessions.service'
import Link from 'next/link'

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SessionWithStats[]>([])
  const [filteredSessions, setFilteredSessions] = useState<SessionWithStats[]>([])
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const { session } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!session || !['Admin', 'Developer'].includes(session.role)) {
      router.push('/login')
      return
    }

    // Set default date range (last 30 days)
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 30)

    setStartDate(start.toISOString().split('T')[0])
    setEndDate(end.toISOString().split('T')[0])

    loadSessions()
  }, [session])

  useEffect(() => {
    applyFilters()
  }, [sessions, filterStatus, startDate, endDate])

  async function loadSessions() {
    try {
      if (!session?.enterprise?.id) return

      const data = await sessionsService.getAll(session.enterprise.id)
      setSessions(data)
    } catch (err: any) {
      console.error('Error loading sessions:', err)
      setError('Erreur lors du chargement')
    } finally {
      setIsLoading(false)
    }
  }

  function applyFilters() {
    let filtered = [...sessions]

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(s => s.status === filterStatus)
    }

    // Filter by date range
    if (startDate) {
      filtered = filtered.filter(s => s.date >= startDate)
    }
    if (endDate) {
      filtered = filtered.filter(s => s.date <= endDate)
    }

    // Sort by date desc
    filtered.sort((a, b) => b.date.localeCompare(a.date))

    setFilteredSessions(filtered)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-200 border-t-primary-500 mx-auto mb-4"></div>
          <p className="text-neutral-600">Chargement...</p>
        </div>
      </div>
    )
  }

  const stats = {
    total: filteredSessions.length,
    completed: filteredSessions.filter(s => s.status === 'COMPLETEE').length,
    inProgress: filteredSessions.filter(s => s.status === 'EN_COURS').length,
    incomplete: filteredSessions.filter(s => s.status === 'INCOMPLETE').length,
    avgCompletion: filteredSessions.length > 0
      ? Math.round(filteredSessions.reduce((sum, s) => sum + s.completion_percentage, 0) / filteredSessions.length)
      : 0
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Historique & Rapports</h1>
          <p className="text-neutral-600">Suivi des sessions de nettoyage</p>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="btn btn-secondary"
        >
          ← Retour
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="card p-4 mb-6 bg-danger-50 border border-danger-200">
          <p className="text-danger-700">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-2xl">
              📋
            </div>
            <div>
              <p className="text-sm text-neutral-600">Total sessions</p>
              <p className="text-2xl font-bold text-neutral-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-success-100 flex items-center justify-center text-2xl">
              ✅
            </div>
            <div>
              <p className="text-sm text-neutral-600">Complétées</p>
              <p className="text-2xl font-bold text-success-600">{stats.completed}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-2xl">
              🔄
            </div>
            <div>
              <p className="text-sm text-neutral-600">En cours</p>
              <p className="text-2xl font-bold text-primary-600">{stats.inProgress}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-warning-100 flex items-center justify-center text-2xl">
              ⚠️
            </div>
            <div>
              <p className="text-sm text-neutral-600">Incomplètes</p>
              <p className="text-2xl font-bold text-warning-600">{stats.incomplete}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-info-100 flex items-center justify-center text-2xl">
              📊
            </div>
            <div>
              <p className="text-sm text-neutral-600">Taux moyen</p>
              <p className="text-2xl font-bold text-neutral-900">{stats.avgCompletion}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Statut
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="COMPLETEE">Complétée</option>
              <option value="EN_COURS">En cours</option>
              <option value="INCOMPLETE">Incomplète</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Date début
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Date fin
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Sessions List */}
      {filteredSessions.length > 0 ? (
        <div className="space-y-4">
          {filteredSessions.map((session) => (
            <Link
              key={session.id}
              href={`/dashboard/sessions/${session.id}`}
              className="card p-6 hover:shadow-lg transition-shadow block"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-neutral-900">
                      {new Date(session.date).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      session.status === 'COMPLETEE' ? 'bg-success-100 text-success-700' :
                      session.status === 'EN_COURS' ? 'bg-primary-100 text-primary-700' :
                      'bg-warning-100 text-warning-700'
                    }`}>
                      {session.status === 'COMPLETEE' ? 'Complétée' :
                       session.status === 'EN_COURS' ? 'En cours' :
                       'Incomplète'}
                    </span>
                  </div>

                  <div className="flex items-center gap-6 text-sm text-neutral-600">
                    <span>{session.completed_tasks} / {session.total_tasks} tâches</span>
                    <span>{session.completion_percentage}% complété</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3 w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary-500 to-success-500 transition-all"
                      style={{ width: `${session.completion_percentage}%` }}
                    />
                  </div>
                </div>

                <div className="ml-6">
                  <svg className="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <svg className="w-16 h-16 text-neutral-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-neutral-500">Aucune session trouvée pour ces critères</p>
        </div>
      )}
    </div>
  )
}
