'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import {
  haccpService,
  type BottleFeeding,
  type CreateBottleFeedingInput,
  type Product,
  type Batch
} from '@/lib/services/haccp.service'
import { childService, type Child } from '@/lib/services/child.service'
import { usersService, type ProfileWithRooms } from '@/lib/services/users.service'
import { pdfExportService } from '@/lib/services/pdf-export.service'
import { getTodayLocal, formatDateLocal } from '@/lib/utils/date'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  BeakerIcon
} from '@heroicons/react/24/outline'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'
import { DeleteConfirmationDialog } from '@/components/shared/DeleteConfirmationDialog'
import { FormDialog } from '@/components/shared/FormDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Card, CardContent } from '@/components/ui/card'

const MILK_CATEGORY = 'Laits infantiles'

export default function BottlesPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery } = useNursery()

  // Data state
  const [feedings, setFeedings] = useState<BottleFeeding[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [users, setUsers] = useState<ProfileWithRooms[]>([])
  const [stats, setStats] = useState({ totalFeedings: 0, totalQuantity: 0 })

  // UI state
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [showModal, setShowModal] = useState(false)
  const [editingFeeding, setEditingFeeding] = useState<BottleFeeding | null>(null)
  const [feedingToDelete, setFeedingToDelete] = useState<BottleFeeding | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Form state
  const [formData, setFormData] = useState<CreateBottleFeedingInput>({
    child_id: '',
    product_id: '',
    batch_id: '',
    quantity: 0,
    unit: 'mL',
    fed_at: new Date().toISOString(),
    fed_by_id: '',
    notes: ''
  })

  // Batches cache per product
  const [batchesByProduct, setBatchesByProduct] = useState<Record<string, Batch[]>>({})

  // Load initial data (children, products, users)
  const loadInitialData = useCallback(async () => {
    if (!selectedNursery?.id) return

    try {
      setLoading(true)
      const [childrenData, productsData, usersData] = await Promise.all([
        childService.getActive(selectedNursery.id),
        haccpService.getProductsByCategory(selectedNursery.id, MILK_CATEGORY),
        usersService.getEmployeesByNursery(selectedNursery.id)
      ])

      setChildren(childrenData)
      setProducts(productsData)
      setUsers(usersData)
    } catch (error) {
      console.error('Error loading initial data:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedNursery?.id])

  // Load feedings for the selected date
  const loadFeedings = useCallback(async () => {
    if (!selectedNursery?.id) return

    try {
      const dateStr = formatDateLocal(selectedDate)
      const [feedingsData, statsData] = await Promise.all([
        haccpService.getBottleFeedings(selectedNursery.id, dateStr),
        haccpService.getBottleFeedingStats(selectedNursery.id, dateStr)
      ])

      setFeedings(feedingsData)
      setStats(statsData)
    } catch (error) {
      console.error('Error loading feedings:', error)
    }
  }, [selectedNursery?.id, selectedDate])

  // Load initial data once
  useEffect(() => {
    if (selectedNursery?.id) {
      loadInitialData()
    } else if (!authLoading && !selectedNursery) {
      setLoading(false)
    }
  }, [selectedNursery?.id, authLoading, loadInitialData])

  // Load feedings when date changes
  useEffect(() => {
    if (selectedNursery?.id && !loading) {
      loadFeedings()
    }
  }, [selectedNursery?.id, selectedDate, loading, loadFeedings])

  // Get current time formatted for input
  function getCurrentDateTime() {
    const now = new Date()
    // Format: 2024-01-15T14:30
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  function openCreateModal() {
    setEditingFeeding(null)
    setFormData({
      child_id: children[0]?.id || '',
      product_id: products[0]?.id || '',
      batch_id: '',
      quantity: 150,
      unit: 'mL',
      fed_at: getCurrentDateTime(),
      fed_by_id: users[0]?.id || session?.user?.id || '',
      notes: ''
    })
    setShowModal(true)
  }

  function openEditModal(feeding: BottleFeeding) {
    setEditingFeeding(feeding)

    // Format fed_at for datetime-local input
    const fedAt = new Date(feeding.fed_at)
    const formattedFedAt = `${fedAt.getFullYear()}-${String(fedAt.getMonth() + 1).padStart(2, '0')}-${String(fedAt.getDate()).padStart(2, '0')}T${String(fedAt.getHours()).padStart(2, '0')}:${String(fedAt.getMinutes()).padStart(2, '0')}`

    setFormData({
      child_id: feeding.child_id,
      product_id: feeding.product_id || '',
      batch_id: feeding.batch_id || '',
      quantity: feeding.quantity,
      unit: feeding.unit,
      fed_at: formattedFedAt,
      fed_by_id: feeding.fed_by_id || '',
      notes: feeding.notes || ''
    })

    // Load batches for this product
    if (feeding.product_id) {
      loadBatchesForProduct(feeding.product_id)
    }

    setShowModal(true)
  }

  async function loadBatchesForProduct(productId: string) {
    if (!selectedNursery?.id || batchesByProduct[productId]) return

    try {
      const batches = await haccpService.getActiveBatchesByProduct(selectedNursery.id, productId)
      setBatchesByProduct(prev => ({ ...prev, [productId]: batches }))
    } catch (error) {
      console.error('Error loading batches:', error)
    }
  }

  async function handleProductChange(productId: string) {
    setFormData(prev => ({ ...prev, product_id: productId, batch_id: '' }))
    if (productId) {
      await loadBatchesForProduct(productId)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedNursery?.id) return

    try {
      setIsSubmitting(true)

      // Convert datetime-local to ISO string
      const fedAtDate = new Date(formData.fed_at)
      const dataToSave = {
        ...formData,
        fed_at: fedAtDate.toISOString(),
        product_id: formData.product_id || undefined,
        batch_id: formData.batch_id || undefined,
        fed_by_id: formData.fed_by_id || undefined,
        notes: formData.notes || undefined
      }

      if (editingFeeding) {
        await haccpService.updateBottleFeeding(editingFeeding.id, selectedNursery.id, dataToSave)
      } else {
        await haccpService.createBottleFeeding(selectedNursery.id, dataToSave)
      }

      setShowModal(false)
      loadFeedings()
    } catch (error) {
      console.error('Error saving feeding:', error)
      alert('Erreur lors de la sauvegarde')
    } finally {
      setIsSubmitting(false)
    }
  }

  function openDeleteDialog(feeding: BottleFeeding) {
    setFeedingToDelete(feeding)
  }

  async function handleConfirmDelete() {
    if (!selectedNursery?.id || !feedingToDelete) return

    try {
      setIsDeleting(true)
      await haccpService.deleteBottleFeeding(feedingToDelete.id, selectedNursery.id)
      loadFeedings()
    } catch (error) {
      console.error('Error deleting feeding:', error)
      alert('Erreur lors de la suppression')
    } finally {
      setIsDeleting(false)
      setFeedingToDelete(null)
    }
  }

  async function handleExportPDF() {
    if (!selectedNursery) return

    try {
      setIsExporting(true)
      const dateStr = formatDateLocal(selectedDate)

      const exportData = {
        nurseryName: selectedNursery.name,
        date: dateStr,
        feedings: feedings.map(f => ({
          fed_at: f.fed_at,
          child_name: f.child ? `${f.child.first_name} ${f.child.last_name}` : 'Inconnu',
          child_section: f.child?.section,
          milk_name: f.product?.name || 'Non spécifié',
          milk_brand: f.product?.brand || undefined,
          batch_number: f.batch?.batch_code || undefined,
          quantity: f.quantity,
          unit: f.unit,
          fed_by_name: f.fed_by ? `${f.fed_by.first_name || ''} ${f.fed_by.last_name || ''}`.trim() : 'Non spécifié',
          notes: f.notes || undefined
        }))
      }

      await pdfExportService.exportBottleTraceability(exportData)
    } catch (error) {
      console.error('Error exporting PDF:', error)
      alert('Erreur lors de l\'export PDF')
    } finally {
      setIsExporting(false)
    }
  }

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  // No nursery selected
  if (!selectedNursery) {
    return (
      <div className="max-w-7xl mx-auto">
        <p className="text-center text-gray-500 py-8">
          Veuillez sélectionner une crèche
        </p>
      </div>
    )
  }

  const selectedBatches = formData.product_id ? batchesByProduct[formData.product_id] || [] : []

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <PageBreadcrumb
            items={[
              { label: 'HACCP', href: '/owner/haccp' },
              { label: 'Biberons' }
            ]}
          />
          <h1 className="text-2xl font-semibold text-gray-900 mt-2">
            Traçabilité des Biberons
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleExportPDF}
            disabled={isExporting || feedings.length === 0}
            className="flex items-center gap-2"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            {isExporting ? 'Export...' : 'Export PDF'}
          </Button>
          <Button onClick={openCreateModal} className="flex items-center gap-2">
            <PlusIcon className="w-4 h-4" />
            Ajouter un biberon
          </Button>
        </div>
      </div>

      {/* Date picker and stats */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Date :</span>
          <DatePicker
            value={selectedDate}
            onChange={(date) => date && setSelectedDate(date)}
          />
        </div>
        <div className="flex gap-4">
          <Badge variant="secondary" className="text-sm px-3 py-1">
            <BeakerIcon className="w-4 h-4 mr-1" />
            {stats.totalFeedings} biberon{stats.totalFeedings > 1 ? 's' : ''}
          </Badge>
          <Badge variant="outline" className="text-sm px-3 py-1">
            Total: {stats.totalQuantity} mL
          </Badge>
        </div>
      </div>

      {/* Feedings list */}
      {feedings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BeakerIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Aucun biberon enregistré pour cette date</p>
            <Button onClick={openCreateModal} variant="outline" className="mt-4">
              <PlusIcon className="w-4 h-4 mr-2" />
              Ajouter le premier biberon
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Heure
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Enfant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lait
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantité
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Donné par
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {feedings.map((feeding) => (
                <tr key={feeding.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <ClockIcon className="w-4 h-4 mr-2 text-gray-400" />
                      {new Date(feeding.fed_at).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {feeding.child?.photo_url ? (
                        <img
                          src={feeding.child.photo_url}
                          alt=""
                          className="w-8 h-8 rounded-full mr-3 object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center mr-3">
                          <span className="text-pink-600 text-xs font-medium">
                            {feeding.child?.first_name?.[0]}{feeding.child?.last_name?.[0]}
                          </span>
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {feeding.child?.first_name} {feeding.child?.last_name}
                        </div>
                        {feeding.child?.section && (
                          <div className="text-xs text-gray-500">
                            {feeding.child.section === 'Babies' ? 'Bébés' :
                             feeding.child.section === 'Toddlers' ? 'Moyens' : 'Grands'}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {feeding.product?.name || <span className="text-gray-400">Non spécifié</span>}
                    </div>
                    {feeding.product?.brand && (
                      <div className="text-xs text-gray-500">{feeding.product.brand}</div>
                    )}
                    {feeding.batch?.batch_code && (
                      <div className="text-xs text-gray-400">Lot: {feeding.batch.batch_code}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant="outline" className="font-medium">
                      {feeding.quantity} {feeding.unit}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {feeding.fed_by ? (
                      `${feeding.fed_by.first_name || ''} ${feeding.fed_by.last_name || ''}`.trim()
                    ) : (
                      <span className="text-gray-400">Non spécifié</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => openEditModal(feeding)}
                      className="text-primary-600 hover:text-primary-900 mr-3"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openDeleteDialog(feeding)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      <FormDialog
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
        title={editingFeeding ? 'Modifier le biberon' : 'Ajouter un biberon'}
        submitLabel={editingFeeding ? 'Enregistrer' : 'Ajouter'}
        isSubmitting={isSubmitting}
        maxWidth="lg"
      >
        <div className="space-y-4">
          {/* Child */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Enfant *
            </label>
            <select
              value={formData.child_id}
              onChange={(e) => setFormData({ ...formData, child_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            >
              <option value="">Sélectionner un enfant</option>
              {children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.first_name} {child.last_name}
                  {child.section && ` (${child.section === 'Babies' ? 'Bébés' : child.section === 'Toddlers' ? 'Moyens' : 'Grands'})`}
                </option>
              ))}
            </select>
          </div>

          {/* Milk product */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lait
            </label>
            <select
              value={formData.product_id}
              onChange={(e) => handleProductChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Non spécifié</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                  {product.brand && ` - ${product.brand}`}
                </option>
              ))}
            </select>
            {products.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                Aucun produit dans la catégorie &quot;{MILK_CATEGORY}&quot;. Ajoutez des laits depuis la page Produits.
              </p>
            )}
          </div>

          {/* Batch */}
          {formData.product_id && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lot
              </label>
              <select
                value={formData.batch_id}
                onChange={(e) => setFormData({ ...formData, batch_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Non spécifié</option>
                {selectedBatches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.batch_number || 'Sans numéro'}
                    {batch.expiry_date && ` - DLC: ${new Date(batch.expiry_date).toLocaleDateString('fr-FR')}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quantity and unit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantité *
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                min="0"
                step="10"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unité
              </label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="mL">mL</option>
                <option value="L">L</option>
              </select>
            </div>
          </div>

          {/* Date and time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date et heure *
            </label>
            <input
              type="datetime-local"
              value={formData.fed_at}
              onChange={(e) => setFormData({ ...formData, fed_at: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          {/* Fed by */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Donné par
            </label>
            <select
              value={formData.fed_by_id}
              onChange={(e) => setFormData({ ...formData, fed_by_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Non spécifié</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.first_name} {user.last_name}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows={2}
              placeholder="Observations, remarques..."
            />
          </div>
        </div>
      </FormDialog>

      {/* Delete confirmation */}
      <DeleteConfirmationDialog
        isOpen={!!feedingToDelete}
        onClose={() => setFeedingToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Supprimer ce biberon ?"
        description={
          feedingToDelete
            ? `Le biberon de ${feedingToDelete.child?.first_name || 'cet enfant'} à ${new Date(feedingToDelete.fed_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} sera définitivement supprimé.`
            : ''
        }
        isDeleting={isDeleting}
      />
    </div>
  )
}
