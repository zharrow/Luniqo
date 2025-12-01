'use client'

import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { haccpService, type Product, type Supplier, type CreateProductInput } from '@/lib/services/haccp.service'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ShoppingBagIcon,
  ExclamationTriangleIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'

export default function ProductsPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Admin'])
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [filterCategory, setFilterCategory] = useState<string>('ALL')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
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
    }
  }

  async function handleDelete(product: Product) {
    if (!session?.enterprise?.id) return
    if (!confirm(`Êtes-vous sûr de vouloir désactiver "${product.name}" ?`)) return

    try {
      await haccpService.deleteProduct(product.id, session.enterprise.id)
      loadData()
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Erreur lors de la suppression')
    }
  }

  // Get unique categories
  const categories = ['ALL', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))] as string[]

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
            <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Quicksand, sans-serif' }}>
              Produits
            </h1>
            <p className="text-muted-foreground">
              Gestion des produits alimentaires et allergènes
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="btn btn-primary flex items-center gap-2"
            disabled={suppliers.length === 0}
          >
            <PlusIcon className="w-5 h-5" />
            Nouveau produit
          </button>
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
            <a href="/dashboard/haccp/suppliers" className="btn btn-primary">
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
                    className={`card p-6 ${!product.is_active && 'opacity-50'}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-lg bg-accent-50 flex items-center justify-center flex-shrink-0">
                          <ShoppingBagIcon className="w-6 h-6 text-accent-600" />
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
                          onClick={() => handleDelete(product)}
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

        {/* Modal */}
        {showModal && (
          <>
            <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowModal(false)}></div>
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <div className="card w-full max-w-md p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">
                  {editingProduct ? 'Modifier le produit' : 'Nouveau produit'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
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

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="flex-1 px-4 py-2 rounded-lg border border-border hover:bg-muted"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="flex-1 btn btn-primary"
                    >
                      {editingProduct ? 'Modifier' : 'Créer'}
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
