'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import { haccpService } from '@/lib/services/haccp.service'

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

  const [formData, setFormData] = useState({
    name: '',
    equipment_type: '',
    location: '',
    maintenance_frequency: 'Monthly',
    last_maintenance_date: '',
    notes: ''
  })

  const { session } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!session || !['Admin', 'Developer'].includes(session.role)) {
      router.push('/login')
      return
    }

    loadEquipment()
  }, [session])

  async function loadEquipment() {
    try {
      if (!session?.enterprise?.id) return

      const data = await haccpService.getEquipment(session.enterprise.id)
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
      if (!session?.enterprise?.id) return

      if (editingEquipment) {
        await haccpService.updateEquipment(editingEquipment.id, session.enterprise.id, formData)
      } else {
        await haccpService.createEquipment(session.enterprise.id, formData)
      }

      await loadEquipment()
      setShowModal(false)
    } catch (err: any) {
      console.error('Error saving equipment:', err)
      setError('Erreur lors de l\'enregistrement')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Êtes-vous sûr de vouloir désactiver cet équipement ?')) return

    try {
      if (!session?.enterprise?.id) return
      // Soft delete - set is_active to false
      await haccpService.updateEquipment(id, session.enterprise.id, { is_active: false })
      await loadEquipment()
    } catch (err: any) {
      console.error('Error deleting equipment:', err)
      setError('Erreur lors de la suppression')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-200 border-t-primary-500 mx-auto mb-4"></div>
          <p className="text-neutral-600">Chargement...</p>
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
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Équipements</h1>
          <p className="text-neutral-600">Gestion de la maintenance des équipements</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleAdd}
            className="btn btn-primary"
          >
            + Ajouter un équipement
          </button>
          <button
            onClick={() => router.push('/dashboard/haccp')}
            className="btn btn-secondary"
          >
            ← Retour
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="card p-4 mb-6 bg-danger-50 border border-danger-200">
          <p className="text-danger-700">{error}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-2xl">
              🔧
            </div>
            <div>
              <p className="text-sm text-neutral-600">Total équipements</p>
              <p className="text-2xl font-bold text-neutral-900">{activeEquipment.length}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-warning-100 flex items-center justify-center text-2xl">
              ⚠️
            </div>
            <div>
              <p className="text-sm text-neutral-600">Maintenance à venir (7j)</p>
              <p className="text-2xl font-bold text-warning-600">{needsMaintenance.length}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-success-100 flex items-center justify-center text-2xl">
              ✅
            </div>
            <div>
              <p className="text-sm text-neutral-600">À jour</p>
              <p className="text-2xl font-bold text-success-600">
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
                className={`card p-6 ${
                  isOverdue ? 'border-l-4 border-danger-500 bg-danger-50' :
                  isSoon ? 'border-l-4 border-warning-500 bg-warning-50' :
                  'border-l-4 border-success-500'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-neutral-900">{equip.name}</h3>
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
                      onClick={() => handleDelete(equip.id)}
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
                    <span className="text-neutral-600">Type</span>
                    <span className="font-semibold">{equip.equipment_type}</span>
                  </div>
                  {equip.location && (
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Emplacement</span>
                      <span className="font-semibold">{equip.location}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Fréquence</span>
                    <span className="font-semibold">{equip.maintenance_frequency}</span>
                  </div>
                  {equip.last_maintenance_date && (
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Dernière maintenance</span>
                      <span className="font-semibold">
                        {new Date(equip.last_maintenance_date).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  )}
                  {equip.next_maintenance_date && (
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Prochaine maintenance</span>
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
                  <div className="mt-4 p-3 bg-neutral-50 rounded-lg">
                    <p className="text-sm text-neutral-700">{equip.notes}</p>
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
          <svg className="w-16 h-16 text-neutral-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          <p className="text-neutral-500 mb-4">Aucun équipement enregistré</p>
          <button onClick={handleAdd} className="btn btn-primary">
            + Ajouter le premier équipement
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-neutral-200">
              <h2 className="text-2xl font-bold text-neutral-900">
                {editingEquipment ? 'Modifier l\'équipement' : 'Nouvel équipement'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Nom <span className="text-danger-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Type <span className="text-danger-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.equipment_type}
                    onChange={(e) => setFormData({ ...formData, equipment_type: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Réfrigérateur, Four, etc."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Emplacement
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Cuisine, Salle de repas, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Fréquence de maintenance
                  </label>
                  <select
                    value={formData.maintenance_frequency}
                    onChange={(e) => setFormData({ ...formData, maintenance_frequency: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="Daily">Quotidienne</option>
                    <option value="Weekly">Hebdomadaire</option>
                    <option value="Monthly">Mensuelle</option>
                    <option value="Yearly">Annuelle</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Date dernière maintenance
                  </label>
                  <input
                    type="date"
                    value={formData.last_maintenance_date}
                    onChange={(e) => setFormData({ ...formData, last_maintenance_date: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows={3}
                    placeholder="Remarques, instructions..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                >
                  {editingEquipment ? 'Mettre à jour' : 'Créer'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary flex-1"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
