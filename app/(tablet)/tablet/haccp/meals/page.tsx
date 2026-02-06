'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRequireTabletAuth } from '@/lib/contexts/TabletAuthContext'
import { haccpService } from '@/lib/services/haccp.service'
import { childService } from '@/lib/services/child.service'

interface Child {
  id: string
  first_name: string
  last_name: string
  section: string
}

interface MealServing {
  child_id: string
  portion_size: string
  comments: string
}

export default function TabletHaccpMealsPage() {
  const [children, setChildren] = useState<Child[]>([])
  const [todayMeals, setTodayMeals] = useState<any[]>([])
  const [selectedMeal, setSelectedMeal] = useState<string | null>(null)
  const [servings, setServings] = useState<Record<string, MealServing>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const { session } = useRequireTabletAuth()
  const router = useRouter()

  useEffect(() => {
    // useRequireTabletAuth handles redirect if no session
    if (session && session.enterprise?.id) {
      loadData()
    }
  }, [session])

  async function loadData() {
    try {
      if (!session?.enterprise?.id) return

      // Load today's meals
      const today = new Date().toISOString().split('T')[0]
      const meals = await haccpService.getMealsByDate(session.enterprise.id, today, today)

      // Filter only validated meals for today
      const todayValidated = meals.filter(
        (m: any) => m.date === today && m.is_validated
      )
      setTodayMeals(todayValidated)

      // Load children (using childService from Core module)
      const childrenData = await childService.getAll(session.enterprise.id)
      setChildren(childrenData as Child[])

      // Initialize servings for all children
      const initialServings: Record<string, MealServing> = {}
      childrenData.forEach((child: any) => {
        initialServings[child.id] = {
          child_id: child.id,
          portion_size: 'Normal',
          comments: ''
        }
      })
      setServings(initialServings)

    } catch (err: any) {
      console.error('Error loading data:', err)
      setError('Erreur lors du chargement')
    } finally {
      setIsLoading(false)
    }
  }

  function updateServing(childId: string, field: keyof MealServing, value: string) {
    setServings(prev => ({
      ...prev,
      [childId]: {
        ...prev[childId],
        [field]: value
      }
    }))
  }

  async function handleSubmit() {
    if (!selectedMeal || !session?.user?.id) {
      setError('Veuillez sélectionner un repas')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      // Prepare child_meal_record records
      const records = Object.values(servings).map(serving => ({
        meal_id: selectedMeal,
        child_id: serving.child_id,
        portion_size: serving.portion_size,
        comments: serving.comments || null,
        recorded_by_id: session.user.id
      }))

      // Save to database (we'll need to add this method to haccpService)
      await haccpService.recordMealServings(records)

      setSuccess(true)
      setTimeout(() => {
        router.push('/tablet/haccp')
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

  const groupedChildren = children.reduce((acc, child) => {
    if (!acc[child.section]) acc[child.section] = []
    acc[child.section].push(child)
    return acc
  }, {} as Record<string, Child[]>)

  return (
    <div className="tablet-mode min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-6">
          <button
            onClick={() => router.push('/tablet/haccp')}
            className="btn btn-secondary px-6 py-4 text-xl"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-5xl font-bold mb-2" style={{ fontFamily: 'Quicksand, sans-serif' }}>
              Enregistrer les Repas
            </h1>
            <p className="text-2xl text-muted-foreground">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="card p-6 mb-8 bg-danger-50 border-2 border-danger-200">
          <p className="text-xl text-danger-700">{error}</p>
        </div>
      )}

      {/* Meal Selection */}
      <div className="relative rounded-3xl p-8 mb-8 bg-white border border-[#81c995]/20 shadow-lg overflow-hidden">
        {/* Gradient vert pastel en fond */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#f1f9f3] to-white opacity-60"></div>

        <div className="relative z-10">
          <label className="block text-2xl font-bold mb-4 text-gray-900">
            Sélectionnez le repas
          </label>

          {todayMeals.length > 0 ? (
            <div className="grid grid-cols-3 gap-4">
              {todayMeals.map((meal: any) => (
                <button
                  key={meal.id}
                  onClick={() => setSelectedMeal(meal.id)}
                  className={`p-6 rounded-2xl border-2 text-xl font-semibold transition-all shadow-md ${
                    selectedMeal === meal.id
                      ? 'bg-[#81c995] border-[#4a8f5a] text-white scale-105'
                    : 'bg-white border-[#81c995]/20 hover:border-[#81c995] hover:shadow-lg'
                }`}
              >
                {meal.meal_type === 'Breakfast' && '🥐 Petit-déjeuner'}
                {meal.meal_type === 'Lunch' && '🍽️ Déjeuner'}
                {meal.meal_type === 'Snack' && '🍪 Goûter'}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xl text-gray-600">Aucun repas validé pour aujourd'hui</p>
        )}
        </div>
      </div>

      {/* Children List (if meal selected) */}
      {selectedMeal && Object.keys(groupedChildren).length > 0 && (
        <div className="space-y-8 mb-32">
          {Object.entries(groupedChildren).map(([section, sectionChildren]) => (
            <div key={section} className="relative rounded-3xl p-8 bg-white border border-[#81c995]/20 shadow-lg overflow-hidden">
              {/* Gradient vert pastel en fond */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#f1f9f3] to-white opacity-60"></div>

              <div className="relative z-10">
                <h3 className="text-3xl font-bold mb-6 text-gray-900">
                  {section === 'Babies' && '👶 Bébés'}
                  {section === 'Toddlers' && '🧒 Moyens'}
                  {section === 'Preschoolers' && '👦 Grands'}
                </h3>

              <div className="space-y-4">
                {sectionChildren.map((child) => (
                  <div key={child.id} className="bg-muted p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-2xl font-bold">
                        {child.first_name} {child.last_name}
                      </h4>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      {['Petite', 'Normal', 'Grande'].map((size) => (
                        <button
                          key={size}
                          onClick={() => updateServing(child.id, 'portion_size', size)}
                          className={`p-4 rounded-xl text-lg font-semibold transition-all ${
                            servings[child.id]?.portion_size === size
                              ? 'bg-success-500 text-white scale-105'
                              : 'bg-card border-2 border-border'
                          }`}
                        >
                          {size === 'Petite' && '🍽️ Petite'}
                          {size === 'Normal' && '🍽️🍽️ Normale'}
                          {size === 'Grande' && '🍽️🍽️🍽️ Grande'}
                        </button>
                      ))}
                    </div>

                    <textarea
                      value={servings[child.id]?.comments || ''}
                      onChange={(e) => updateServing(child.id, 'comments', e.target.value)}
                      className="w-full mt-4 px-4 py-3 text-lg rounded-xl border-2 border-border focus:outline-none focus:ring-4 focus:ring-primary-500 bg-background"
                      rows={2}
                      placeholder="Remarque (optionnel)..."
                    />
                  </div>
                ))}
              </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Validate Button */}
      {selectedMeal && (
        <div className="fixed bottom-8 left-0 right-0 px-8">
          <div className="max-w-7xl mx-auto">
            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className="rounded-2xl bg-[#81c995] text-white hover:bg-[#4a8f5a] w-full h-24 text-3xl font-bold shadow-2xl disabled:opacity-50 transition-colors"
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
                  Valider les repas
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
