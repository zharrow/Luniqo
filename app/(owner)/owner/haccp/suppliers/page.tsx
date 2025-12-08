'use client'

import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { haccpService, type Supplier, type CreateSupplierInput } from '@/lib/services/haccp.service'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  TruckIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon
} from '@heroicons/react/24/outline'
import { DeleteConfirmationDialog } from '@/components/shared/DeleteConfirmationDialog'
import { FormDialog } from '@/components/shared/FormDialog'

export default function SuppliersPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
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

  useEffect(() => {
    if (session?.enterprise) {
      loadSuppliers()
    }
  }, [session])

  async function loadSuppliers() {
    if (!session?.enterprise?.id) return

    try {
      setLoading(true)
      const data = await haccpService.getSuppliers(session.enterprise.id)
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
    if (!session?.enterprise?.id) return

    try {
      setIsSubmitting(true)
      if (editingSupplier) {
        await haccpService.updateSupplier(editingSupplier.id, session.enterprise.id, formData)
      } else {
        await haccpService.createSupplier(session.enterprise.id, formData)
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
    if (!session?.enterprise?.id || !supplierToDelete) return

    try {
      setIsDeleting(true)
      await haccpService.deleteSupplier(supplierToDelete.id, session.enterprise.id)
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
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Quicksand, sans-serif' }}>
              Fournisseurs
            </h1>
            <p className="text-muted-foreground">
              Gestion des fournisseurs de produits alimentaires
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="btn btn-primary flex items-center gap-2"
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
              Commencez par ajouter votre premier fournisseur
            </p>
            <button onClick={openCreateModal} className="btn btn-primary">
              Créer un fournisseur
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {suppliers.map((supplier) => (
              <div
                key={supplier.id}
                className={`card p-6 ${!supplier.is_active && 'opacity-50'}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-lg bg-success-50 flex items-center justify-center flex-shrink-0">
                      <TruckIcon className="w-6 h-6 text-success-600" />
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
                      title="Désactiver"
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
              placeholder="Adresse complète"
              rows={2}
            />
          </div>
        </FormDialog>

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmationDialog
          isOpen={!!supplierToDelete}
          onClose={() => setSupplierToDelete(null)}
          onConfirm={handleConfirmDelete}
          title="Confirmer la désactivation"
          description="Êtes-vous sûr de vouloir désactiver le fournisseur"
          itemName={supplierToDelete ? supplierToDelete.name : ''}
          isDeleting={isDeleting}
        />
      </div>
    </div>
  )
}
