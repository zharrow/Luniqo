'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { haccpService, type Product, type Supplier, type Batch, type CreateProductInput, type CreateBatchInput } from '@/lib/services/haccp.service'
import { lookupBarcode, type OpenFoodFactsProduct } from '@/lib/services/openfoodfacts.service'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ShoppingBagIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  QrCodeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  LockOpenIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArchiveBoxIcon,
} from '@heroicons/react/24/outline'
import { DeleteConfirmationDialog } from '@/components/shared/DeleteConfirmationDialog'
import { FormDialog } from '@/components/shared/FormDialog'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'
import { ProductCombobox } from '@/components/shared/ProductCombobox'
import { BarcodeScanner } from '@/components/shared/BarcodeScanner'
import { DatePicker } from '@/components/ui/date-picker'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { type CatalogProduct, getCategoryEmoji } from '@/lib/data/product-catalog'
import { formatDateLocal, getTodayLocal } from '@/lib/utils/date'

// Helper: days until expiry
function daysUntilExpiry(expiryDate: string): number {
  const today = new Date(getTodayLocal())
  const expiry = new Date(expiryDate)
  const diff = expiry.getTime() - today.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// Helper: batch status display
function getBatchStatusInfo(batch: Batch) {
  if (batch.expiry_date && daysUntilExpiry(batch.expiry_date) < 0 && batch.status !== 'discarded' && batch.status !== 'consumed') {
    return { label: 'Expiré', color: 'bg-red-100 text-red-700', icon: XCircleIcon }
  }
  switch (batch.status) {
    case 'sealed': return { label: 'Scellé', color: 'bg-blue-100 text-blue-700', icon: ArchiveBoxIcon }
    case 'opened': return { label: 'Ouvert', color: 'bg-green-100 text-green-700', icon: LockOpenIcon }
    case 'consumed': return { label: 'Consommé', color: 'bg-gray-100 text-gray-500', icon: CheckCircleIcon }
    case 'expired': return { label: 'Expiré', color: 'bg-red-100 text-red-700', icon: XCircleIcon }
    case 'discarded': return { label: 'Jeté', color: 'bg-gray-100 text-gray-500 line-through', icon: TrashIcon }
    default: return { label: batch.status, color: 'bg-gray-100 text-gray-500', icon: ClockIcon }
  }
}

export default function ProductsPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery } = useNursery()

  // Data state
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [filterCategory, setFilterCategory] = useState<string>('ALL')
  const [loading, setLoading] = useState(true)

  // Product form state
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<CreateProductInput>({
    supplier_id: '',
    name: '',
    category: '',
    allergens: '',
    shelf_life_days: undefined,
    storage_conditions: '',
    barcode: '',
    brand: '',
    image_url: '',
  })

  // Scanner state
  const [showScanner, setShowScanner] = useState(false)
  const [scanStep, setScanStep] = useState<'scanning' | 'lookup' | 'product_form' | 'batch_form' | 'success'>('scanning')
  const [scannedBarcode, setScannedBarcode] = useState('')
  const [offProduct, setOffProduct] = useState<OpenFoodFactsProduct | null>(null)
  const [existingProduct, setExistingProduct] = useState<Product | null>(null)
  const [showScanFlow, setShowScanFlow] = useState(false)

  // Batch form state
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [batchFormData, setBatchFormData] = useState<CreateBatchInput>({
    product_id: '',
    batch_number: '',
    reception_date: getTodayLocal(),
    expiry_date: '',
    quantity: undefined,
    received_by_id: '',
  })
  const [batchSubmitting, setBatchSubmitting] = useState(false)

  // Batch display state
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null)
  const [productBatches, setProductBatches] = useState<Record<string, Batch[]>>({})
  const [loadingBatches, setLoadingBatches] = useState<string | null>(null)

  // DLC alerts
  const [expiringBatches, setExpiringBatches] = useState<Batch[]>([])

  // Load data
  const loadData = useCallback(async () => {
    if (!selectedNursery?.id) return
    try {
      setLoading(true)
      const [productsData, suppliersData, expiringData] = await Promise.all([
        haccpService.getProducts(selectedNursery.id),
        haccpService.getActiveSuppliers(selectedNursery.id),
        haccpService.getExpiringBatches(selectedNursery.id, 3),
      ])
      setProducts(productsData)
      setSuppliers(suppliersData)
      setExpiringBatches(expiringData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedNursery?.id])

  useEffect(() => {
    if (selectedNursery?.id) {
      loadData()
    } else if (!authLoading && !selectedNursery) {
      setLoading(false)
    }
  }, [selectedNursery?.id, authLoading, loadData])

  useEffect(() => {
    if (filterCategory === 'ALL') {
      setFilteredProducts(products)
    } else {
      setFilteredProducts(products.filter(p => p.category === filterCategory))
    }
  }, [products, filterCategory])

  // ========================================
  // Product CRUD
  // ========================================

  function openCreateModal() {
    setEditingProduct(null)
    setFormData({
      supplier_id: suppliers[0]?.id || '',
      name: '',
      category: '',
      allergens: '',
      shelf_life_days: undefined,
      storage_conditions: '',
      barcode: '',
      brand: '',
      image_url: '',
    })
    setShowModal(true)
  }

  function openEditModal(product: Product) {
    setEditingProduct(product)
    setFormData({
      supplier_id: product.supplier_id,
      name: product.name,
      category: product.category || '',
      allergens: product.allergens || '',
      shelf_life_days: product.shelf_life_days || undefined,
      storage_conditions: product.storage_conditions || '',
      barcode: product.barcode || '',
      brand: product.brand || '',
      image_url: product.image_url || '',
    })
    setShowModal(true)
  }

  function handleSelectCatalogProduct(catalogProduct: CatalogProduct | null) {
    if (catalogProduct) {
      setFormData(prev => ({
        ...prev,
        name: catalogProduct.name,
        category: catalogProduct.category,
        allergens: catalogProduct.allergens || '',
        shelf_life_days: catalogProduct.shelf_life_days || undefined,
        storage_conditions: catalogProduct.storage_conditions || '',
      }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedNursery?.id) return
    try {
      setIsSubmitting(true)
      if (editingProduct) {
        await haccpService.updateProduct(editingProduct.id, selectedNursery.id, formData)
      } else {
        await haccpService.createProduct(selectedNursery.id, formData)
      }
      setShowModal(false)
      loadData()
    } catch (error) {
      console.error('Error saving product:', error)
      alert('Erreur lors de la sauvegarde')
    } finally {
      setIsSubmitting(false)
    }
  }

  function openDeleteDialog(product: Product) {
    setProductToDelete(product)
  }

  async function handleConfirmDelete() {
    if (!selectedNursery?.id || !productToDelete) return
    try {
      setIsDeleting(true)
      await haccpService.deleteProduct(productToDelete.id, selectedNursery.id)
      loadData()
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Erreur lors de la suppression')
    } finally {
      setIsDeleting(false)
      setProductToDelete(null)
    }
  }

  // ========================================
  // Barcode Scan Flow
  // ========================================

  async function handleBarcodeScan(barcode: string) {
    if (!selectedNursery?.id) return
    setScannedBarcode(barcode)
    setShowScanner(false)
    setScanStep('lookup')
    setShowScanFlow(true)

    // Check if product already exists locally
    try {
      const existing = await haccpService.getProductByBarcode(selectedNursery.id, barcode)
      if (existing) {
        setExistingProduct(existing)
        setBatchFormData({
          product_id: existing.id,
          batch_number: '',
          reception_date: getTodayLocal(),
          expiry_date: '',
          quantity: undefined,
          received_by_id: session?.user?.id || '',
        })
        setScanStep('batch_form')
        return
      }
    } catch {
      // Continue with OFF lookup
    }

    // Lookup on Open Food Facts
    setExistingProduct(null)
    const offResult = await lookupBarcode(barcode)
    setOffProduct(offResult)

    setFormData({
      supplier_id: suppliers[0]?.id || '',
      name: offResult?.name || '',
      category: offResult?.category || '',
      allergens: offResult?.allergens || '',
      shelf_life_days: undefined,
      storage_conditions: '',
      barcode: barcode,
      brand: offResult?.brand || '',
      image_url: offResult?.image_url || '',
    })
    setScanStep('product_form')
  }

  async function handleScanProductSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedNursery?.id) return
    try {
      setIsSubmitting(true)
      const newProduct = await haccpService.createProduct(selectedNursery.id, formData)
      setExistingProduct(newProduct)
      setBatchFormData({
        product_id: newProduct.id,
        batch_number: '',
        reception_date: getTodayLocal(),
        expiry_date: '',
        quantity: undefined,
        received_by_id: session?.user?.id || '',
      })
      setScanStep('batch_form')
    } catch (error) {
      console.error('Error creating product:', error)
      alert('Erreur lors de la création du produit')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleBatchSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedNursery?.id) return
    try {
      setBatchSubmitting(true)
      await haccpService.createBatch(selectedNursery.id, batchFormData)
      setScanStep('success')
      loadData()
      setTimeout(() => {
        setShowScanFlow(false)
        setScanStep('scanning')
        setScannedBarcode('')
        setOffProduct(null)
        setExistingProduct(null)
      }, 2000)
    } catch (error) {
      console.error('Error creating batch:', error)
      alert('Erreur lors de l\'enregistrement du lot')
    } finally {
      setBatchSubmitting(false)
    }
  }

  function closeScanFlow() {
    setShowScanFlow(false)
    setScanStep('scanning')
    setScannedBarcode('')
    setOffProduct(null)
    setExistingProduct(null)
  }

  // ========================================
  // Batch Management
  // ========================================

  async function toggleBatches(productId: string) {
    if (expandedProduct === productId) {
      setExpandedProduct(null)
      return
    }
    if (!selectedNursery?.id) return
    setExpandedProduct(productId)
    if (!productBatches[productId]) {
      setLoadingBatches(productId)
      try {
        const batches = await haccpService.getBatchesByProduct(selectedNursery.id, productId)
        setProductBatches(prev => ({ ...prev, [productId]: batches }))
      } catch (error) {
        console.error('Error loading batches:', error)
      } finally {
        setLoadingBatches(null)
      }
    }
  }

  function openAddBatchModal(product: Product) {
    setBatchFormData({
      product_id: product.id,
      batch_number: '',
      reception_date: getTodayLocal(),
      expiry_date: '',
      quantity: undefined,
      received_by_id: session?.user?.id || '',
    })
    setShowBatchModal(true)
  }

  async function handleAddBatch(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedNursery?.id) return
    try {
      setBatchSubmitting(true)
      await haccpService.createBatch(selectedNursery.id, batchFormData)
      setShowBatchModal(false)
      const batches = await haccpService.getBatchesByProduct(selectedNursery.id, batchFormData.product_id)
      setProductBatches(prev => ({ ...prev, [batchFormData.product_id]: batches }))
      loadData()
    } catch (error) {
      console.error('Error creating batch:', error)
      alert('Erreur lors de l\'ajout du lot')
    } finally {
      setBatchSubmitting(false)
    }
  }

  async function handleBatchAction(batchId: string, productId: string, action: 'open' | 'consume' | 'discard') {
    if (!selectedNursery?.id) return
    try {
      if (action === 'open') {
        await haccpService.markBatchOpened(batchId, selectedNursery.id)
      } else {
        await haccpService.updateBatchStatus(batchId, selectedNursery.id, action === 'consume' ? 'consumed' : 'discarded')
      }
      const batches = await haccpService.getBatchesByProduct(selectedNursery.id, productId)
      setProductBatches(prev => ({ ...prev, [productId]: batches }))
      loadData()
    } catch (error) {
      console.error('Error updating batch:', error)
    }
  }

  // Get unique categories
  const categories = ['ALL', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))] as string[]

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
            { label: 'Produits' }
          ]}
        />

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-lime-100">
              <ShoppingBagIcon className="w-6 h-6 text-lime-600" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Produits</h1>
              <p className="text-sm text-muted-foreground">
                Gestion des produits alimentaires et allergènes
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowScanner(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-lime-300 hover:bg-lime-50 text-lime-700 font-medium transition-colors"
            >
              <QrCodeIcon className="w-5 h-5" />
              Scanner
            </button>
            <button
              onClick={openCreateModal}
              disabled={suppliers.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-lime-600 hover:bg-lime-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlusIcon className="w-5 h-5" />
              Nouveau produit
            </button>
          </div>
        </div>

        {/* DLC Alerts */}
        {expiringBatches.length > 0 && (
          <div className="mb-8 rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5">
            <div className="flex items-center gap-2 mb-4">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
              <h2 className="font-bold text-amber-800">
                Alertes DLC ({expiringBatches.length})
              </h2>
            </div>
            <div className="space-y-2">
              {expiringBatches.map((batch) => {
                const days = batch.expiry_date ? daysUntilExpiry(batch.expiry_date) : null
                const isExpired = days !== null && days < 0
                const isToday = days === 0

                return (
                  <div
                    key={batch.id}
                    className={`flex items-center justify-between p-3 rounded-xl ${isExpired ? 'bg-red-100 border border-red-200' : 'bg-amber-100 border border-amber-200'}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isExpired ? 'bg-red-500' : 'bg-amber-500'} animate-pulse`} />
                      <div className="min-w-0">
                        <span className="font-medium text-sm truncate block">
                          {batch.product?.name || 'Produit inconnu'}
                        </span>
                        <span className={`text-xs ${isExpired ? 'text-red-600 font-semibold' : 'text-amber-700'}`}>
                          {isExpired ? `Expiré depuis ${Math.abs(days!)} jour${Math.abs(days!) > 1 ? 's' : ''}` :
                           isToday ? 'Expire aujourd\'hui' :
                           `Expire dans ${days} jour${days! > 1 ? 's' : ''}`}
                          {batch.batch_number && ` · Lot ${batch.batch_number}`}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {batch.status === 'sealed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={() => handleBatchAction(batch.id, batch.product_id, 'open')}
                        >
                          Ouvrir
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleBatchAction(batch.id, batch.product_id, 'discard')}
                      >
                        Jeter
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {suppliers.length === 0 ? (
          <div className="card p-12 text-center">
            <ShoppingBagIcon className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucun fournisseur</h3>
            <p className="text-muted-foreground mb-4">
              Vous devez d&apos;abord créer des fournisseurs avant d&apos;ajouter des produits
            </p>
            <a href="/owner/haccp/suppliers" className="btn btn-primary">
              Gérer les fournisseurs
            </a>
          </div>
        ) : (
          <>
            {/* Filters */}
            {categories.length > 1 && (
              <div className="flex items-center gap-3 mb-6">
                <FunnelIcon className="w-5 h-5 text-muted-foreground" />
                <div className="flex gap-2 flex-wrap">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setFilterCategory(category)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        filterCategory === category
                          ? 'bg-primary-500 text-white'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {category === 'ALL' ? 'Tous' : category}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Products grid */}
            {filteredProducts.length === 0 ? (
              <div className="card p-12 text-center">
                <ShoppingBagIcon className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {filterCategory === 'ALL' ? 'Aucun produit' : `Aucun produit dans la catégorie "${filterCategory}"`}
                </h3>
                <p className="text-muted-foreground mb-4">
                  Commencez par ajouter votre premier produit
                </p>
                <button onClick={openCreateModal} className="btn btn-primary">
                  Créer un produit
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className={`group relative rounded-3xl bg-white transition-all duration-300 overflow-hidden ${!product.is_active && 'opacity-50'}`}
                    style={{
                      border: '1px solid #aed58133',
                      boxShadow: '0 0 0 0 rgba(174,213,129,0.25)'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 16px 48px -12px rgba(174,213,129,0.25)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 0 0 0 rgba(174,213,129,0.25)' }}
                  >
                    {/* Gradient fond */}
                    <div
                      className="absolute inset-0 opacity-60"
                      style={{ background: 'linear-gradient(to bottom right, #f9fcf5, white)' }}
                    />

                    <div className="relative z-10 p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Product image or category emoji */}
                          <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 group-hover:rotate-2 transition-all duration-300 text-2xl overflow-hidden"
                            style={{ background: product.image_url ? undefined : 'linear-gradient(to bottom right, #aed5811A, #aed5810D)' }}
                          >
                            {product.image_url ? (
                              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover rounded-2xl" />
                            ) : product.category ? getCategoryEmoji(product.category) : (
                              <ShoppingBagIcon className="w-6 h-6" style={{ color: '#7da453' }} strokeWidth={1.5} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold truncate">{product.name}</h3>
                            {product.brand && (
                              <span className="text-xs text-muted-foreground">{product.brand}</span>
                            )}
                            {!product.brand && product.category && (
                              <span className="text-xs text-muted-foreground">{product.category}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => openEditModal(product)}
                            className="p-2 rounded-lg hover:bg-muted transition-colors"
                            title="Modifier"
                          >
                            <PencilIcon className="w-4 h-4 text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => openDeleteDialog(product)}
                            className="p-2 rounded-lg hover:bg-danger-50 transition-colors"
                            title="Supprimer"
                          >
                            <TrashIcon className="w-4 h-4 text-danger-600" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {/* Barcode badge */}
                        {product.barcode && (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs font-mono">
                              <QrCodeIcon className="w-3 h-3 mr-1" />
                              {product.barcode}
                            </Badge>
                          </div>
                        )}

                        {/* Supplier */}
                        {product.supplier && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Fournisseur</span>
                            <span className="font-medium truncate ml-2">{product.supplier.name}</span>
                          </div>
                        )}

                        {/* Shelf life */}
                        {product.shelf_life_days && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Conservation</span>
                            <span className="font-medium">{product.shelf_life_days} jours</span>
                          </div>
                        )}

                        {/* Storage conditions */}
                        {product.storage_conditions && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Stockage: </span>
                            <span className="text-muted-foreground">{product.storage_conditions}</span>
                          </div>
                        )}

                        {/* Allergens */}
                        {product.allergens && (
                          <div className="p-3 rounded-lg bg-danger-50 border border-danger-200">
                            <div className="flex items-start gap-2">
                              <ExclamationTriangleIcon className="w-5 h-5 text-danger-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs font-medium text-danger-900 mb-1">Allergènes</p>
                                <p className="text-sm text-danger-700">{product.allergens}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {!product.is_active && (
                          <div className="pt-2 border-t border-border">
                            <span className="text-xs text-danger-600 font-medium">Désactivé</span>
                          </div>
                        )}
                      </div>

                      {/* Batches toggle */}
                      <div className="mt-4 pt-3 border-t border-gray-100">
                        <button
                          onClick={() => toggleBatches(product.id)}
                          className="flex items-center justify-between w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <span className="font-medium">Lots en stock</span>
                          {expandedProduct === product.id ?
                            <ChevronUpIcon className="w-4 h-4" /> :
                            <ChevronDownIcon className="w-4 h-4" />
                          }
                        </button>

                        {expandedProduct === product.id && (
                          <div className="mt-3 space-y-2">
                            {loadingBatches === product.id ? (
                              <div className="flex justify-center py-4">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-lime-500" />
                              </div>
                            ) : (productBatches[product.id] || []).length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-3">Aucun lot enregistré</p>
                            ) : (
                              (productBatches[product.id] || []).map((batch) => {
                                const statusInfo = getBatchStatusInfo(batch)
                                const days = batch.expiry_date ? daysUntilExpiry(batch.expiry_date) : null
                                const StatusIcon = statusInfo.icon

                                return (
                                  <div key={batch.id} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <Badge className={`text-xs ${statusInfo.color}`}>
                                          <StatusIcon className="w-3 h-3 mr-1" />
                                          {statusInfo.label}
                                        </Badge>
                                        {batch.batch_number && (
                                          <span className="text-xs text-muted-foreground font-mono">
                                            Lot {batch.batch_number}
                                          </span>
                                        )}
                                      </div>
                                      {batch.quantity && (
                                        <span className="text-xs text-muted-foreground">Qté: {batch.quantity}</span>
                                      )}
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                      <div className="space-y-0.5">
                                        <div>Reçu: {new Date(batch.reception_date).toLocaleDateString('fr-FR')}</div>
                                        {batch.expiry_date && (
                                          <div className={days !== null && days <= 0 ? 'text-red-600 font-semibold' : days !== null && days <= 3 ? 'text-amber-600 font-medium' : ''}>
                                            DLC: {new Date(batch.expiry_date).toLocaleDateString('fr-FR')}
                                            {days !== null && days <= 3 && (
                                              <span> ({days < 0 ? 'expiré' : days === 0 ? 'aujourd\'hui' : `J-${days}`})</span>
                                            )}
                                          </div>
                                        )}
                                        {batch.opened_at && (
                                          <div>Ouvert: {new Date(batch.opened_at).toLocaleDateString('fr-FR')}</div>
                                        )}
                                      </div>
                                      {/* Actions */}
                                      {(batch.status === 'sealed' || batch.status === 'opened') && (
                                        <div className="flex gap-1">
                                          {batch.status === 'sealed' && (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="text-xs h-6 px-2"
                                              onClick={() => handleBatchAction(batch.id, product.id, 'open')}
                                            >
                                              Ouvrir
                                            </Button>
                                          )}
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-xs h-6 px-2"
                                            onClick={() => handleBatchAction(batch.id, product.id, 'consume')}
                                          >
                                            Consommé
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-xs h-6 px-2 text-red-500"
                                            onClick={() => handleBatchAction(batch.id, product.id, 'discard')}
                                          >
                                            Jeter
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )
                              })
                            )}
                            <button
                              onClick={() => openAddBatchModal(product)}
                              className="w-full text-xs text-lime-600 hover:text-lime-700 font-medium py-2 border border-dashed border-lime-300 rounded-xl hover:bg-lime-50 transition-colors"
                            >
                              + Ajouter un lot
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Barcode Scanner */}
        <BarcodeScanner
          isOpen={showScanner}
          onClose={() => setShowScanner(false)}
          onScan={handleBarcodeScan}
        />

        {/* Scan Flow Modal */}
        {showScanFlow && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={closeScanFlow} />
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-5 border-b border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-bold">
                      {scanStep === 'lookup' && 'Recherche du produit...'}
                      {scanStep === 'product_form' && 'Nouveau produit'}
                      {scanStep === 'batch_form' && 'Enregistrer le lot'}
                      {scanStep === 'success' && 'Enregistré !'}
                    </h2>
                    <button onClick={closeScanFlow} className="p-1 rounded-full hover:bg-gray-100">
                      <XCircleIcon className="w-6 h-6 text-muted-foreground" />
                    </button>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    <QrCodeIcon className="w-3 h-3 mr-1" />
                    {scannedBarcode}
                  </Badge>
                  {/* Steps indicator */}
                  <div className="flex items-center gap-2 mt-3">
                    {['product_form', 'batch_form', 'success'].map((step, i) => (
                      <div key={step} className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          (scanStep === step || (step === 'product_form' && scanStep === 'lookup'))
                            ? 'bg-lime-500'
                            : i < ['product_form', 'batch_form', 'success'].indexOf(scanStep)
                              ? 'bg-lime-300'
                              : 'bg-gray-200'
                        }`} />
                        {i < 2 && <div className="w-8 h-px bg-gray-200" />}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-5">
                  {/* Lookup step */}
                  {scanStep === 'lookup' && (
                    <div className="flex flex-col items-center gap-3 py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-500" />
                      <p className="text-sm text-muted-foreground">Recherche sur Open Food Facts...</p>
                    </div>
                  )}

                  {/* Product form step */}
                  {scanStep === 'product_form' && (
                    <form onSubmit={handleScanProductSubmit} className="space-y-4">
                      {formData.image_url && (
                        <div className="flex justify-center">
                          <img
                            src={formData.image_url}
                            alt={formData.name}
                            className="w-24 h-24 rounded-2xl object-cover border border-gray-200"
                          />
                        </div>
                      )}

                      {offProduct ? (
                        <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700">
                          Produit trouvé sur Open Food Facts — les champs ont été pré-remplis.
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
                          Produit non trouvé dans la base Open Food Facts. Remplissez les informations manuellement.
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium mb-1">Nom du produit *</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-lime-500 bg-background"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Marque</label>
                        <input
                          type="text"
                          value={formData.brand || ''}
                          onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-lime-500 bg-background"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Fournisseur *</label>
                        <select
                          value={formData.supplier_id}
                          onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-lime-500 bg-background"
                          required
                        >
                          <option value="">Sélectionner un fournisseur</option>
                          {suppliers.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Catégorie</label>
                        <input
                          type="text"
                          value={formData.category || ''}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-lime-500 bg-background"
                          placeholder="ex: Produits laitiers"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Allergènes</label>
                        <input
                          type="text"
                          value={formData.allergens || ''}
                          onChange={(e) => setFormData({ ...formData, allergens: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-lime-500 bg-background"
                          placeholder="ex: Lactose, Gluten"
                        />
                      </div>

                      <div className="flex gap-3 pt-2">
                        <Button type="button" variant="outline" className="flex-1" onClick={closeScanFlow}>
                          Annuler
                        </Button>
                        <Button
                          type="submit"
                          className="flex-1 bg-lime-500 hover:bg-lime-600 text-white"
                          disabled={isSubmitting || !formData.name || !formData.supplier_id}
                        >
                          {isSubmitting ? 'Création...' : 'Suivant'}
                        </Button>
                      </div>
                    </form>
                  )}

                  {/* Batch form step */}
                  {scanStep === 'batch_form' && (
                    <form onSubmit={handleBatchSubmit} className="space-y-4">
                      {existingProduct && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-lime-50 border border-lime-200">
                          {existingProduct.image_url && (
                            <img src={existingProduct.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                          )}
                          <div>
                            <p className="font-medium text-sm">{existingProduct.name}</p>
                            {existingProduct.brand && (
                              <p className="text-xs text-muted-foreground">{existingProduct.brand}</p>
                            )}
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Date limite de consommation (DLC) *
                        </label>
                        <DatePicker
                          value={batchFormData.expiry_date || undefined}
                          onChange={(date) => setBatchFormData({
                            ...batchFormData,
                            expiry_date: date ? formatDateLocal(date) : ''
                          })}
                          placeholder="Sélectionner la DLC"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Date de réception</label>
                        <DatePicker
                          value={batchFormData.reception_date}
                          onChange={(date) => setBatchFormData({
                            ...batchFormData,
                            reception_date: date ? formatDateLocal(date) : getTodayLocal()
                          })}
                          placeholder="Aujourd'hui"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Numéro de lot</label>
                        <input
                          type="text"
                          value={batchFormData.batch_number || ''}
                          onChange={(e) => setBatchFormData({ ...batchFormData, batch_number: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-lime-500 bg-background"
                          placeholder="Optionnel"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Quantité</label>
                        <input
                          type="number"
                          value={batchFormData.quantity || ''}
                          onChange={(e) => setBatchFormData({ ...batchFormData, quantity: e.target.value ? Number(e.target.value) : undefined })}
                          className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-lime-500 bg-background"
                          placeholder="Optionnel"
                          min="0"
                        />
                      </div>

                      <div className="flex gap-3 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            if (existingProduct?.barcode) {
                              closeScanFlow()
                            } else {
                              setScanStep('product_form')
                            }
                          }}
                        >
                          Retour
                        </Button>
                        <Button
                          type="submit"
                          className="flex-1 bg-lime-500 hover:bg-lime-600 text-white"
                          disabled={batchSubmitting}
                        >
                          {batchSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                        </Button>
                      </div>
                    </form>
                  )}

                  {/* Success step */}
                  {scanStep === 'success' && (
                    <div className="flex flex-col items-center gap-4 py-8">
                      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircleIcon className="w-10 h-10 text-green-600" />
                      </div>
                      <div className="text-center">
                        <h3 className="font-bold text-lg">Produit enregistré !</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Le lot a été ajouté avec succès.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Product Form Dialog (manual create/edit) */}
        <FormDialog
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
          title={editingProduct ? 'Modifier le produit' : 'Nouveau produit'}
          submitLabel={editingProduct ? 'Modifier' : 'Créer'}
          isSubmitting={isSubmitting}
          maxWidth="md"
        >
          <div>
            <label className="block text-sm font-medium mb-1">Nom du produit *</label>
            <ProductCombobox
              value={formData.name}
              onChange={(name) => setFormData({ ...formData, name })}
              onSelectProduct={handleSelectCatalogProduct}
              placeholder="Rechercher ou saisir un produit..."
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Tapez pour rechercher dans le catalogue ou créer un nouveau produit
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Fournisseur *</label>
            <select
              value={formData.supplier_id}
              onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary-500 bg-background"
              required
            >
              <option value="">Sélectionner un fournisseur</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Catégorie</label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary-500 bg-background"
              placeholder="ex: Produits laitiers, Légumes, Viandes"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Code-barres</label>
            <input
              type="text"
              value={formData.barcode || ''}
              onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary-500 bg-background font-mono"
              placeholder="EAN-13 (optionnel)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Marque</label>
            <input
              type="text"
              value={formData.brand || ''}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary-500 bg-background"
              placeholder="ex: Danone, Nestlé"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Allergènes</label>
            <input
              type="text"
              value={formData.allergens}
              onChange={(e) => setFormData({ ...formData, allergens: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary-500 bg-background"
              placeholder="ex: Lactose, Gluten"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Séparez les allergènes par des virgules
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Durée de conservation (jours)</label>
            <input
              type="number"
              value={formData.shelf_life_days || ''}
              onChange={(e) => setFormData({ ...formData, shelf_life_days: e.target.value ? parseInt(e.target.value) : undefined })}
              className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary-500 bg-background"
              placeholder="ex: 7"
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Conditions de stockage</label>
            <textarea
              value={formData.storage_conditions}
              onChange={(e) => setFormData({ ...formData, storage_conditions: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary-500 bg-background"
              placeholder="ex: Réfrigéré 4°C, À l'abri de la lumière"
              rows={2}
            />
          </div>
        </FormDialog>

        {/* Add Batch Dialog (from product card) */}
        <FormDialog
          isOpen={showBatchModal}
          onClose={() => setShowBatchModal(false)}
          onSubmit={handleAddBatch}
          title="Ajouter un lot"
          submitLabel="Enregistrer"
          isSubmitting={batchSubmitting}
          maxWidth="sm"
        >
          <div>
            <label className="block text-sm font-medium mb-1">Date limite de consommation (DLC)</label>
            <DatePicker
              value={batchFormData.expiry_date || undefined}
              onChange={(date) => setBatchFormData({
                ...batchFormData,
                expiry_date: date ? formatDateLocal(date) : ''
              })}
              placeholder="Sélectionner la DLC"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Date de réception</label>
            <DatePicker
              value={batchFormData.reception_date}
              onChange={(date) => setBatchFormData({
                ...batchFormData,
                reception_date: date ? formatDateLocal(date) : getTodayLocal()
              })}
              placeholder="Aujourd'hui"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Numéro de lot</label>
            <input
              type="text"
              value={batchFormData.batch_number || ''}
              onChange={(e) => setBatchFormData({ ...batchFormData, batch_number: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary-500 bg-background"
              placeholder="Optionnel"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Quantité</label>
            <input
              type="number"
              value={batchFormData.quantity || ''}
              onChange={(e) => setBatchFormData({ ...batchFormData, quantity: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary-500 bg-background"
              placeholder="Optionnel"
              min="0"
            />
          </div>
        </FormDialog>

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmationDialog
          isOpen={!!productToDelete}
          onClose={() => setProductToDelete(null)}
          onConfirm={handleConfirmDelete}
          title="Confirmer la suppression"
          description="Êtes-vous sûr de vouloir supprimer le produit"
          itemName={productToDelete ? productToDelete.name : ''}
          isDeleting={isDeleting}
        />
      </div>
    </div>
  )
}
