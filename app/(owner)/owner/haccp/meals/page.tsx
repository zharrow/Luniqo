'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import {
  haccpService,
  type Meal,
  type CreateMealInput,
  type MealType,
  type Product,
  type MealItem,
  type CreateMealItemInput,
  type MenuTemplate,
  type Batch
} from '@/lib/services/haccp.service'
import { usersService, type ProfileWithRooms } from '@/lib/services/users.service'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ClipboardDocumentCheckIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ShoppingBagIcon,
  XMarkIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline'
import { format, startOfWeek, endOfWeek, addDays, subWeeks, addWeeks } from 'date-fns'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'
import { fr } from 'date-fns/locale'
import { DeleteConfirmationDialog } from '@/components/shared/DeleteConfirmationDialog'
import { FormDialog } from '@/components/shared/FormDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'

export default function MealsPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery } = useNursery()
  const [meals, setMeals] = useState<Meal[]>([])
  const [users, setUsers] = useState<ProfileWithRooms[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [menuTemplates, setMenuTemplates] = useState<MenuTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMeals, setLoadingMeals] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null)
  const [mealToDelete, setMealToDelete] = useState<Meal | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))

  // Form state
  const [formData, setFormData] = useState<CreateMealInput>({
    date: format(new Date(), 'yyyy-MM-dd'),
    type: 'Lunch',
    menu: '',
    allergens_present: '',
    responsible_id: ''
  })

  // Selected products for the meal
  const [selectedProducts, setSelectedProducts] = useState<CreateMealItemInput[]>([])

  // Meal items cache (for display)
  const [mealItemsCache, setMealItemsCache] = useState<Record<string, MealItem[]>>({})

  // Product search state
  const [productSearch, setProductSearch] = useState('')

  // Batches cache per product
  const [batchesByProduct, setBatchesByProduct] = useState<Record<string, Batch[]>>({})

  // Load initial data (users, products, templates) - only once
  const loadInitialData = useCallback(async () => {
    if (!selectedNursery?.id) return

    try {
      setLoading(true)
      const [usersData, productsData, templatesData] = await Promise.all([
        usersService.getEmployeesByNursery(selectedNursery.id),
        haccpService.getActiveProducts(selectedNursery.id),
        haccpService.getMenuTemplates(selectedNursery.id)
      ])

      setUsers(usersData)
      setProducts(productsData)
      setMenuTemplates(templatesData)
    } catch (error) {
      console.error('Error loading initial data:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedNursery?.id])

  // Load meals for the current week - called when week changes
  const loadMeals = useCallback(async () => {
    if (!selectedNursery?.id) return

    try {
      setLoadingMeals(true)
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })

      const mealsData = await haccpService.getMeals(
        selectedNursery.id,
        format(weekStart, 'yyyy-MM-dd'),
        format(weekEnd, 'yyyy-MM-dd')
      )

      setMeals(mealsData)

      // Load meal items for all meals
      const itemsPromises = mealsData.map(async (meal) => {
        const items = await haccpService.getMealItems(meal.id)
        return { mealId: meal.id, items }
      })
      const itemsResults = await Promise.all(itemsPromises)
      const cache: Record<string, MealItem[]> = {}
      itemsResults.forEach(r => { cache[r.mealId] = r.items })
      setMealItemsCache(cache)
    } catch (error) {
      console.error('Error loading meals:', error)
    } finally {
      setLoadingMeals(false)
    }
  }, [selectedNursery?.id, weekStart])

  // Load initial data once
  useEffect(() => {
    if (selectedNursery?.id) {
      loadInitialData()
    } else if (!authLoading && !selectedNursery) {
      setLoading(false)
    }
  }, [selectedNursery?.id, authLoading, loadInitialData])

  // Load meals when week changes
  useEffect(() => {
    if (selectedNursery?.id && !loading) {
      loadMeals()
    }
  }, [selectedNursery?.id, weekStart, loading, loadMeals])

  // Compute allergens from selected products
  const computedAllergens = useCallback(() => {
    const allergenSet = new Set<string>()
    selectedProducts.forEach(sp => {
      const product = products.find(p => p.id === sp.product_id)
      if (product?.allergens) {
        product.allergens.split(',').forEach(a => allergenSet.add(a.trim()))
      }
    })
    return Array.from(allergenSet)
  }, [selectedProducts, products])

  function openCreateModal(date?: Date, type?: MealType) {
    setEditingMeal(null)
    setFormData({
      date: date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      type: type || 'Lunch',
      menu: '',
      allergens_present: '',
      responsible_id: users[0]?.id || session?.user?.id || ''
    })
    setSelectedProducts([])
    setProductSearch('') // Reset search
    setShowModal(true)
  }

  async function openEditModal(meal: Meal) {
    if (!selectedNursery?.id) return

    setEditingMeal(meal)
    setFormData({
      date: meal.date,
      type: meal.type,
      menu: meal.menu || '',
      allergens_present: meal.allergens_present || '',
      responsible_id: meal.responsible_id
    })

    // Load existing meal items
    try {
      const items = await haccpService.getMealItems(meal.id)
      const mappedItems = items.map(item => ({
        product_id: item.product_id,
        batch_id: item.batch_id || undefined,
        quantity: item.quantity || undefined,
        unit: item.unit || undefined,
        notes: item.notes || undefined
      }))
      setSelectedProducts(mappedItems)

      // Load batches for all products in this meal
      const productIds = items.map(item => item.product_id)
      const batchesPromises = productIds.map(async (productId) => {
        if (!batchesByProduct[productId]) {
          const batches = await haccpService.getActiveBatchesByProduct(selectedNursery.id, productId)
          return { productId, batches }
        }
        return null
      })
      const batchesResults = await Promise.all(batchesPromises)
      const newBatches: Record<string, Batch[]> = {}
      batchesResults.forEach(result => {
        if (result) {
          newBatches[result.productId] = result.batches
        }
      })
      if (Object.keys(newBatches).length > 0) {
        setBatchesByProduct(prev => ({ ...prev, ...newBatches }))
      }
    } catch (error) {
      console.error('Error loading meal items:', error)
      setSelectedProducts([])
    }

    setProductSearch('') // Reset search
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedNursery?.id) return

    try {
      setIsSubmitting(true)

      // Update allergens from selected products
      const allergens = computedAllergens().join(', ')
      const dataToSave = {
        ...formData,
        allergens_present: allergens || formData.allergens_present
      }

      let mealId: string

      if (editingMeal) {
        await haccpService.updateMeal(editingMeal.id, selectedNursery.id, dataToSave)
        mealId = editingMeal.id
      } else {
        const newMeal = await haccpService.createMeal(selectedNursery.id, dataToSave)
        mealId = newMeal.id
      }

      // Save meal items
      if (selectedProducts.length > 0) {
        await haccpService.setMealItems(mealId, selectedProducts)
      }

      setShowModal(false)
      loadMeals()
    } catch (error) {
      console.error('Error saving meal:', error)
      alert('Erreur lors de la sauvegarde')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function addProductToMeal(productId: string) {
    if (selectedProducts.some(sp => sp.product_id === productId)) return
    if (!selectedNursery?.id) return

    setSelectedProducts([...selectedProducts, {
      product_id: productId,
      quantity: undefined,
      unit: 'g',
      notes: undefined,
      batch_id: undefined
    }])
    setProductSearch('') // Clear search after adding

    // Load batches for this product if not already cached
    if (!batchesByProduct[productId]) {
      try {
        const batches = await haccpService.getActiveBatchesByProduct(selectedNursery.id, productId)
        setBatchesByProduct(prev => ({ ...prev, [productId]: batches }))
      } catch (error) {
        console.error('Error loading batches for product:', error)
      }
    }
  }

  function removeProductFromMeal(productId: string) {
    setSelectedProducts(selectedProducts.filter(sp => sp.product_id !== productId))
  }

  function updateProductInMeal(productId: string, updates: Partial<CreateMealItemInput>) {
    setSelectedProducts(selectedProducts.map(sp =>
      sp.product_id === productId ? { ...sp, ...updates } : sp
    ))
  }

  function applyTemplate(template: MenuTemplate) {
    if (!template.items) return
    const newItems: CreateMealItemInput[] = template.items.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity || undefined,
      unit: item.unit || undefined,
      notes: item.notes || undefined
    }))
    setSelectedProducts(newItems)

    // Also update menu description from template name
    setFormData(prev => ({
      ...prev,
      menu: template.name + (template.description ? ` - ${template.description}` : '')
    }))
  }

  function openDeleteDialog(meal: Meal) {
    setMealToDelete(meal)
  }

  async function handleConfirmDelete() {
    if (!selectedNursery?.id || !mealToDelete) return

    try {
      setIsDeleting(true)
      await haccpService.deleteMeal(mealToDelete.id, selectedNursery.id)
      loadMeals()
    } catch (error) {
      console.error('Error deleting meal:', error)
      alert('Erreur lors de la suppression')
    } finally {
      setIsDeleting(false)
      setMealToDelete(null)
    }
  }

  async function toggleValidation(meal: Meal) {
    if (!selectedNursery?.id) return

    try {
      await haccpService.updateMeal(meal.id, selectedNursery.id, {
        is_validated: !meal.is_validated
      })
      loadMeals()
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
      default: return 'bg-muted text-muted-foreground border-border'
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

  // Filter templates by current meal type
  const filteredTemplates = menuTemplates.filter(t => t.meal_type === formData.type)

  if (authLoading || loading) {
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
            { label: 'HACCP', href: '/owner/haccp' },
            { label: 'Repas' }
          ]}
        />

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-orange-100">
              <ClipboardDocumentCheckIcon className="w-6 h-6 text-orange-600" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Repas</h1>
              <p className="text-sm text-muted-foreground">
                Planification des repas avec traçabilité des produits
              </p>
            </div>
          </div>
        </div>

        {/* Week navigation */}
        <div
          className="relative rounded-3xl p-4 mb-6 bg-white overflow-hidden"
          style={{
            border: '1px solid #ffab9133',
            background: 'linear-gradient(to bottom right, #fffaf8, white)',
            boxShadow: '0 4px 12px -4px rgba(255,171,145,0.15)'
          }}
        >
          <div className="flex items-center justify-between">
            <button
              onClick={previousWeek}
              className="p-2 rounded-xl hover:bg-orange-50 transition-all duration-300 hover:scale-110"
            >
              <ChevronLeftIcon className="w-5 h-5" style={{ color: '#d97557' }} />
            </button>

            <div className="flex items-center gap-4">
              <CalendarIcon className="w-5 h-5" style={{ color: '#d97557' }} />
              <span className="font-semibold text-gray-900">
                Semaine du {format(weekStart, 'd MMMM yyyy', { locale: fr })}
              </span>
              <button
                onClick={goToToday}
                className="px-3 py-1.5 rounded-xl text-sm bg-gradient-to-br from-orange-100 to-orange-200 text-orange-700 hover:from-orange-200 hover:to-orange-300 transition-all duration-300 font-medium"
              >
                Aujourd'hui
              </button>
            </div>

            <button
              onClick={nextWeek}
              className="p-2 rounded-xl hover:bg-orange-50 transition-all duration-300 hover:scale-110"
            >
              <ChevronRightIcon className="w-5 h-5" style={{ color: '#d97557' }} />
            </button>
          </div>
        </div>

        {/* Weekly grid */}
        <div className="relative overflow-x-auto">
          {loadingMeals && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-20 flex items-center justify-center rounded-lg">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
                <p className="text-sm text-gray-600 font-medium">Chargement des repas...</p>
              </div>
            </div>
          )}
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-3 text-left text-sm font-medium text-muted-foreground bg-muted border border-border sticky left-0 z-10">
                  Type de repas
                </th>
                {weekDays.map((day) => {
                  const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                  return (
                    <th
                      key={day.toISOString()}
                      className={`p-3 text-center text-sm font-medium border border-border ${
                        isToday ? 'bg-primary-50 text-primary-700' : 'bg-muted text-muted-foreground'
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
                  <td className="p-3 font-medium bg-muted border border-border sticky left-0 z-10">
                    <span className={`px-3 py-1 rounded-lg text-sm font-medium border ${getMealTypeColor(type)}`}>
                      {getMealTypeLabel(type)}
                    </span>
                  </td>
                  {weekDays.map((day) => {
                    const meal = getMealForDateAndType(day, type)
                    const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                    const mealItems = meal ? mealItemsCache[meal.id] || [] : []

                    return (
                      <td
                        key={`${day.toISOString()}-${type}`}
                        className={`p-2 border border-border ${isToday ? 'bg-primary-50/30' : ''}`}
                      >
                        {meal ? (
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                {/* Products used */}
                                {mealItems.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {mealItems.slice(0, 3).map(item => (
                                      <Badge
                                        key={item.id}
                                        variant="outline"
                                        className={`text-xs py-0 px-1 ${item.batch_id ? 'border-green-300 bg-green-50' : ''}`}
                                        title={item.batch?.batch_number ? `Lot: ${item.batch.batch_number}` : 'Pas de lot spécifié'}
                                      >
                                        {item.product?.name?.substring(0, 15) || 'Produit'}
                                        {item.batch?.batch_number && (
                                          <span className="ml-1 text-green-600">✓</span>
                                        )}
                                      </Badge>
                                    ))}
                                    {mealItems.length > 3 && (
                                      <Badge variant="outline" className="text-xs py-0 px-1">
                                        +{mealItems.length - 3}
                                      </Badge>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground italic">Aucun produit</p>
                                )}

                                {/* Allergens */}
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
                                      : 'text-muted-foreground/60 hover:bg-muted'
                                  }`}
                                  title={meal.is_validated ? 'Validé' : 'Non validé'}
                                >
                                  <CheckCircleIcon className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => openEditModal(meal)}
                                  className="p-1 rounded hover:bg-muted transition-colors"
                                  title="Modifier"
                                >
                                  <PencilIcon className="w-3 h-3 text-muted-foreground" />
                                </button>
                                <button
                                  onClick={() => openDeleteDialog(meal)}
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
                            className="w-full p-3 rounded-lg border-2 border-dashed border-border hover:border-primary-300 hover:bg-primary-50 transition-colors text-sm text-muted-foreground/60 hover:text-primary-600"
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

        {/* Form Dialog */}
        <FormDialog
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
          title={editingMeal ? 'Modifier le repas' : 'Nouveau repas'}
          submitLabel={editingMeal ? 'Modifier' : 'Créer'}
          isSubmitting={isSubmitting}
          maxWidth="2xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left column - Basic info */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Date *
                </label>
                <DatePicker
                  value={formData.date}
                  onChange={(date) => {
                    if (date) {
                      setFormData({ ...formData, date: format(date, 'yyyy-MM-dd') })
                    }
                  }}
                  placeholder="Sélectionner une date"
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Type de repas *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as MealType })}
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                >
                  <option value="Breakfast">🌅 Petit-déjeuner</option>
                  <option value="Lunch">🍽️ Déjeuner</option>
                  <option value="Snack">🍪 Goûter</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Responsable *
                </label>
                <select
                  value={formData.responsible_id}
                  onChange={(e) => setFormData({ ...formData, responsible_id: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
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

              {/* Menu Templates */}
              {filteredTemplates.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <DocumentDuplicateIcon className="w-4 h-4 inline mr-1" />
                    Appliquer un menu type
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {filteredTemplates.map(template => (
                      <Button
                        key={template.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyTemplate(template)}
                        className="text-xs"
                      >
                        {template.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Computed Allergens Display */}
              {computedAllergens().length > 0 && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <div className="flex items-start gap-2">
                    <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-amber-900 mb-1">Allergènes détectés</p>
                      <div className="flex flex-wrap gap-1">
                        {computedAllergens().map(allergen => (
                          <Badge key={allergen} className="bg-amber-100 text-amber-800 text-xs">
                            {allergen}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right column - Products */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  <ShoppingBagIcon className="w-4 h-4 inline mr-1" />
                  Produits utilisés ({selectedProducts.length})
                </label>

                {/* Selected products with editable quantities */}
                {selectedProducts.length > 0 ? (
                  <div className="space-y-3 mb-4 max-h-[320px] overflow-y-auto pr-2">
                    {selectedProducts.map(sp => {
                      const product = products.find(p => p.id === sp.product_id)
                      return (
                        <div
                          key={sp.product_id}
                          className="p-3 rounded-xl bg-gradient-to-br from-lime-50 to-lime-100 border border-lime-200 space-y-2"
                        >
                          {/* Product name and remove button */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {product?.name || 'Produit inconnu'}
                              </p>
                              {product?.category && (
                                <p className="text-xs text-gray-500">{product.category}</p>
                              )}
                              {product?.allergens && (
                                <div className="flex items-center gap-1 mt-1">
                                  <ExclamationTriangleIcon className="w-3 h-3 text-amber-600 flex-shrink-0" />
                                  <p className="text-xs text-amber-700">
                                    {product.allergens}
                                  </p>
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeProductFromMeal(sp.product_id)}
                              className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-colors flex-shrink-0"
                              title="Retirer"
                            >
                              <XMarkIcon className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Batch selector */}
                          {batchesByProduct[sp.product_id]?.length > 0 && (
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Lot utilisé
                              </label>
                              <select
                                value={sp.batch_id || ''}
                                onChange={(e) => updateProductInMeal(sp.product_id, {
                                  batch_id: e.target.value || undefined
                                })}
                                className="w-full px-2 py-1.5 text-sm rounded-lg border border-lime-300 bg-white focus:outline-none focus:ring-2 focus:ring-lime-400"
                              >
                                <option value="">Sélectionner un lot</option>
                                {batchesByProduct[sp.product_id].map(batch => (
                                  <option key={batch.id} value={batch.id}>
                                    {batch.batch_number || 'N/A'} - {batch.status === 'opened' ? '🟢 Ouvert' : '📦 Scellé'}
                                    {batch.expiry_date && ` - Exp: ${new Date(batch.expiry_date).toLocaleDateString('fr-FR')}`}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* No batches available message */}
                          {batchesByProduct[sp.product_id]?.length === 0 && (
                            <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
                              <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 flex-shrink-0" />
                              <p className="text-xs text-amber-700">
                                Aucun lot disponible pour ce produit
                              </p>
                            </div>
                          )}

                          {/* Quantity and unit inputs */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Quantité
                              </label>
                              <input
                                type="number"
                                value={sp.quantity || ''}
                                onChange={(e) => updateProductInMeal(sp.product_id, {
                                  quantity: e.target.value ? parseFloat(e.target.value) : undefined
                                })}
                                className="w-full px-2 py-1.5 text-sm rounded-lg border border-lime-300 bg-white focus:outline-none focus:ring-2 focus:ring-lime-400"
                                placeholder="Ex: 100"
                                step="0.01"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Unité
                              </label>
                              <select
                                value={sp.unit || 'g'}
                                onChange={(e) => updateProductInMeal(sp.product_id, {
                                  unit: e.target.value
                                })}
                                className="w-full px-2 py-1.5 text-sm rounded-lg border border-lime-300 bg-white focus:outline-none focus:ring-2 focus:ring-lime-400"
                              >
                                <option value="g">g (grammes)</option>
                                <option value="kg">kg (kilogrammes)</option>
                                <option value="ml">ml (millilitres)</option>
                                <option value="l">l (litres)</option>
                                <option value="unité">unité</option>
                                <option value="portion">portion</option>
                              </select>
                            </div>
                          </div>

                          {/* Notes input */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Notes (optionnel)
                            </label>
                            <input
                              type="text"
                              value={sp.notes || ''}
                              onChange={(e) => updateProductInMeal(sp.product_id, {
                                notes: e.target.value || undefined
                              })}
                              className="w-full px-2 py-1.5 text-sm rounded-lg border border-lime-300 bg-white focus:outline-none focus:ring-2 focus:ring-lime-400"
                              placeholder="Notes sur la préparation..."
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="p-6 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 text-center mb-4">
                    <ShoppingBagIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Aucun produit sélectionné
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Recherchez et ajoutez des produits ci-dessous
                    </p>
                  </div>
                )}

                {/* Product selection */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Ajouter un produit
                  </label>
                  <input
                    type="text"
                    placeholder="Rechercher un produit (nom, catégorie, marque)..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-lime-400 mb-2 text-sm"
                  />
                  <div className="max-h-48 overflow-y-auto border border-border rounded-lg bg-white">
                    {products
                      .filter(p => {
                        const search = productSearch.toLowerCase()
                        return !selectedProducts.some(sp => sp.product_id === p.id) &&
                          (p.name.toLowerCase().includes(search) ||
                           p.category?.toLowerCase().includes(search) ||
                           p.brand?.toLowerCase().includes(search))
                      })
                      .slice(0, 15)
                      .map(product => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => addProductToMeal(product.id)}
                          className="w-full flex items-center justify-between p-2.5 hover:bg-lime-50 text-left border-b border-border last:border-b-0 transition-colors group"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate group-hover:text-lime-700">
                              {product.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {product.category}
                              {product.brand && ` · ${product.brand}`}
                            </p>
                            {product.allergens && (
                              <p className="text-xs text-amber-600 mt-0.5 truncate">
                                ⚠️ {product.allergens}
                              </p>
                            )}
                          </div>
                          <PlusIcon className="w-4 h-4 text-lime-600 ml-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                    {products.filter(p => {
                      const search = productSearch.toLowerCase()
                      return !selectedProducts.some(sp => sp.product_id === p.id) &&
                        (p.name.toLowerCase().includes(search) ||
                         p.category?.toLowerCase().includes(search) ||
                         p.brand?.toLowerCase().includes(search))
                    }).length === 0 && (
                      <div className="p-6 text-center">
                        {productSearch ? (
                          <>
                            <p className="text-sm text-muted-foreground">
                              Aucun produit trouvé pour « {productSearch} »
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Essayez un autre terme de recherche
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Tous les produits ont été ajoutés
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FormDialog>

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmationDialog
          isOpen={!!mealToDelete}
          onClose={() => setMealToDelete(null)}
          onConfirm={handleConfirmDelete}
          title="Confirmer la suppression"
          description="Êtes-vous sûr de vouloir supprimer ce repas"
          itemName={mealToDelete ? `${getMealTypeLabel(mealToDelete.type)} du ${format(new Date(mealToDelete.date), 'd MMMM', { locale: fr })}` : ''}
          isDeleting={isDeleting}
        />
      </div>
    </div>
  )
}
