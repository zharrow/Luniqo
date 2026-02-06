'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import {
  haccpService,
  type Temperature,
  type CreateTemperatureInput,
  type CheckpointType,
  type Batch,
  type Meal
} from '@/lib/services/haccp.service'
import { usersService, type ProfileWithRooms } from '@/lib/services/users.service'
import { PlusIcon } from '@heroicons/react/24/outline'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'
import { FormDialog } from '@/components/shared/FormDialog'
import { Badge } from '@/components/ui/badge'
import { getTodayLocal } from '@/lib/utils/date'

export default function HaccpTemperaturesPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery } = useNursery()
  const [temperatures, setTemperatures] = useState<Temperature[]>([])
  const [filteredTemperatures, setFilteredTemperatures] = useState<Temperature[]>([])
  const [filterCheckpoint, setFilterCheckpoint] = useState<string>('all')
  const [filterCompliance, setFilterCompliance] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Form state
  const [showModal, setShowModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeBatches, setActiveBatches] = useState<Batch[]>([])
  const [todayMeals, setTodayMeals] = useState<Meal[]>([])
  const [users, setUsers] = useState<ProfileWithRooms[]>([])
  const [formData, setFormData] = useState<CreateTemperatureInput>({
    checkpoint_type: 'Reception',
    temperature_value: 0,
    measured_at: new Date().toISOString(),
    measured_by_id: '',
    is_compliant: true,
    notes: ''
  })

  const loadTemperatures = useCallback(async () => {
    try {
      if (!selectedNursery?.id) return

      const data = await haccpService.getTemperaturesWithBatches(selectedNursery.id)
      setTemperatures(data)
    } catch (err: any) {
      console.error('Error loading temperatures:', err)
      setError('Erreur lors du chargement')
    } finally {
      setIsLoading(false)
    }
  }, [selectedNursery?.id])

  const loadFormData = useCallback(async () => {
    if (!selectedNursery?.id) return
    try {
      const [batchesData, mealsData, usersData] = await Promise.all([
        haccpService.getActiveBatches(selectedNursery.id),
        haccpService.getMealsByDate(selectedNursery.id, getTodayLocal()),
        usersService.getEmployeesByNursery(selectedNursery.id)
      ])
      setActiveBatches(batchesData)
      setTodayMeals(mealsData)
      setUsers(usersData)
    } catch (err) {
      console.error('Error loading form data:', err)
    }
  }, [selectedNursery?.id])

  useEffect(() => {
    if (selectedNursery?.id) {
      loadTemperatures()
      loadFormData()
    } else if (!authLoading && !selectedNursery) {
      setIsLoading(false)
    }
  }, [selectedNursery?.id, authLoading, loadTemperatures, loadFormData])

  useEffect(() => {
    applyFilters()
  }, [temperatures, filterCheckpoint, filterCompliance])

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

  function openCreateModal() {
    setFormData({
      checkpoint_type: 'Reception',
      temperature_value: 4,
      measured_at: new Date().toISOString(),
      measured_by_id: session?.user?.id || users[0]?.id || '',
      is_compliant: true,
      notes: ''
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedNursery?.id) return

    try {
      setIsSubmitting(true)
      await haccpService.createTemperatureWithBatch(selectedNursery.id, formData)
      setShowModal(false)
      loadTemperatures()
    } catch (error) {
      console.error('Error creating temperature:', error)
      alert('Erreur lors de l\'enregistrement')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Auto-calculate compliance based on checkpoint type and temperature
  function updateTemperatureAndCompliance(value: number, checkpointType: CheckpointType) {
    let isCompliant = true

    switch (checkpointType) {
      case 'Reception':
        // Cold products should be ≤ 4°C, frozen ≤ -18°C
        isCompliant = value <= 4
        break
      case 'Storage':
        // Refrigerator: 0-4°C
        isCompliant = value >= 0 && value <= 4
        break
      case 'Holding':
        // Hot holding: ≥ 63°C, Cold holding: ≤ 4°C
        isCompliant = value >= 63 || value <= 4
        break
      case 'Service':
        // Service: hot ≥ 63°C or cold ≤ 4°C
        isCompliant = value >= 63 || value <= 4
        break
    }

    setFormData(prev => ({
      ...prev,
      temperature_value: value,
      is_compliant: isCompliant
    }))
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

  const checkpointInfo: Record<string, { icon: string; label: string; color: string; tempRange: string }> = {
    Reception: { icon: '📦', label: 'Réception', color: 'primary', tempRange: '≤ 4°C' },
    Holding: { icon: '🧊', label: 'Conservation', color: 'info', tempRange: '≤ 4°C ou ≥ 63°C' },
    Service: { icon: '🍽️', label: 'Service', color: 'warning', tempRange: '≤ 4°C ou ≥ 63°C' },
    Storage: { icon: '❄️', label: 'Stockage', color: 'secondary', tempRange: '0-4°C' }
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
        {/* Breadcrumb */}
        <PageBreadcrumb
          items={[
            { label: 'Dashboard', href: '/owner/dashboard' },
            { label: 'HACCP', href: '/owner/haccp' },
            { label: 'Températures' }
          ]}
        />

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-100">
              <span className="text-2xl">🌡️</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Contrôle des Températures</h1>
              <p className="text-sm text-muted-foreground">Suivi des températures HACCP avec traçabilité produits</p>
            </div>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Nouveau relevé
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="card p-4 mb-6 bg-danger-50 border border-danger-200">
            <p className="text-danger-700">{error}</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="group p-6 rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/50 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 hover:scale-105">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-2xl shadow-md shadow-blue-500/30 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                🌡️
              </div>
              <div>
                <p className="text-sm text-blue-700/70">Total</p>
                <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="group p-6 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/50 hover:shadow-lg hover:shadow-emerald-500/20 transition-all duration-300 hover:scale-105">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-2xl shadow-md shadow-emerald-500/30 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                ✅
              </div>
              <div>
                <p className="text-sm text-emerald-700/70">Conformes</p>
                <p className="text-2xl font-bold text-emerald-900">{stats.compliant}</p>
              </div>
            </div>
          </div>

          <div className="group p-6 rounded-3xl bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200/50 hover:shadow-lg hover:shadow-rose-500/20 transition-all duration-300 hover:scale-105">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-2xl shadow-md shadow-rose-500/30 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                ❌
              </div>
              <div>
                <p className="text-sm text-rose-700/70">Non conformes</p>
                <p className="text-2xl font-bold text-rose-900">{stats.nonCompliant}</p>
              </div>
            </div>
          </div>

          <div className="group p-6 rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/50 hover:shadow-lg hover:shadow-amber-500/20 transition-all duration-300 hover:scale-105">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-2xl shadow-md shadow-amber-500/30 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                📊
              </div>
              <div>
                <p className="text-sm text-amber-700/70">Taux conformité</p>
                <p className="text-2xl font-bold text-amber-900">
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
                            <p className="text-muted-foreground">
                              {temp.batch_id ? 'Produit' : 'Repas'}
                            </p>
                            <p className="font-semibold">
                              {temp.batch?.product?.name && (
                                <Badge variant="outline" className="text-xs">
                                  📦 {temp.batch.product.name}
                                </Badge>
                              )}
                              {temp.meal && (
                                <>
                                  {temp.meal.type === 'Breakfast' && '🥐 Petit-déj'}
                                  {temp.meal.type === 'Lunch' && '🍽️ Déjeuner'}
                                  {temp.meal.type === 'Snack' && '🍪 Goûter'}
                                </>
                              )}
                              {!temp.batch_id && !temp.meal_id && '-'}
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
              Cliquez sur &quot;Nouveau relevé&quot; pour enregistrer une température
            </p>
          </div>
        )}

        {/* Form Dialog */}
        <FormDialog
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
          title="Nouveau relevé de température"
          submitLabel="Enregistrer"
          isSubmitting={isSubmitting}
          maxWidth="md"
        >
          <div className="space-y-4">
            {/* Checkpoint Type */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Point de contrôle *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(checkpointInfo).map(([key, info]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, checkpoint_type: key as CheckpointType }))
                      updateTemperatureAndCompliance(formData.temperature_value, key as CheckpointType)
                    }}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      formData.checkpoint_type === key
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-border hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{info.icon}</span>
                      <div>
                        <p className="font-medium text-sm">{info.label}</p>
                        <p className="text-xs text-muted-foreground">{info.tempRange}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Temperature Value */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Température (°C) *
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  step="0.1"
                  value={formData.temperature_value}
                  onChange={(e) => updateTemperatureAndCompliance(
                    parseFloat(e.target.value) || 0,
                    formData.checkpoint_type
                  )}
                  className="flex-1 px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring text-xl font-bold text-center"
                  required
                />
                <div className={`px-4 py-2 rounded-lg font-semibold ${
                  formData.is_compliant
                    ? 'bg-success-100 text-success-700'
                    : 'bg-danger-100 text-danger-700'
                }`}>
                  {formData.is_compliant ? '✅ Conforme' : '❌ Non conforme'}
                </div>
              </div>
            </div>

            {/* Link to Batch (for Reception) */}
            {formData.checkpoint_type === 'Reception' && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Lot réceptionné (optionnel)
                </label>
                <select
                  value={formData.batch_id || ''}
                  onChange={(e) => setFormData({ ...formData, batch_id: e.target.value || undefined })}
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Sélectionner un lot</option>
                  {activeBatches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.product?.name} - Lot {batch.batch_number || 'N/A'} (DLC: {batch.expiry_date ? new Date(batch.expiry_date).toLocaleDateString('fr-FR') : 'N/A'})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Liez cette température au lot de produit réceptionné pour une traçabilité complète
                </p>
              </div>
            )}

            {/* Link to Meal (for Service/Holding) */}
            {(formData.checkpoint_type === 'Service' || formData.checkpoint_type === 'Holding') && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Repas associé (optionnel)
                </label>
                <select
                  value={formData.meal_id || ''}
                  onChange={(e) => setFormData({ ...formData, meal_id: e.target.value || undefined })}
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Sélectionner un repas</option>
                  {todayMeals.map((meal) => (
                    <option key={meal.id} value={meal.id}>
                      {meal.type === 'Breakfast' ? '🥐 Petit-déjeuner' :
                       meal.type === 'Lunch' ? '🍽️ Déjeuner' : '🍪 Goûter'}
                      {meal.menu && ` - ${meal.menu.substring(0, 30)}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Measured by */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Relevé par *
              </label>
              <select
                value={formData.measured_by_id}
                onChange={(e) => setFormData({ ...formData, measured_by_id: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                required
              >
                <option value="">Sélectionner un employé</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Observations éventuelles..."
                rows={2}
              />
            </div>
          </div>
        </FormDialog>
      </div>
    </div>
  )
}
