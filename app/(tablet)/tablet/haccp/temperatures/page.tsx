'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRequireTabletAuth } from '@/lib/contexts/TabletAuthContext'
import { haccpService } from '@/lib/services/haccp.service'

type CheckpointType = 'Reception' | 'Holding' | 'Service' | 'Storage'

interface TemperatureRecord {
  checkpoint: CheckpointType
  temperature: string
  compliant: boolean
  notes: string
}

const checkpointInfo: Record<CheckpointType, { icon: string; label: string; range: string; description: string }> = {
  Reception: { icon: '📦', label: 'Réception', range: '≤ 4°C', description: 'Produits frais à réception' },
  Storage: { icon: '❄️', label: 'Stockage', range: '0 à 4°C', description: 'Réfrigérateur / chambre froide' },
  Holding: { icon: '🧊', label: 'Conservation', range: '≤ 4°C ou ≥ 63°C', description: 'Maintien en température' },
  Service: { icon: '🍽️', label: 'Service', range: '≤ 4°C ou ≥ 63°C', description: 'Température au service' },
}

function calculateCompliance(checkpoint: CheckpointType, value: number): boolean {
  switch (checkpoint) {
    case 'Reception':
      return value <= 4
    case 'Storage':
      return value >= 0 && value <= 4
    case 'Holding':
      return value >= 63 || value <= 4
    case 'Service':
      return value >= 63 || value <= 4
  }
}

