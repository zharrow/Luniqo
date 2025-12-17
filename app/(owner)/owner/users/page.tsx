'use client'

import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { usersService, type ProfileWithRooms, type CreateEmployeeInput } from '@/lib/services/users.service'
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { AvatarSelector } from '@/components/shared/AvatarSelector'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { DeleteConfirmationDialog } from '@/components/shared/DeleteConfirmationDialog'
import { FormDialog } from '@/components/shared/FormDialog'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'

export default function UsersPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const [users, setUsers] = useState<ProfileWithRooms[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<ProfileWithRooms | null>(null)
  const [userToDelete, setUserToDelete] = useState<ProfileWithRooms | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<CreateEmployeeInput>({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    pin: '',
    avatar_url: '',
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
        usersService.getEmployees(session.enterprise.id),
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
      password: '',
      pin: '',
      avatar_url: '',
      room_ids: []
    })
    setShowModal(true)
  }

  function openEditModal(user: ProfileWithRooms) {
    setEditingUser(user)
    setFormData({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      password: '', // Don't pre-fill password for security
      pin: '', // Don't pre-fill PIN for security
      avatar_url: user.avatar_url || '',
      room_ids: user.accessible_rooms
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!session?.enterprise?.id || !session?.user?.id) return

    // Validate required fields for creation
    if (!editingUser) {
      if (!formData.email) {
        alert('L\'email est obligatoire')
        return
      }
      if (!formData.password || formData.password.length < 8) {
        alert('Le mot de passe doit contenir au moins 8 caractères')
        return
      }
      if (!formData.pin || formData.pin.length !== 4) {
        alert('Le code PIN doit contenir exactement 4 chiffres')
        return
      }
    }

    try {
      setIsSubmitting(true)
      if (editingUser) {
        // Update user
        const updateData: any = {
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email || undefined,
          avatar_url: formData.avatar_url || undefined
        }

        // Only update PIN if provided (when editing)
        if (formData.pin) {
          if (formData.pin.length !== 4) {
            alert('Le code PIN doit contenir exactement 4 chiffres')
            return
          }
          updateData.pin = formData.pin
        }

        await usersService.updateEmployee(editingUser.id, session.enterprise.id, updateData)

        // Update room access
        await usersService.updateRoomAccess(editingUser.id, formData.room_ids || [])
      } else {
        // Create user
        await usersService.createEmployee(session.enterprise.id, session.user.id, formData)
      }

      setShowModal(false)
      loadData()
    } catch (error) {
      console.error('Error saving user:', error)
      alert('Erreur lors de la sauvegarde')
    } finally {
      setIsSubmitting(false)
    }
  }

  function openDeleteDialog(user: ProfileWithRooms) {
    setUserToDelete(user)
  }

  async function handleConfirmDelete() {
    if (!session?.enterprise?.id || !userToDelete) return

    try {
      setIsDeleting(true)
      await usersService.softDelete(userToDelete.id, session.enterprise.id)
      loadData()
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Erreur lors de la suppression')
    } finally {
      setIsDeleting(false)
      setUserToDelete(null)
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
            { label: 'Employés' }
          ]}
        />

        {/* Header with Gradient - Module Users (Rose) */}
        <div className="relative mb-8 p-8 rounded-3xl bg-gradient-to-br from-pink-50 via-rose-50 to-red-50 border border-pink-200/50 overflow-hidden">
          <div className="absolute inset-0 bg-[url('/patterns/dots.svg')] opacity-5"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-500/30">
                <UserGroupIcon className="w-8 h-8 text-white" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-1 bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                  Employés
                </h1>
                <p className="text-pink-700/70">
                  Gérez vos employés et leurs accès aux pièces
                </p>
              </div>
            </div>
            <button
              onClick={openCreateModal}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-medium shadow-lg shadow-pink-500/30 hover:shadow-xl hover:shadow-pink-500/40 hover:scale-105 transition-all duration-200 flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              Nouvel employé
            </button>
          </div>
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
              <div
                key={user.id}
                className={`${!user.is_active && 'opacity-50'} relative rounded-3xl p-6 bg-white hover:-translate-y-1 transition-all duration-300 group overflow-hidden`}
                style={{
                  border: '1px solid #f4a5a520',
                  boxShadow: '0 0 0 0 rgba(244,165,165,0.25)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 16px 48px -12px rgba(244,165,165,0.25)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 0 0 rgba(244,165,165,0.25)'
                }}
              >
                {/* Gradient fond */}
                <div
                  className="absolute inset-0 opacity-60"
                  style={{ background: 'linear-gradient(to bottom right, #fef6f7, white)' }}
                />

                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        {user.avatar_url ? (
                          <AvatarImage src={user.avatar_url} alt="Avatar" />
                        ) : null}
                        <AvatarFallback className="bg-[#f4a5a5]/10 text-[#c66b6b] font-semibold">
                          {user.first_name?.[0] || '?'}{user.last_name?.[0] || '?'}
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
                          onClick={() => openDeleteDialog(user)}
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
                              variant="users"
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
          title={editingUser ? 'Modifier l\'employé' : 'Nouvel employé'}
          submitLabel={editingUser ? 'Modifier' : 'Créer'}
          isSubmitting={isSubmitting}
          maxWidth="lg"
        >
          {/* Sélecteur d'avatar */}
          <AvatarSelector
            selectedAvatar={formData.avatar_url || null}
            onSelect={(avatar_url) => setFormData({ ...formData, avatar_url })}
          />

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
              Email *
            </label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@exemple.fr"
              required={!editingUser}
              disabled={editingUser} // Email cannot be changed after creation
            />
            <p className="text-xs text-muted-foreground mt-1">
              Pour la connexion au dashboard
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Mot de passe {!editingUser && '*'}
            </label>
            <Input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={editingUser ? 'Laisser vide pour ne pas modifier' : 'Min. 8 caractères'}
              required={!editingUser}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Pour la connexion au dashboard
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Code PIN {!editingUser && '*'}
            </label>
            <Input
              type="text"
              inputMode="numeric"
              value={formData.pin}
              onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
              placeholder={editingUser ? 'Laisser vide pour ne pas modifier' : '4 chiffres'}
              required={!editingUser}
              maxLength={4}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Pour la connexion tablette (4 chiffres)
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
        </FormDialog>

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmationDialog
          isOpen={!!userToDelete}
          onClose={() => setUserToDelete(null)}
          onConfirm={handleConfirmDelete}
          title="Confirmer la désactivation"
          description="Êtes-vous sûr de vouloir désactiver l'employé"
          itemName={userToDelete ? `${userToDelete.first_name} ${userToDelete.last_name}` : ''}
          isDeleting={isDeleting}
        />
      </div>
    </div>
  )
}
