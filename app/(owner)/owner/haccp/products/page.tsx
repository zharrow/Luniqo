'use client'

import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { haccpService, type Product, type Supplier, type CreateProductInput } from '@/lib/services/haccp.service'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ShoppingBagIcon,
  ExclamationTriangleIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'
import { DeleteConfirmationDialog } from '@/components/shared/DeleteConfirmationDialog'
import { FormDialog } from '@/components/shared/FormDialog'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'

export default function ProductsPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [filterCategory, setFilterCategory] = useState<string>('ALL')
  const [loading, setLoading] = useState(true)
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
    storage_conditions: ''
  })

  useEffect(() => {
    if (session?.enterprise) {
      loadData()
    }
  }, [session])

  useEffect(() => {
    if (filterCategory === 'ALL') {
      setFilteredProducts(products)
    } else {
      setFilteredProducts(products.filter(p => p.category === filterCategory))
    }
  }, [products, filterCategory])

  async function loadData() {
    if (!session?.enterprise?.id) return

    try {
      setLoading(true)
      const [productsData, suppliersData] = await Promise.all([
        haccpService.getProducts(session.enterprise.id),
        haccpService.getActiveSuppliers(session.enterprise.id)
      ])
      setProducts(productsData)
      setSuppliers(suppliersData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    setEditingProduct(null)
    setFormData({
      supplier_id: suppliers[0]?.id || '',
      name: '',
      category: '',
      allergens: '',
      shelf_life_days: undefined,
      storage_conditions: ''
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
      storage_conditions: product.storage_conditions || ''
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!session?.enterprise?.id) return

    try {
      setIsSubmitting(true)
      if (editingProduct) {
        await haccpService.updateProduct(editingProduct.id, session.enterprise.id, formData)
      } else {
        await haccpService.createProduct(session.enterprise.id, formData)
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
    if (!session?.enterprise?.id || !productToDelete) return

    try {
      setIsDeleting(true)
      await haccpService.deleteProduct(productToDelete.id, session.enterprise.id)
      loadData()
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Erreur lors de la suppression')
    } finally {
      setIsDeleting(false)
      setProductToDelete(null)
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

        {/* Header with Gradient - Module Tasks (Lime) */}
        <div className="relative mb-8 p-8 rounded-3xl bg-gradient-to-br from-lime-50 via-green-50 to-emerald-50 border border-lime-200/50 overflow-hidden">
          <div className="absolute inset-0 bg-[url('/patterns/dots.svg')] opacity-5"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-lime-400 to-green-500 flex items-center justify-center shadow-lg shadow-lime-500/30">
                <ShoppingBagIcon className="w-8 h-8 text-white" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-1 bg-gradient-to-r from-lime-600 to-green-600 bg-clip-text text-transparent" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                  Produits
                </h1>
                <p className="text-lime-700/70">
                  Gestion des produits alimentaires et allergènes
                </p>
              </div>
            </div>
            <button
              onClick={openCreateModal}
              disabled={suppliers.length === 0}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-lime-500 to-green-500 text-white font-medium shadow-lg shadow-lime-500/30 hover:shadow-xl hover:shadow-lime-500/40 hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              Nouveau produit
            </button>
          </div>
        </div>

        {suppliers.length === 0 ? (
          <div className="card p-12 text-center">
            <ShoppingBagIcon className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              Aucun fournisseur
            </h3>
            <p className="text-muted-foreground mb-4">
              Vous devez d'abord créer des fournisseurs avant d'ajouter des produits
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
                    className={`group relative p-6 rounded-3xl bg-gradient-to-br from-lime-50/80 to-green-50/80 border border-lime-200/50 hover:shadow-lg hover:shadow-lime-500/20 transition-all duration-300 hover:scale-[1.02] ${!product.is_active && 'opacity-50'}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-lime-400 to-green-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-lime-500/30 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                          <ShoppingBagIcon className="w-6 h-6 text-white" strokeWidth={2} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold truncate">
                            {product.name}
                          </h3>
                          {product.category && (
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
                          title="Désactiver"
                        >
                          <TrashIcon className="w-4 h-4 text-danger-600" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
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
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Form Dialog */}
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
                    <label className="block text-sm font-medium mb-1">
                      Nom du produit *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary-500 bg-background"
                      placeholder="ex: Lait entier Bio"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Fournisseur *
                    </label>
                    <select
                      value={formData.supplier_id}
                      onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary-500 bg-background"
                      required
                    >
                      <option value="">Sélectionner un fournisseur</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Catégorie
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary-500 bg-background"
                      placeholder="ex: Produits laitiers, Légumes, Viandes"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Allergènes
                    </label>
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
                    <label className="block text-sm font-medium mb-1">
                      Durée de conservation (jours)
                    </label>
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
                    <label className="block text-sm font-medium mb-1">
                      Conditions de stockage
                    </label>
                    <textarea
                      value={formData.storage_conditions}
                      onChange={(e) => setFormData({ ...formData, storage_conditions: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary-500 bg-background"
                      placeholder="ex: Réfrigéré 4°C, À l'abri de la lumière"
                      rows={2}
                    />
                  </div>
        </FormDialog>

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmationDialog
          isOpen={!!productToDelete}
          onClose={() => setProductToDelete(null)}
          onConfirm={handleConfirmDelete}
          title="Confirmer la désactivation"
          description="Êtes-vous sûr de vouloir désactiver le produit"
          itemName={productToDelete ? productToDelete.name : ''}
          isDeleting={isDeleting}
        />
      </div>
    </div>
  )
}
