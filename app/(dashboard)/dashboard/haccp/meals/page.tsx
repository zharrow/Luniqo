'use client'

import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { haccpService, type Meal, type CreateMealInput, type MealType } from '@/lib/services/haccp.service'
import { usersService, type UserWithRooms } from '@/lib/services/users.service'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ClipboardDocumentCheckIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'
import { format, startOfWeek, endOfWeek, addDays, subWeeks, addWeeks } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function MealsPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Admin'])
  const [meals, setMeals] = useState<Meal[]>([])
  const [users, setUsers] = useState<UserWithRooms[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [formData, setFormData] = useState<CreateMealInput>({
    date: format(new Date(), 'yyyy-MM-dd'),
    type: 'Lunch',
    menu: '',
    allergens_present: '',
    responsible_id: ''
  })

  useEffect(() => {
    if (session?.enterprise) {
      loadData()
    }
  }, [session, weekStart])

  async function loadData() {
    if (!session?.enterprise?.id) return

    try {
      setLoading(true)
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })

      const [mealsData, usersData] = await Promise.all([
        haccpService.getMeals(
          session.enterprise.id,
          format(weekStart, 'yyyy-MM-dd'),
          format(weekEnd, 'yyyy-MM-dd')
        ),
        usersService.getAll(session.enterprise.id)
      ])

      setMeals(mealsData)
      setUsers(usersData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal(date?: Date, type?: MealType) {
    setEditingMeal(null)
    setFormData({
      date: date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      type: type || 'Lunch',
      menu: '',
      allergens_present: '',
      responsible_id: users[0]?.id || session?.user?.id || ''
    })
    setShowModal(true)
  }

  function openEditModal(meal: Meal) {
    setEditingMeal(meal)
    setFormData({
      date: meal.date,
      type: meal.type,
      menu: meal.menu || '',
      allergens_present: meal.allergens_present || '',
      responsible_id: meal.responsible_id
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!session?.enterprise?.id) return

    try {
      if (editingMeal) {
        await haccpService.updateMeal(editingMeal.id, session.enterprise.id, formData)
      } else {
        await haccpService.createMeal(session.enterprise.id, formData)
      }

      setShowModal(false)
      loadData()
    } catch (error) {
      console.error('Error saving meal:', error)
      alert('Erreur lors de la sauvegarde')
    }
  }

  async function handleDelete(meal: Meal) {
    if (!session?.enterprise?.id) return
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ce repas ?`)) return

    try {
      await haccpService.deleteMeal(meal.id, session.enterprise.id)
      loadData()
    } catch (error) {
      console.error('Error deleting meal:', error)
      alert('Erreur lors de la suppression')
    }
  }

  async function toggleValidation(meal: Meal) {
    if (!session?.enterprise?.id) return

    try {
      await haccpService.updateMeal(meal.id, session.enterprise.id, {
        is_validated: !meal.is_validated
      })
      loadData()
    } catch (error) {
      console.error('Error updating meal:', error)
    }
  }

  function previousWeek() {
    setWeekStart(subWeeks(weekStart, 1))
  }

  function nextWeek() {
    setWeekStart(addWeeks(weekStart, 1))
  }

  function goToToday() {
    setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
  }

  const getMealTypeColor = (type: MealType) => {
    switch (type) {
      case 'Breakfast': return 'bg-primary-50 text-primary-700 border-primary-200'
      case 'Lunch': return 'bg-secondary-50 text-secondary-700 border-secondary-200'
      case 'Snack': return 'bg-accent-50 text-accent-700 border-accent-200'
      default: return 'bg-neutral-50 text-neutral-700 border-neutral-200'
    }
  }

  const getMealTypeLabel = (type: MealType) => {
    switch (type) {
      case 'Breakfast': return 'Petit-déjeuner'
      case 'Lunch': return 'Déjeuner'
      case 'Snack': return 'Goûter'
      default: return type
    }
  }

  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const mealTypes: MealType[] = ['Breakfast', 'Lunch', 'Snack']

  // Group meals by date and type
  const getMealForDateAndType = (date: Date, type: MealType): Meal | undefined => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return meals.find(m => m.date === dateStr && m.type === type)
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

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2" style={{ fontFamily: 'Quicksand, sans-serif' }}>
              Repas
            </h1>
            <p className="text-neutral-600">
              Planification des repas et traçabilité alimentaire
            </p>
          </div>
          <button
            onClick={() => openCreateModal()}
            className="btn btn-primary flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Nouveau repas
          </button>
        </div>

        {/* Week navigation */}
        <div className="card p-4 mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={previousWeek}
              className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
            >
              <ChevronLeftIcon className="w-5 h-5 text-neutral-600" />
            </button>

            <div className="flex items-center gap-4">
              <CalendarIcon className="w-5 h-5 text-neutral-500" />
              <span className="font-semibold text-neutral-900">
                Semaine du {format(weekStart, 'd MMMM yyyy', { locale: fr })}
              </span>
              <button
                onClick={goToToday}
                className="px-3 py-1 rounded-lg text-sm bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors"
              >
                Aujourd'hui
              </button>
            </div>

            <button
              onClick={nextWeek}
              className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
            >
              <ChevronRightIcon className="w-5 h-5 text-neutral-600" />
            </button>
          </div>
        </div>

        {/* Weekly grid */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-3 text-left text-sm font-medium text-neutral-500 bg-neutral-50 border border-neutral-200 sticky left-0 z-10">
                  Type de repas
                </th>
                {weekDays.map((day) => {
                  const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                  return (
                    <th
                      key={day.toISOString()}
                      className={`p-3 text-center text-sm font-medium border border-neutral-200 ${
                        isToday ? 'bg-primary-50 text-primary-700' : 'bg-neutral-50 text-neutral-500'
                      }`}
                    >
                      <div className="font-semibold">{format(day, 'EEEE', { locale: fr })}</div>
                      <div className="text-xs">{format(day, 'd MMM', { locale: fr })}</div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {mealTypes.map((type) => (
                <tr key={type}>
                  <td className="p-3 font-medium text-neutral-900 bg-neutral-50 border border-neutral-200 sticky left-0 z-10">
                    <span className={`px-3 py-1 rounded-lg text-sm font-medium border ${getMealTypeColor(type)}`}>
                      {getMealTypeLabel(type)}
                    </span>
                  </td>
                  {weekDays.map((day) => {
                    const meal = getMealForDateAndType(day, type)
                    const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

                    return (
                      <td
                        key={`${day.toISOString()}-${type}`}
                        className={`p-2 border border-neutral-200 ${isToday ? 'bg-primary-50/30' : ''}`}
                      >
                        {meal ? (
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-neutral-900 line-clamp-2">
                                  {meal.menu || 'Menu non défini'}
                                </p>
                                {meal.allergens_present && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <ExclamationTriangleIcon className="w-3 h-3 text-danger-600 flex-shrink-0" />
                                    <p className="text-xs text-danger-600 truncate">{meal.allergens_present}</p>
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                <button
                                  onClick={() => toggleValidation(meal)}
                                  className={`p-1 rounded transition-colors ${
                                    meal.is_validated
                                      ? 'text-success-600 hover:bg-success-50'
                                      : 'text-neutral-400 hover:bg-neutral-100'
                                  }`}
                                  title={meal.is_validated ? 'Validé' : 'Non validé'}
                                >
                                  <CheckCircleIcon className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => openEditModal(meal)}
                                  className="p-1 rounded hover:bg-neutral-100 transition-colors"
                                  title="Modifier"
                                >
                                  <PencilIcon className="w-3 h-3 text-neutral-600" />
                                </button>
                                <button
                                  onClick={() => handleDelete(meal)}
                                  className="p-1 rounded hover:bg-danger-50 transition-colors"
                                  title="Supprimer"
                                >
                                  <TrashIcon className="w-3 h-3 text-danger-600" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => openCreateModal(day, type)}
                            className="w-full p-3 rounded-lg border-2 border-dashed border-neutral-200 hover:border-primary-300 hover:bg-primary-50 transition-colors text-sm text-neutral-400 hover:text-primary-600"
                          >
                            + Ajouter
                          </button>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        {showModal && (
          <>
            <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowModal(false)}></div>
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <div className="card w-full max-w-md p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold text-neutral-900 mb-4">
                  {editingMeal ? 'Modifier le repas' : 'Nouveau repas'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Date *
                      </label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Type *
                      </label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as MealType })}
                        className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                      >
                        <option value="Breakfast">Petit-déjeuner</option>
                        <option value="Lunch">Déjeuner</option>
                        <option value="Snack">Goûter</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Menu
                    </label>
                    <textarea
                      value={formData.menu}
                      onChange={(e) => setFormData({ ...formData, menu: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Décrivez le menu du repas"
                      rows={4}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Allergènes présents
                    </label>
                    <input
                      type="text"
                      value={formData.allergens_present}
                      onChange={(e) => setFormData({ ...formData, allergens_present: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="ex: Lactose, Gluten, Oeufs"
                    />
                    <p className="text-xs text-neutral-500 mt-1">
                      Séparez les allergènes par des virgules
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Responsable *
                    </label>
                    <select
                      value={formData.responsible_id}
                      onChange={(e) => setFormData({ ...formData, responsible_id: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    >
                      <option value="">Sélectionner un responsable</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.first_name} {user.last_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="flex-1 px-4 py-2 rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="flex-1 btn btn-primary"
                    >
                      {editingMeal ? 'Modifier' : 'Créer'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
