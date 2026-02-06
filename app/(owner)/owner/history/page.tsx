'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { sessionsService, type SessionWithStats } from '@/lib/services/sessions.service'
import Link from 'next/link'
import { ClipboardDocumentListIcon, ClockIcon } from '@heroicons/react/24/outline'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'

export default function HistoryPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery } = useNursery()
  const [sessions, setSessions] = useState<SessionWithStats[]>([])
  const [filteredSessions, setFilteredSessions] = useState<SessionWithStats[]>([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const router = useRouter()

  useEffect(() => {
    if (selectedNursery?.id) {
      // Set default date range (last 30 days)
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 30)

      setStartDate(start.toISOString().split('T')[0])
      setEndDate(end.toISOString().split('T')[0])

      loadSessions()
    } else if (!authLoading && !selectedNursery) {
      setIsLoading(false)
    }
  }, [selectedNursery?.id, authLoading])

  useEffect(() => {
    applyFilters()
  }, [sessions, startDate, endDate])

  async function loadSessions() {
    try {
      if (!selectedNursery?.id) return

      const data = await sessionsService.getAll(selectedNursery.id)
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

  if (authLoading || isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <PageBreadcrumb
          items={[
            { label: 'Dashboard', href: '/owner/dashboard' },
            { label: 'Historique' }
          ]}
        />

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-100">
              <ClockIcon className="w-6 h-6 text-indigo-600" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Historique & Rapports</h1>
              <p className="text-sm text-muted-foreground">
                Suivi des sessions de nettoyage
              </p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div
            className="relative rounded-3xl p-4 mb-6 overflow-hidden"
            style={{
              border: '1px solid #f8717133',
              background: 'linear-gradient(to bottom right, #fef2f2, white)'
            }}
          >
            <div className="relative z-10">
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div
          className="relative rounded-3xl p-6 mb-6 bg-white overflow-hidden"
          style={{
            border: '1px solid #5a9dc933'
          }}
        >
          <div
            className="absolute inset-0 opacity-60"
            style={{ background: 'linear-gradient(to bottom right, #f8fbfd, white)' }}
          />
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Date début
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Date fin
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
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
              href={`/owner/sessions/${session.id}`}
            >
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

                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold">
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

                    <div className="flex items-center gap-6 text-sm text-muted-foreground mb-3">
                      <span>{session.completed_tasks} / {session.total_tasks} tâches</span>
                      <span>{session.completion_percentage}% complété</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all"
                        style={{
                          width: `${session.completion_percentage}%`,
                          background: 'linear-gradient(to right, #5a9dc9, #2c5f7f)'
                        }}
                      />
                    </div>
                  </div>

                  {/* Chevron */}
                  <div
                    className="ml-6 w-8 h-8 rounded-full flex items-center justify-center opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
                    style={{ backgroundColor: '#5a9dc914' }}
                  >
                    <svg className="w-4 h-4" style={{ color: '#5a9dc9' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          ))}
          </div>
        ) : (
          <div
            className="relative rounded-3xl p-12 bg-white overflow-hidden text-center"
            style={{
              border: '1px solid #5a9dc933'
            }}
          >
            <div
              className="absolute inset-0 opacity-60"
              style={{ background: 'linear-gradient(to bottom right, #f8fbfd, white)' }}
            />
            <div className="relative z-10">
              <ClipboardDocumentListIcon className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Aucune session trouvée pour ces critères</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