export default function TabletHaccpTemperaturesPage() {
  const [todayMeals, setTodayMeals] = useState<any[]>([])
  const [selectedMeal, setSelectedMeal] = useState<string | null>(null)
  const [noMealMode, setNoMealMode] = useState(false)
  const [selectedCheckpoints, setSelectedCheckpoints] = useState<CheckpointType[]>([])
  const [temperatures, setTemperatures] = useState<TemperatureRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const { session } = useRequireTabletAuth()
  const router = useRouter()

  // Step tracking: 1 = meal/context, 2 = checkpoint selection, 3 = temperature entry
  const step = !selectedMeal && !noMealMode ? 1
    : selectedCheckpoints.length === 0 ? 2
    : 3

  useEffect(() => {
    if (session && session.selectedNursery?.id) {
      loadMeals()
    }
  }, [session])

  // Initialize temperature records when checkpoints are selected
  useEffect(() => {
    setTemperatures(
      selectedCheckpoints.map(cp => ({
        checkpoint: cp,
        temperature: '',
        compliant: true,
        notes: ''
      }))
    )
  }, [selectedCheckpoints])

  async function loadMeals() {
    try {
      if (!session?.selectedNursery?.id) return

      const today = new Date().toISOString().split('T')[0]
      const meals = await haccpService.getMealsByDate(session.selectedNursery.id, today, today)

      const todayValidated = meals.filter(
        (m: any) => m.date === today && m.is_validated
      )
      setTodayMeals(todayValidated)
    } catch (err: any) {
      console.error('Error loading meals:', err)
      setError('Erreur lors du chargement')
    } finally {
      setIsLoading(false)
    }
  }

  function toggleCheckpoint(cp: CheckpointType) {
    setSelectedCheckpoints(prev =>
      prev.includes(cp) ? prev.filter(c => c !== cp) : [...prev, cp]
    )
  }

  function updateTemperature(index: number, field: keyof TemperatureRecord, value: any) {
    setTemperatures(prev => {
      const updated = [...prev]
      const record = { ...updated[index], [field]: value }

      // Auto-calculate compliance when temperature changes
      if (field === 'temperature' && value !== '') {
        const numValue = parseFloat(value)
        if (!isNaN(numValue)) {
          record.compliant = calculateCompliance(record.checkpoint, numValue)
        }
      }

      updated[index] = record
      return updated
    })
  }

  async function handleSubmit() {
    if (!session?.user?.id || !session?.selectedNursery?.id) {
      setError('Session invalide')
      return
    }

    const filledTemps = temperatures.filter(t => t.temperature !== '')
    if (filledTemps.length === 0) {
      setError('Veuillez saisir au moins une température')
      return
    }

    // Check if non-compliant records have notes
    const nonCompliantWithoutNotes = filledTemps.filter(t => !t.compliant && !t.notes.trim())
    if (nonCompliantWithoutNotes.length > 0) {
      const labels = nonCompliantWithoutNotes.map(t => checkpointInfo[t.checkpoint].label).join(', ')
      setError(`Veuillez ajouter une remarque pour les relevés non conformes : ${labels}`)
      return
    }

    setIsSaving(true)
    setError('')

    try {
      const records = filledTemps.map(t => ({
        meal_id: selectedMeal,
        checkpoint: t.checkpoint,
        temperature: parseFloat(t.temperature),
        compliant: t.compliant,
        notes: t.notes || null,
        checked_by_id: session.user.id,
        checked_at: new Date().toISOString()
      }))

      await haccpService.recordTemperatures(session.selectedNursery.id, records)

      setSuccess(true)
      setTimeout(() => {
        router.push('/tablet/home')
      }, 2000)
    } catch (err: any) {
      console.error('Error saving:', err)
      setError('Erreur lors de l\'enregistrement')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="tablet-mode min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-24 w-24 border-8 border-primary-200 border-t-primary-500 mx-auto mb-6"></div>
          <p className="text-2xl text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="tablet-mode min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50">
        <div className="text-center">
          <div className="w-32 h-32 rounded-full bg-success-100 flex items-center justify-center mx-auto mb-6">
            <svg className="w-20 h-20 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-4xl font-bold text-success-600 mb-4">Enregistré !</h2>
          <p className="text-2xl text-muted-foreground">Retour au menu HACCP...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="tablet-mode min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 p-8">
      {/* Header */}
      <div className="mb-12">
        <div className="flex justify-between items-start mb-6">
          <button
            onClick={() => {
              if (step === 3) {
                setSelectedCheckpoints([])
              } else if (step === 2) {
                setSelectedMeal(null)
                setNoMealMode(false)
              } else {
                router.push('/tablet/home')
              }
            }}
            className="inline-flex items-center gap-3 px-8 py-4 text-xl font-semibold rounded-2xl bg-gray-50 border-2 border-gray-300 text-gray-700 active:opacity-80 transition-opacity shadow-sm"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Retour
          </button>

          {/* Step indicator */}
          <div className="flex items-center gap-3 pt-3">
            {[1, 2, 3].map(s => (
              <div key={s} className={`w-4 h-4 rounded-full transition-all ${
                s === step ? 'bg-[#81c995] scale-125' : s < step ? 'bg-[#81c995]/50' : 'bg-gray-200'
              }`} />
            ))}
          </div>
        </div>

        <div>
          <h1 className="text-5xl font-bold mb-2" style={{ fontFamily: 'Quicksand, sans-serif' }}>
            Contrôle Températures
          </h1>
          <p className="text-2xl text-muted-foreground">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="card p-6 mb-8 bg-danger-50 border-2 border-danger-200">
          <p className="text-xl text-danger-700">{error}</p>
        </div>
      )}

      {/* ========== STEP 1: Meal Selection (optional) ========== */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Meal selection */}
          <div className="relative rounded-3xl p-8 bg-white border border-[#81c995]/20 shadow-lg overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#f1f9f3] to-white opacity-60"></div>
            <div className="relative z-10">
              <label className="block text-2xl font-bold mb-2 text-gray-900">
                Associer à un repas
              </label>
              <p className="text-lg text-gray-500 mb-6">Optionnel — sélectionnez un repas ou passez directement au relevé</p>

              {todayMeals.length > 0 ? (
                <div className="grid grid-cols-3 gap-4">
                  {todayMeals.map((meal: any) => (
                    <button
                      key={meal.id}
                      onClick={() => setSelectedMeal(meal.id)}
                      className={`p-6 rounded-2xl border-2 text-xl font-semibold transition-all shadow-md ${
                        selectedMeal === meal.id
                          ? 'bg-[#81c995] border-[#4a8f5a] text-white scale-105'
                          : 'bg-white border-[#81c995]/40 shadow-lg'
                      }`}
                    >
                      {meal.meal_type === 'Breakfast' && '🥐 Petit-déjeuner'}
                      {meal.meal_type === 'Lunch' && '🍽️ Déjeuner'}
                      {meal.meal_type === 'Snack' && '🍪 Goûter'}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xl text-gray-500">Aucun repas validé pour aujourd&apos;hui</p>
              )}
            </div>
          </div>

          {/* No-meal button */}
          <button
            onClick={() => setNoMealMode(true)}
            className="w-full relative rounded-3xl p-8 bg-white border-2 border-dashed border-[#81c995] shadow-lg overflow-hidden active:opacity-80 transition-opacity"
          >
            <div className="flex items-center justify-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#f1f9f3] flex items-center justify-center text-3xl">
                🌡️
              </div>
              <div className="text-left">
                <p className="text-2xl font-bold text-gray-900">Relevé sans repas</p>
                <p className="text-lg text-gray-500">Stockage, réception, contrôle de routine...</p>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* ========== STEP 2: Checkpoint Selection ========== */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="relative rounded-3xl p-8 bg-white border border-[#ffab91]/20 shadow-lg overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#fffaf8] to-white opacity-60"></div>
            <div className="relative z-10">
              <label className="block text-2xl font-bold mb-2 text-gray-900">
                Points de contrôle
              </label>
              <p className="text-lg text-gray-500 mb-6">Sélectionnez les contrôles à effectuer</p>

              <div className="grid grid-cols-2 gap-4">
                {(Object.entries(checkpointInfo) as [CheckpointType, typeof checkpointInfo[CheckpointType]][]).map(([key, info]) => {
                  const isSelected = selectedCheckpoints.includes(key)
                  return (
                    <button
                      key={key}
                      onClick={() => toggleCheckpoint(key)}
                      className={`p-6 rounded-2xl border-3 text-left transition-all shadow-md ${
                        isSelected
                          ? 'bg-[#81c995]/10 border-[#81c995] scale-[1.02] shadow-lg'
                          : 'bg-white border-gray-200 shadow-lg'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl transition-colors ${
                          isSelected ? 'bg-[#81c995]/20' : 'bg-gray-100'
                        }`}>
                          {info.icon}
                        </div>
                        <div className="flex-1">
                          <p className="text-xl font-bold text-gray-900">{info.label}</p>
                          <p className="text-sm text-gray-500">{info.description}</p>
                          <p className="text-sm font-medium text-[#81c995] mt-1">{info.range}</p>
                        </div>
                        <div className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all ${
                          isSelected ? 'bg-[#81c995] border-[#81c995]' : 'border-gray-300'
                        }`}>
                          {isSelected && (
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Continue button */}
          {selectedCheckpoints.length > 0 && (
            <div className="fixed bottom-8 left-0 right-0 px-8">
              <div className="max-w-7xl mx-auto">
                <button
                  onClick={() => {/* selectedCheckpoints triggers step 3 via useEffect */}}
                  className="rounded-2xl bg-[#4a8f5a] text-white w-full h-20 text-2xl font-bold shadow-2xl active:opacity-80 transition-opacity"
                >
                  Continuer avec {selectedCheckpoints.length} contrôle{selectedCheckpoints.length > 1 ? 's' : ''}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========== STEP 3: Temperature Entry ========== */}
      {step === 3 && (
        <>
          {/* Context reminder */}
          <div className="flex items-center gap-3 mb-6 px-2">
            <span className="text-lg text-gray-500">
              {noMealMode ? '🌡️ Relevé sans repas' : `🍽️ ${todayMeals.find(m => m.id === selectedMeal)?.meal_type === 'Breakfast' ? 'Petit-déjeuner' : todayMeals.find(m => m.id === selectedMeal)?.meal_type === 'Lunch' ? 'Déjeuner' : 'Goûter'}`}
              {' — '}
              {selectedCheckpoints.map(cp => checkpointInfo[cp].label).join(', ')}
            </span>
          </div>

          <div className="space-y-6 mb-32">
            {temperatures.map((temp, index) => {
              const info = checkpointInfo[temp.checkpoint]
              const hasValue = temp.temperature !== ''
              const tempValue = parseFloat(temp.temperature)
              const isCompliant = hasValue && !isNaN(tempValue) ? calculateCompliance(temp.checkpoint, tempValue) : null

              return (
                <div key={temp.checkpoint} className="relative rounded-3xl p-8 bg-white border border-[#ffab91]/20 shadow-lg overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#fffaf8] to-white opacity-60"></div>

                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ffab91]/10 to-[#ffab91]/5 flex items-center justify-center text-3xl shadow-md">
                        {info.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-3xl font-bold text-gray-900 tracking-tight">{info.label}</h3>
                        <p className="text-lg text-gray-600">
                          Plage conforme : {info.range}
                        </p>
                      </div>

                      {/* Compliance badge (read-only, auto-calculated) */}
                      {hasValue && isCompliant !== null && (
                        <div className={`px-5 py-3 rounded-2xl text-lg font-bold ${
                          isCompliant
                            ? 'bg-success-100 text-success-700'
                            : 'bg-danger-100 text-danger-700'
                        }`}>
                          {isCompliant ? '✅ Conforme' : '❌ Non conforme'}
                        </div>
                      )}
                    </div>

                    {/* Temperature Input */}
                    <div className="mb-6">
                      <label className="block text-xl font-medium mb-3">
                        Température (°C)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={temp.temperature}
                        onChange={(e) => updateTemperature(index, 'temperature', e.target.value)}
                        className={`w-full px-6 py-4 text-3xl font-bold rounded-xl border-4 text-center focus:outline-none focus:ring-4 transition-all ${
                          hasValue && isCompliant === false
                            ? 'border-danger-500 bg-danger-50 text-danger-700 focus:ring-danger-500'
                            : hasValue && isCompliant === true
                            ? 'border-success-500 bg-success-50 text-success-700 focus:ring-success-500'
                            : 'border-border bg-background focus:ring-primary-500'
                        }`}
                        placeholder="--.-"
                      />
                    </div>

                    {/* Notes — required when non-compliant */}
                    <div>
                      <label className="block text-xl font-medium mb-3">
                        {hasValue && isCompliant === false ? (
                          <span className="text-danger-600">Remarque obligatoire (non conforme) *</span>
                        ) : (
                          'Remarques (optionnel)'
                        )}
                      </label>
                      <textarea
                        value={temp.notes}
                        onChange={(e) => updateTemperature(index, 'notes', e.target.value)}
                        className={`w-full px-4 py-3 text-lg rounded-xl border-2 focus:outline-none focus:ring-4 focus:ring-primary-500 bg-background ${
                          hasValue && isCompliant === false && !temp.notes.trim()
                            ? 'border-danger-400'
                            : 'border-border'
                        }`}
                        rows={2}
                        placeholder={hasValue && isCompliant === false
                          ? 'Décrivez la situation et les actions correctives...'
                          : 'Ajouter une remarque...'}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Validate Button */}
          <div className="fixed bottom-8 left-0 right-0 px-8">
            <div className="max-w-7xl mx-auto">
              <button
                onClick={handleSubmit}
                disabled={isSaving}
                className="rounded-2xl bg-[#4a8f5a] text-white w-full h-24 text-3xl font-bold shadow-2xl disabled:opacity-50 active:opacity-80 transition-opacity"
              >
                {isSaving ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="animate-spin h-10 w-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Enregistrement...
                  </span>
                ) : (
                  <>
                    <svg className="w-10 h-10 mr-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Valider les températures
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
