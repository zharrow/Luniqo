'use client'

import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { usersService, type UserWithRooms, type CreateUserInput } from '@/lib/services/users.service'
import { roomsService, type Room } from '@/lib/services/rooms.service'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserGroupIcon,
  KeyIcon
} from '@heroicons/react/24/outline'

export default function UsersPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Admin'])
  const [users, setUsers] = useState<UserWithRooms[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<UserWithRooms | null>(null)
  const [formData, setFormData] = useState<CreateUserInput>({
    first_name: '',
    last_name: '',
    email: '',
    pin: '',
    room_ids: []
  })

  useEffect(() => {
    if (session?.enterprise) {
      loadData()
    }
  }, [session])

  async function loadData() {
    if (!session?.enterprise?.id) return

    try {
      setLoading(true)
      const [usersData, roomsData] = await Promise.all([
        usersService.getAll(session.enterprise.id),
        roomsService.getActive(session.enterprise.id)
      ])
      setUsers(usersData)
      setRooms(roomsData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    setEditingUser(null)
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      pin: '',
      room_ids: []
    })
    setShowModal(true)
  }

  function openEditModal(user: UserWithRooms) {
    setEditingUser(user)
    setFormData({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email || '',
      pin: '', // Don't pre-fill PIN for security
      room_ids: user.accessible_rooms
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!session?.enterprise?.id || !session?.user?.id) return

    // Validate PIN
    if (!editingUser && formData.pin.length < 4) {
      alert('Le code PIN doit contenir au moins 4 chiffres')
      return
    }

    try {
      if (editingUser) {
        // Update user
        const updateData: any = {
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email || undefined
        }

        // Only update PIN if provided
        if (formData.pin) {
          if (formData.pin.length < 4) {
            alert('Le code PIN doit contenir au moins 4 chiffres')
            return
          }
          updateData.pin = formData.pin
        }

        await usersService.update(editingUser.id, session.enterprise.id, updateData)

        // Update room access
        await usersService.updateRoomAccess(editingUser.id, formData.room_ids || [])
      } else {
        // Create user
        await usersService.create(session.enterprise.id, session.user.id, formData)
      }

      setShowModal(false)
      loadData()
    } catch (error) {
      console.error('Error saving user:', error)
      alert('Erreur lors de la sauvegarde')
    }
  }

  async function handleDelete(user: UserWithRooms) {
    if (!session?.enterprise?.id) return
    if (!confirm(`Êtes-vous sûr de vouloir désactiver ${user.first_name} ${user.last_name} ?`)) return

    try {
      await usersService.softDelete(user.id, session.enterprise.id)
      loadData()
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Erreur lors de la suppression')
    }
  }

  function toggleRoom(roomId: string) {
    const currentRooms = formData.room_ids || []
    if (currentRooms.includes(roomId)) {
      setFormData({
        ...formData,
        room_ids: currentRooms.filter(id => id !== roomId)
      })
    } else {
      setFormData({
        ...formData,
        room_ids: [...currentRooms, roomId]
      })
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
              Employés
            </h1>
            <p className="text-neutral-600">
              Gérez vos employés et leurs accès aux pièces
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="btn btn-primary flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Nouvel employé
          </button>
        </div>

        {/* Users grid */}
        {users.length === 0 ? (
          <div className="card p-12 text-center">
            <UserGroupIcon className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 mb-2">
              Aucun employé
            </h3>
            <p className="text-neutral-600 mb-4">
              Commencez par créer votre premier employé
            </p>
            <button onClick={openCreateModal} className="btn btn-primary">
              Créer un employé
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map((user) => (
              <div
                key={user.id}
                className={`card p-6 ${!user.is_active && 'opacity-50'}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center">
                      <span className="text-lg font-semibold text-primary-600">
                        {user.first_name[0]}{user.last_name[0]}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-900">
                        {user.first_name} {user.last_name}
                      </h3>
                      {!user.is_active && (
                        <span className="text-xs text-danger-600">Désactivé</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(user)}
                      className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
                      title="Modifier"
                    >
                      <PencilIcon className="w-4 h-4 text-neutral-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(user)}
                      className="p-2 rounded-lg hover:bg-danger-50 transition-colors"
                      title="Désactiver"
                    >
                      <TrashIcon className="w-4 h-4 text-danger-600" />
                    </button>
                  </div>
                </div>

                {user.email && (
                  <p className="text-sm text-neutral-600 mb-3">
                    {user.email}
                  </p>
                )}

                <div className="flex items-center gap-2 mb-3">
                  <KeyIcon className="w-4 h-4 text-neutral-400" />
                  <span className="text-sm text-neutral-500">Code PIN configuré</span>
                </div>

                <div className="pt-3 border-t border-neutral-100">
                  <p className="text-xs text-neutral-500 mb-2">Accès aux pièces</p>
                  {user.accessible_rooms.length === 0 ? (
                    <p className="text-sm text-neutral-400">Aucune pièce assignée</p>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {user.accessible_rooms.slice(0, 3).map(roomId => {
                        const room = rooms.find(r => r.id === roomId)
                        return room ? (
                          <span
                            key={roomId}
                            className="px-2 py-1 rounded text-xs bg-primary-50 text-primary-700"
                          >
                            {room.name}
                          </span>
                        ) : null
                      })}
                      {user.accessible_rooms.length > 3 && (
                        <span className="px-2 py-1 rounded text-xs bg-neutral-100 text-neutral-600">
                          +{user.accessible_rooms.length - 3}
                        </span>
                      )}
                    </div>
                  )}
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
              <div className="card w-full max-w-2xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold text-neutral-900 mb-4">
                  {editingUser ? 'Modifier l\'employé' : 'Nouvel employé'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Prénom *
                      </label>
                      <input
                        type="text"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Nom *
                      </label>
                      <input
                        type="text"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="optionnel"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Code PIN {!editingUser && '*'} (4-6 chiffres)
                    </label>
                    <input
                      type="text"
                      value={formData.pin}
                      onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                      className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder={editingUser ? 'Laisser vide pour ne pas modifier' : '1234'}
                      required={!editingUser}
                      maxLength={6}
                      pattern="[0-9]{4,6}"
                    />
                    <p className="text-xs text-neutral-500 mt-1">
                      {editingUser ? 'Laisser vide pour conserver le PIN actuel' : 'Le code PIN sera utilisé pour la connexion sur tablette'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Accès aux pièces
                    </label>
                    {rooms.length === 0 ? (
                      <p className="text-sm text-neutral-500">Aucune pièce disponible</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-neutral-200 rounded-lg">
                        {rooms.map((room) => (
                          <label
                            key={room.id}
                            className="flex items-center gap-2 p-2 rounded hover:bg-neutral-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={(formData.room_ids || []).includes(room.id)}
                              onChange={() => toggleRoom(room.id)}
                              className="w-4 h-4 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
                            />
                            <span className="text-sm text-neutral-700">{room.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
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
                      {editingUser ? 'Modifier' : 'Créer'}
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
