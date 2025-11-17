'use client'

import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { roomsService, type Room, type CreateRoomInput } from '@/lib/services/rooms.service'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline'

export default function RoomsPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Admin'])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [formData, setFormData] = useState<CreateRoomInput>({
    name: '',
    description: ''
  })

  useEffect(() => {
    if (session?.enterprise) {
      loadRooms()
    }
  }, [session])

  async function loadRooms() {
    if (!session?.enterprise?.id) return

    try {
      setLoading(true)
      const data = await roomsService.getAll(session.enterprise.id)
      setRooms(data)
    } catch (error) {
      console.error('Error loading rooms:', error)
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    setEditingRoom(null)
    setFormData({ name: '', description: '' })
    setShowModal(true)
  }

  function openEditModal(room: Room) {
    setEditingRoom(room)
    setFormData({
      name: room.name,
      description: room.description || ''
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!session?.enterprise?.id) return

    try {
      if (editingRoom) {
        await roomsService.update(editingRoom.id, session.enterprise.id, formData)
      } else {
        await roomsService.create(session.enterprise.id, formData)
      }

      setShowModal(false)
      loadRooms()
    } catch (error) {
      console.error('Error saving room:', error)
      alert('Erreur lors de la sauvegarde')
    }
  }

  async function handleDelete(room: Room) {
    if (!session?.enterprise?.id) return
    if (!confirm(`Êtes-vous sûr de vouloir désactiver "${room.name}" ?`)) return

    try {
      await roomsService.softDelete(room.id, session.enterprise.id)
      loadRooms()
    } catch (error) {
      console.error('Error deleting room:', error)
      alert('Erreur lors de la suppression')
    }
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
              Pièces
            </h1>
            <p className="text-neutral-600">
              Gérez les pièces de votre crèche
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="btn btn-primary flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Nouvelle pièce
          </button>
        </div>

        {/* Rooms grid */}
        {rooms.length === 0 ? (
          <div className="card p-12 text-center">
            <BuildingOfficeIcon className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 mb-2">
              Aucune pièce
            </h3>
            <p className="text-neutral-600 mb-4">
              Commencez par créer votre première pièce
            </p>
            <button onClick={openCreateModal} className="btn btn-primary">
              Créer une pièce
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <div
                key={room.id}
                className={`card p-6 ${!room.is_active && 'opacity-50'}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-primary-50 flex items-center justify-center">
                      <BuildingOfficeIcon className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-900">
                        {room.name}
                      </h3>
                      {!room.is_active && (
                        <span className="text-xs text-danger-600">Désactivée</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(room)}
                      className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
                      title="Modifier"
                    >
                      <PencilIcon className="w-4 h-4 text-neutral-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(room)}
                      className="p-2 rounded-lg hover:bg-danger-50 transition-colors"
                      title="Désactiver"
                    >
                      <TrashIcon className="w-4 h-4 text-danger-600" />
                    </button>
                  </div>
                </div>

                {room.description && (
                  <p className="text-sm text-neutral-600 mb-4">
                    {room.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">Ordre d'affichage</span>
                  <span className="font-medium text-neutral-900">
                    {room.display_order || '-'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <>
            <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowModal(false)}></div>
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <div className="card w-full max-w-md p-6 animate-slide-up">
                <h2 className="text-xl font-bold text-neutral-900 mb-4">
                  {editingRoom ? 'Modifier la pièce' : 'Nouvelle pièce'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Nom de la pièce *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="ex: Salle de jeu"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Description optionnelle"
                      rows={3}
                    />
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
                      {editingRoom ? 'Modifier' : 'Créer'}
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
