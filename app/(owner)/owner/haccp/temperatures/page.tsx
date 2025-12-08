'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { haccpService } from '@/lib/services/haccp.service'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

interface Temperature {
  id: string
  meal_id: string
  checkpoint_type: string
  temperature_value: number
  is_compliant: boolean
  notes: string | null
  measured_at: string
  measured_by_id: string
  meal?: {
    date: string
    meal_type: string
  }
}

export default function HaccpTemperaturesPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const router = useRouter()
  const [temperatures, setTemperatures] = useState<Temperature[]>([])
  const [filteredTemperatures, setFilteredTemperatures] = useState<Temperature[]>([])
  const [filterCheckpoint, setFilterCheckpoint] = useState<string>('all')
  const [filterCompliance, setFilterCompliance] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (session?.enterprise) {
      loadTemperatures()
    }
  }, [session])

  useEffect(() => {
    applyFilters()
  }, [temperatures, filterCheckpoint, filterCompliance])

  async function loadTemperatures() {
    try {
      if (!session?.enterprise?.id) return

      const data = await haccpService.getTemperatures(session.enterprise.id)
      setTemperatures(data as Temperature[])
    } catch (err: any) {
      console.error('Error loading temperatures:', err)
      setError('Erreur lors du chargement')
    } finally {
      setIsLoading(false)
    }
  }

  function applyFilters() {
    let filtered = [...temperatures]

    if (filterCheckpoint !== 'all') {
      filtered = filtered.filter(t => t.checkpoint_type === filterCheckpoint)
    }

    if (filterCompliance === 'compliant') {
      filtered = filtered.filter(t => t.is_compliant)
    } else if (filterCompliance === 'non-compliant') {
      filtered = filtered.filter(t => !t.is_compliant)
    }

    setFilteredTemperatures(filtered)
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

  const checkpointInfo: Record<string, { icon: string; label: string; color: string }> = {
    Reception: { icon: '📦', label: 'Réception', color: 'primary' },
    Holding: { icon: '🧊', label: 'Conservation', color: 'info' },
    Service: { icon: '🍽️', label: 'Service', color: 'warning' },
    Storage: { icon: '❄️', label: 'Stockage', color: 'secondary' }
  }

  const stats = {
    total: temperatures.length,
    compliant: temperatures.filter(t => t.is_compliant).length,
    nonCompliant: temperatures.filter(t => !t.is_compliant).length,
    byCheckpoint: Object.keys(checkpointInfo).map(cp => ({
      checkpoint: cp,
      count: temperatures.filter(t => t.checkpoint_type === cp).length
    }))
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.push('/haccp')}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              title="Retour au HACCP"
            >
              <ArrowLeftIcon className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                Contrôle des Températures
              </h1>
              <p className="text-muted-foreground">Suivi des températures HACCP</p>
            </div>
          </div>
        </div>

      {/* Error Message */}
      {error && (
        <div className="card p-4 mb-6 bg-danger-50 border border-danger-200">
          <p className="text-danger-700">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-2xl">
              🌡️
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-success-100 flex items-center justify-center text-2xl">
              ✅
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Conformes</p>
              <p className="text-2xl font-bold text-success-600">{stats.compliant}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-danger-100 flex items-center justify-center text-2xl">
              ❌
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Non conformes</p>
              <p className="text-2xl font-bold text-danger-600">{stats.nonCompliant}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-warning-100 flex items-center justify-center text-2xl">
              📊
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Taux conformité</p>
              <p className="text-2xl font-bold">
                {stats.total > 0 ? Math.round((stats.compliant / stats.total) * 100) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-6 mb-6">
        <div className="flex gap-4">
          {/* Checkpoint Filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">
              Point de contrôle
            </label>
            <select
              value={filterCheckpoint}
              onChange={(e) => setFilterCheckpoint(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">Tous les points</option>
              {Object.entries(checkpointInfo).map(([key, info]) => (
                <option key={key} value={key}>
                  {info.icon} {info.label}
                </option>
              ))}
            </select>
          </div>

          {/* Compliance Filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">
              Conformité
            </label>
            <select
              value={filterCompliance}
              onChange={(e) => setFilterCompliance(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">Tous</option>
              <option value="compliant">Conformes uniquement</option>
              <option value="non-compliant">Non conformes uniquement</option>
            </select>
          </div>
        </div>
      </div>

      {/* Temperatures List */}
      {filteredTemperatures.length > 0 ? (
        <div className="space-y-4">
          {filteredTemperatures.map((temp) => {
            const info = checkpointInfo[temp.checkpoint_type]

            return (
              <div
                key={temp.id}
                className={`card p-6 ${
                  temp.is_compliant
                    ? 'border-l-4 border-success-500'
                    : 'border-l-4 border-danger-500 bg-danger-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-xl bg-${info?.color || 'neutral'}-100 flex items-center justify-center text-2xl`}>
                      {info?.icon || '🌡️'}
                    </div>

                    {/* Details */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold">
                          {info?.label || temp.checkpoint_type}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          temp.is_compliant
                            ? 'bg-success-100 text-success-700'
                            : 'bg-danger-100 text-danger-700'
                        }`}>
                          {temp.is_compliant ? '✅ Conforme' : '❌ Non conforme'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Température</p>
                          <p className="font-bold text-xl">
                            {temp.temperature_value}°C
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Date</p>
                          <p className="font-semibold">
                            {new Date(temp.measured_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Heure</p>
                          <p className="font-semibold">
                            {new Date(temp.measured_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Repas</p>
                          <p className="font-semibold">
                            {temp.meal?.meal_type === 'Breakfast' && '🥐 Petit-déj'}
                            {temp.meal?.meal_type === 'Lunch' && '🍽️ Déjeuner'}
                            {temp.meal?.meal_type === 'Snack' && '🍪 Goûter'}
                          </p>
                        </div>
                      </div>

                      {temp.notes && (
                        <div className="mt-3 p-3 bg-muted rounded-lg">
                          <p className="text-sm">{temp.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <svg className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-muted-foreground">Aucun contrôle de température enregistré</p>
          <p className="text-sm text-muted-foreground/60 mt-2">
            Les employés peuvent enregistrer les températures via l'interface tablette
          </p>
        </div>
      )}
      </div>
    </div>
  )
}
