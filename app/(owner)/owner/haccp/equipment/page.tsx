'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { haccpService } from '@/lib/services/haccp.service'
import { DeleteConfirmationDialog } from '@/components/shared/DeleteConfirmationDialog'
import { FormDialog } from '@/components/shared/FormDialog'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'
import { PlusIcon } from '@heroicons/react/24/outline'

interface HaccpEquipment {
  id: string
  name: string
  equipment_type: string
  location: string | null
  maintenance_frequency: string
  last_maintenance_date: string | null
  next_maintenance_date: string | null
  notes: string | null
  is_active: boolean
  created_at: string
}

export default function HaccpEquipmentPage() {
  const [equipment, setEquipment] = useState<HaccpEquipment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingEquipment, setEditingEquipment] = useState<HaccpEquipment | null>(null)
  const [equipmentToDelete, setEquipmentToDelete] = useState<HaccpEquipment | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    equipment_type: '',
    location: '',
    maintenance_frequency: 'Monthly',
    last_maintenance_date: '',
    notes: ''
  })

  const { session } = useAuth()
  const { selectedNursery } = useNursery()
  const router = useRouter()

  useEffect(() => {
    if (!session || !['Owner', 'Developer'].includes(session.role)) {
      router.push('/login')
      return
    }

    if (selectedNursery?.id) {
      loadEquipment()
    }
  }, [session, selectedNursery?.id])

  async function loadEquipment() {
    try {
      if (!selectedNursery?.id) return

      const data = await haccpService.getEquipment(selectedNursery.id)
      setEquipment(data as unknown as HaccpEquipment[])
    } catch (err: any) {
      console.error('Error loading equipment:', err)
      setError('Erreur lors du chargement')
    } finally {
      setIsLoading(false)
    }
  }

  function handleAdd() {
    setEditingEquipment(null)
    setFormData({
      name: '',
      equipment_type: '',
      location: '',
      maintenance_frequency: 'Monthly',
      last_maintenance_date: '',
      notes: ''
    })
    setShowModal(true)
  }

  function handleEdit(equip: HaccpEquipment) {
    setEditingEquipment(equip)
    setFormData({
      name: equip.name,
      equipment_type: equip.equipment_type,
      location: equip.location || '',
      maintenance_frequency: equip.maintenance_frequency,
      last_maintenance_date: equip.last_maintenance_date || '',
      notes: equip.notes || ''
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    try {
      setIsSubmitting(true)
      if (!selectedNursery?.id) return

      if (editingEquipment) {
        await haccpService.updateEquipment(editingEquipment.id, selectedNursery.id, formData)
      } else {
        await haccpService.createEquipment(selectedNursery.id, formData)
      }

      await loadEquipment()
      setShowModal(false)
    } catch (err: any) {
      console.error('Error saving equipment:', err)
      setError('Erreur lors de l\'enregistrement')
    } finally {
      setIsSubmitting(false)
    }
  }

  function openDeleteDialog(equip: HaccpEquipment) {
    setEquipmentToDelete(equip)
  }

  async function handleConfirmDelete() {
    if (!selectedNursery?.id || !equipmentToDelete) return

    try {
      setIsDeleting(true)
      // Soft delete - set is_active to false
      await haccpService.updateEquipment(equipmentToDelete.id, selectedNursery.id, { is_active: false })
      await loadEquipment()
    } catch (err: any) {
      console.error('Error deleting equipment:', err)
      setError('Erreur lors de la suppression')
    } finally {
      setIsDeleting(false)
      setEquipmentToDelete(null)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-200 border-t-primary-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  const activeEquipment = equipment.filter(e => e.is_active)
  const needsMaintenance = activeEquipment.filter(e => {
    if (!e.next_maintenance_date) return false
    const nextDate = new Date(e.next_maintenance_date)
    const today = new Date()
    const daysDiff = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return daysDiff <= 7
  })

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <PageBreadcrumb
        items={[
          { label: 'Dashboard', href: '/owner/dashboard' },
          { label: 'HACCP', href: '/owner/haccp' },
          { label: 'Équipements' }
        ]}
      />

      {/* Header - Style organique violet lavande pastel (settings) */}
      <div
        className="relative rounded-3xl p-6 mb-8 bg-white overflow-hidden hover:-translate-y-1 transition-all duration-300"
        style={{
          border: '1px solid #b39ddb33',
          background: 'linear-gradient(to bottom right, #faf8fc, white)',
          boxShadow: '0 0 0 0 rgba(179,157,219,0.25)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 16px 48px -12px rgba(179,157,219,0.25)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 0 0 0 rgba(179,157,219,0.25)'
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="inline-flex items-center justify-center w-14 h-14 rounded-2xl"
              style={{ background: 'linear-gradient(to bottom right, #b39ddb1A, #b39ddb0D)' }}
            >
              <span className="text-3xl">🔧</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-1 bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
                Équipements
              </h1>
              <p className="text-muted-foreground">Gestion de la maintenance des équipements</p>
            </div>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
          >
            <PlusIcon className="w-5 h-5" />
            Ajouter un équipement
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="card p-4 mb-6 bg-danger-50 border border-danger-200">
          <p className="text-danger-700">{error}</p>
        </div>
      )}

      {/* Stats - Couleurs variées */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="group p-6 rounded-3xl bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200/50 hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300 hover:scale-105">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center text-2xl shadow-md shadow-purple-500/30 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
              🔧
            </div>
            <div>
              <p className="text-sm text-purple-700/70">Total équipements</p>
              <p className="text-2xl font-bold text-purple-900">{activeEquipment.length}</p>
            </div>
          </div>
        </div>

        <div className="group p-6 rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/50 hover:shadow-lg hover:shadow-amber-500/20 transition-all duration-300 hover:scale-105">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-2xl shadow-md shadow-amber-500/30 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
              ⚠️
            </div>
            <div>
              <p className="text-sm text-amber-700/70">Maintenance à venir (7j)</p>
              <p className="text-2xl font-bold text-amber-900">{needsMaintenance.length}</p>
            </div>
          </div>
        </div>

        <div className="group p-6 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/50 hover:shadow-lg hover:shadow-emerald-500/20 transition-all duration-300 hover:scale-105">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-2xl shadow-md shadow-emerald-500/30 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
              ✅
            </div>
            <div>
              <p className="text-sm text-emerald-700/70">À jour</p>
              <p className="text-2xl font-bold text-emerald-900">
                {activeEquipment.length - needsMaintenance.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Equipment List */}
      {activeEquipment.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeEquipment.map((equip) => {
            const nextDate = equip.next_maintenance_date ? new Date(equip.next_maintenance_date) : null
            const today = new Date()
            const isOverdue = nextDate && nextDate < today
            const isSoon = nextDate && !isOverdue && Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) <= 7

            return (
              <div
                key={equip.id}
                className={`group relative p-6 rounded-3xl ${
                  isOverdue ? 'bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200/50 hover:shadow-lg hover:shadow-rose-500/20' :
                  isSoon ? 'bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/50 hover:shadow-lg hover:shadow-amber-500/20' :
                  'bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200/50 hover:shadow-lg hover:shadow-purple-500/20'
                } transition-all duration-300 hover:scale-[1.02]`}
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold">{equip.name}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(equip)}
                      className="text-primary-500 hover:text-primary-700"
                      title="Modifier"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => openDeleteDialog(equip)}
                      className="text-danger-500 hover:text-danger-700"
                      title="Supprimer"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <span className="font-semibold">{equip.equipment_type}</span>
                  </div>
                  {equip.location && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Emplacement</span>
                      <span className="font-semibold">{equip.location}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fréquence</span>
                    <span className="font-semibold">{equip.maintenance_frequency}</span>
                  </div>
                  {equip.last_maintenance_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dernière maintenance</span>
                      <span className="font-semibold">
                        {new Date(equip.last_maintenance_date).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  )}
                  {equip.next_maintenance_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Prochaine maintenance</span>
                      <span className={`font-semibold ${
                        isOverdue ? 'text-danger-600' :
                        isSoon ? 'text-warning-600' :
                        'text-success-600'
                      }`}>
                        {new Date(equip.next_maintenance_date).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  )}
                </div>

                {equip.notes && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm">{equip.notes}</p>
                  </div>
                )}

                {isOverdue && (
                  <div className="mt-4 p-2 bg-danger-100 border border-danger-200 rounded-lg">
                    <p className="text-sm font-semibold text-danger-700">⚠️ Maintenance en retard</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <svg className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          <p className="text-muted-foreground mb-4">Aucun équipement enregistré</p>
          <button onClick={handleAdd} className="btn btn-primary">
            + Ajouter le premier équipement
          </button>
        </div>
      )}

      {/* Form Dialog */}
      <FormDialog
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
        title={editingEquipment ? 'Modifier l\'équipement' : 'Nouvel équipement'}
        submitLabel={editingEquipment ? 'Mettre à jour' : 'Créer'}
        isSubmitting={isSubmitting}
        maxWidth="lg"
      >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Nom <span className="text-danger-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Type <span className="text-danger-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.equipment_type}
                    onChange={(e) => setFormData({ ...formData, equipment_type: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Réfrigérateur, Four, etc."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Emplacement
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Cuisine, Salle de repas, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Fréquence de maintenance
                  </label>
                  <select
                    value={formData.maintenance_frequency}
                    onChange={(e) => setFormData({ ...formData, maintenance_frequency: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="Daily">Quotidienne</option>
                    <option value="Weekly">Hebdomadaire</option>
                    <option value="Monthly">Mensuelle</option>
                    <option value="Yearly">Annuelle</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Date dernière maintenance
                  </label>
                  <input
                    type="date"
                    value={formData.last_maintenance_date}
                    onChange={(e) => setFormData({ ...formData, last_maintenance_date: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    rows={3}
                    placeholder="Remarques, instructions..."
                  />
                </div>
              </div>
      </FormDialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={!!equipmentToDelete}
        onClose={() => setEquipmentToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Confirmer la désactivation"
        description="Êtes-vous sûr de vouloir désactiver l'équipement"
        itemName={equipmentToDelete ? equipmentToDelete.name : ''}
        isDeleting={isDeleting}
      />
    </div>
  )
}
