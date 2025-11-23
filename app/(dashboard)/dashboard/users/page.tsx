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
  KeyIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'

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
            <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Quicksand, sans-serif' }}>
              Employés
            </h1>
            <p className="text-muted-foreground">
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
            <UserGroupIcon className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              Aucun employé
            </h3>
            <p className="text-muted-foreground mb-4">
              Commencez par créer votre premier employé
            </p>
            <Button onClick={openCreateModal}>
              Créer un employé
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map((user) => (
              <Card
                key={user.id}
                className={`${!user.is_active && 'opacity-50'} hover:shadow-lg transition-shadow`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {user.first_name[0]}{user.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">
                          {user.first_name} {user.last_name}
                        </h3>
                        {!user.is_active && (
                          <Badge variant="danger">Désactivé</Badge>
                        )}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" title="Actions">
                          <EllipsisVerticalIcon className="w-5 h-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditModal(user)}>
                          <PencilIcon className="w-4 h-4" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => handleDelete(user)}
                        >
                          <TrashIcon className="w-4 h-4" />
                          Désactiver
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {user.email && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {user.email}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mb-3">
                    <KeyIcon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Code PIN configuré</span>
                  </div>

                  <div className="pt-3 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Accès aux pièces</p>
                    {user.accessible_rooms.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Aucune pièce assignée</p>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {user.accessible_rooms.slice(0, 3).map(roomId => {
                          const room = rooms.find(r => r.id === roomId)
                          return room ? (
                            <Badge
                              key={roomId}
                              variant="primary"
                              size="sm"
                            >
                              {room.name}
                            </Badge>
                          ) : null
                        })}
                        {user.accessible_rooms.length > 3 && (
                          <Badge variant="neutral" size="sm">
                            +{user.accessible_rooms.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <>
            <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowModal(false)}></div>
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <div className="card w-full max-w-2xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">
                  {editingUser ? 'Modifier l\'employé' : 'Nouvel employé'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Prénom *
                      </label>
                      <Input
                        type="text"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Nom *
                      </label>
                      <Input
                        type="text"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Email
                    </label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="optionnel"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Code PIN {!editingUser && '*'} (4-6 chiffres)
                    </label>
                    <Input
                      type="text"
                      value={formData.pin}
                      onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                      placeholder={editingUser ? 'Laisser vide pour ne pas modifier' : '1234'}
                      required={!editingUser}
                      maxLength={6}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {editingUser ? 'Laisser vide pour conserver le PIN actuel' : 'Le code PIN sera utilisé pour la connexion sur tablette'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Accès aux pièces
                    </label>
                    {rooms.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Aucune pièce disponible</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-border rounded-lg">
                        {rooms.map((room) => (
                          <label
                            key={room.id}
                            className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                          >
                            <Checkbox
                              checked={(formData.room_ids || []).includes(room.id)}
                              onCheckedChange={() => toggleRoom(room.id)}
                            />
                            <span className="text-sm">{room.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowModal(false)}
                      className="flex-1"
                    >
                      Annuler
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                    >
                      {editingUser ? 'Modifier' : 'Créer'}
                    </Button>
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
