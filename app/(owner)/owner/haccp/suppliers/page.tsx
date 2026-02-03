'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { haccpService, type Supplier, type CreateSupplierInput } from '@/lib/services/haccp.service'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  TruckIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  PencilSquareIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { DeleteConfirmationDialog } from '@/components/shared/DeleteConfirmationDialog'
import { FormDialog } from '@/components/shared/FormDialog'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'
import {
  SUGGESTED_SUPPLIERS,
  SUPPLIER_CATEGORIES,
  type SuggestedSupplier,
  type SupplierCategory
} from '@/lib/data/suggested-suppliers'
import { Card, CardContent } from '@/components/ui/card'

export default function SuppliersPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery } = useNursery()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestionSearch, setSuggestionSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<SupplierCategory | 'all'>('all')
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<CreateSupplierInput>({
    name: '',
    contact_name: '',
    phone: '',
    email: '',
    address: ''
  })

  // Filter suggested suppliers based on search and category
  const filteredSuggestions = useMemo(() => {
    let results = SUGGESTED_SUPPLIERS

    // Filter out suppliers that already exist (by name, case-insensitive)
    const existingNames = new Set(suppliers.map(s => s.name.toLowerCase()))
    results = results.filter(s => !existingNames.has(s.name.toLowerCase()))

    if (selectedCategory !== 'all') {
      results = results.filter(s => s.category === selectedCategory)
    }
    if (suggestionSearch.trim()) {
      const search = suggestionSearch.toLowerCase()
      results = results.filter(s =>
        s.name.toLowerCase().includes(search) ||
        s.description.toLowerCase().includes(search)
      )
    }
    return results
  }, [suggestionSearch, selectedCategory, suppliers])

  useEffect(() => {
    if (selectedNursery?.id) {
      loadSuppliers()
    } else if (!authLoading && !selectedNursery) {
      setLoading(false)
    }
  }, [selectedNursery?.id, authLoading])

  async function loadSuppliers() {
    if (!selectedNursery?.id) return

    try {
      setLoading(true)
      const data = await haccpService.getSuppliers(selectedNursery.id)
      setSuppliers(data)
    } catch (error) {
      console.error('Error loading suppliers:', error)
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    setEditingSupplier(null)
    setFormData({
      name: '',
      contact_name: '',
      phone: '',
      email: '',
      address: ''
    })
    setSuggestionSearch('')
    setSelectedCategory('all')
    setShowSuggestions(true)
  }

  function selectSuggestion(suggestion: SuggestedSupplier) {
    setFormData({
      name: suggestion.name,
      contact_name: '',
      phone: suggestion.phone || '',
      email: suggestion.email || '',
      address: ''
    })
    setShowSuggestions(false)
    setShowModal(true)
  }

  function openManualCreate() {
    setFormData({
      name: '',
      contact_name: '',
      phone: '',
      email: '',
      address: ''
    })
    setShowSuggestions(false)
    setShowModal(true)
  }

  function openEditModal(supplier: Supplier) {
    setEditingSupplier(supplier)
    setFormData({
      name: supplier.name,
      contact_name: supplier.contact_name || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || ''
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedNursery?.id) return

    try {
      setIsSubmitting(true)
      if (editingSupplier) {
        await haccpService.updateSupplier(editingSupplier.id, selectedNursery.id, formData)
      } else {
        await haccpService.createSupplier(selectedNursery.id, formData)
      }

      setShowModal(false)
      loadSuppliers()
    } catch (error) {
      console.error('Error saving supplier:', error)
      alert('Erreur lors de la sauvegarde')
    } finally {
      setIsSubmitting(false)
    }
  }

  function openDeleteDialog(supplier: Supplier) {
    setSupplierToDelete(supplier)
  }

  async function handleConfirmDelete() {
    if (!selectedNursery?.id || !supplierToDelete) return

    try {
      setIsDeleting(true)
      await haccpService.deleteSupplier(supplierToDelete.id, selectedNursery.id)
      loadSuppliers()
    } catch (error) {
      console.error('Error deleting supplier:', error)
      alert('Erreur lors de la suppression')
    } finally {
      setIsDeleting(false)
      setSupplierToDelete(null)
    }
  }

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
            { label: 'Fournisseurs' }
          ]}
        />

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-100">
              <TruckIcon className="w-6 h-6 text-cyan-600" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Fournisseurs</h1>
              <p className="text-sm text-muted-foreground">
                Gestion des fournisseurs de produits alimentaires
              </p>
            </div>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-medium transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Nouveau fournisseur
          </button>
        </div>

        {/* Suppliers grid */}
        {suppliers.length === 0 ? (
          <div className="card p-12 text-center">
            <TruckIcon className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              Aucun fournisseur
            </h3>
            <p className="text-muted-foreground mb-4">
              Commencez par ajouter votre premier fournisseur parmi nos suggestions ou créez-en un manuellement
            </p>
            <button onClick={openCreateModal} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
              <PlusIcon className="w-5 h-5" />
              Ajouter un fournisseur
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {suppliers.map((supplier) => (
              <div
                key={supplier.id}
                className={`group relative p-6 rounded-3xl bg-gradient-to-br from-cyan-50/80 to-teal-50/80 border border-cyan-200/50 hover:shadow-lg hover:shadow-cyan-500/20 transition-all duration-300 hover:scale-[1.02] ${!supplier.is_active && 'opacity-50'}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-cyan-500/30 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                      <TruckIcon className="w-6 h-6 text-white" strokeWidth={2} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">
                        {supplier.name}
                      </h3>
                      {!supplier.is_active && (
                        <span className="text-xs text-danger-600">Désactivé</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => openEditModal(supplier)}
                      className="p-2 rounded-lg hover:bg-muted transition-colors"
                      title="Modifier"
                    >
                      <PencilIcon className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => openDeleteDialog(supplier)}
                      className="p-2 rounded-lg hover:bg-danger-50 transition-colors"
                      title="Supprimer"
                    >
                      <TrashIcon className="w-4 h-4 text-danger-600" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {supplier.contact_name && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-medium">Contact:</span>
                      <span className="truncate">{supplier.contact_name}</span>
                    </div>
                  )}

                  {supplier.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <PhoneIcon className="w-4 h-4 text-muted-foreground/60 flex-shrink-0" />
                      <a href={`tel:${supplier.phone}`} className="text-primary-600 hover:underline truncate">
                        {supplier.phone}
                      </a>
                    </div>
                  )}

                  {supplier.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <EnvelopeIcon className="w-4 h-4 text-muted-foreground/60 flex-shrink-0" />
                      <a href={`mailto:${supplier.email}`} className="text-primary-600 hover:underline truncate">
                        {supplier.email}
                      </a>
                    </div>
                  )}

                  {supplier.address && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground pt-2 border-t border-border">
                      <MapPinIcon className="w-4 h-4 text-muted-foreground/60 flex-shrink-0 mt-0.5" />
                      <span className="text-xs">{supplier.address}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Suggestions Picker Modal */}
        {showSuggestions && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
              onClick={() => setShowSuggestions(false)}
            />
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <Card className="w-full max-w-2xl animate-slide-up max-h-[85vh] flex flex-col">
                <CardContent className="p-6 flex flex-col min-h-0">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-100 to-teal-100 flex items-center justify-center">
                        <SparklesIcon className="w-5 h-5 text-cyan-600" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold">Ajouter un fournisseur</h2>
                        <p className="text-sm text-muted-foreground">Choisissez un fournisseur connu ou créez manuellement</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowSuggestions(false)}
                      className="p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <XMarkIcon className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </div>

                  {/* Search */}
                  <div className="relative mb-4">
                    <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={suggestionSearch}
                      onChange={(e) => setSuggestionSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-cyan-500/50 bg-background text-sm"
                      placeholder="Rechercher un fournisseur..."
                      autoFocus
                    />
                  </div>

                  {/* Category filters */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        selectedCategory === 'all'
                          ? 'bg-gray-800 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Tous
                    </button>
                    {(Object.entries(SUPPLIER_CATEGORIES) as [SupplierCategory, typeof SUPPLIER_CATEGORIES[SupplierCategory]][]).map(([key, cat]) => (
                      <button
                        key={key}
                        onClick={() => setSelectedCategory(key)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                        style={{
                          backgroundColor: selectedCategory === key ? cat.color : cat.bgColor,
                          color: selectedCategory === key ? 'white' : cat.color,
                        }}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Suggestions list */}
                  <div className="overflow-y-auto flex-1 min-h-0 -mx-2 px-2 space-y-2">
                    {filteredSuggestions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <MagnifyingGlassIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">Aucun fournisseur trouvé</p>
                        <p className="text-xs mt-1">Essayez une autre recherche ou créez manuellement</p>
                      </div>
                    ) : (
                      filteredSuggestions.map((suggestion) => {
                        const cat = SUPPLIER_CATEGORIES[suggestion.category]
                        return (
                          <button
                            key={suggestion.name}
                            onClick={() => selectSuggestion(suggestion)}
                            className="w-full text-left p-3 rounded-xl border border-transparent hover:border-cyan-200 hover:bg-gradient-to-r hover:from-cyan-50/50 hover:to-teal-50/50 transition-all duration-200 group flex items-center gap-3"
                          >
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold transition-transform group-hover:scale-110"
                              style={{ backgroundColor: cat.bgColor, color: cat.color }}
                            >
                              {suggestion.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm truncate">{suggestion.name}</span>
                                <span
                                  className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: cat.bgColor, color: cat.color }}
                                >
                                  {cat.label}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {suggestion.description}
                              </p>
                            </div>
                            <PlusIcon className="w-4 h-4 text-muted-foreground/40 group-hover:text-cyan-500 flex-shrink-0 transition-colors" />
                          </button>
                        )
                      })
                    )}
                  </div>

                  {/* Manual create button */}
                  <div className="pt-4 mt-4 border-t border-border">
                    <button
                      onClick={openManualCreate}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-300 hover:border-cyan-400 text-muted-foreground hover:text-cyan-600 transition-all duration-200 text-sm font-medium"
                    >
                      <PencilSquareIcon className="w-4 h-4" />
                      Créer un fournisseur manuellement
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Form Dialog */}
        <FormDialog
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
          title={editingSupplier ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
          submitLabel={editingSupplier ? 'Modifier' : 'Créer'}
          isSubmitting={isSubmitting}
          maxWidth="md"
        >
          <div>
            <label className="block text-sm font-medium mb-1">
              Nom du fournisseur *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary-500 bg-background"
              placeholder="ex: Bio Fruits & Légumes"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Nom du contact
            </label>
            <input
              type="text"
              value={formData.contact_name}
              onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary-500 bg-background"
              placeholder="ex: Marie Dupont"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Téléphone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary-500 bg-background"
                placeholder="0123456789"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary-500 bg-background"
                placeholder="contact@supplier.fr"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Adresse
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary-500 bg-background"
              placeholder="Adresse complète du fournisseur ou du magasin local"
              rows={2}
            />
          </div>
        </FormDialog>

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmationDialog
          isOpen={!!supplierToDelete}
          onClose={() => setSupplierToDelete(null)}
          onConfirm={handleConfirmDelete}
          title="Supprimer le fournisseur"
          description="Êtes-vous sûr de vouloir supprimer définitivement le fournisseur"
          itemName={supplierToDelete ? supplierToDelete.name : ''}
          isDeleting={isDeleting}
        />
      </div>
    </div>
  )
}
