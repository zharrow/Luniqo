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
      avatar_url: user.avatar_url || '',
      room_ids: user.accessible_rooms
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!session?.enterprise?.id || !session?.user?.id) return

    // Validate PIN
    if (!editingUser && formData.password.length < 4) {
      alert('Le code PIN doit contenir au moins 4 chiffres')
      return
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
        if (formData.password) {
          if (formData.password.length < 4) {
            alert('Le code PIN doit contenir au moins 4 chiffres')
            return
          }
          updateData.pin = formData.password
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
                className={`${!user.is_active && 'opacity-50'} hover:shadow-lg transition-shadow bg-gradient-to-br from-[#fce4ec] to-white border-l-4 border-l-[#f4a5a5]`}
              >
                <CardContent className="p-6">
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
                </CardContent>
              </Card>
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
              {editingUser ? 'Code PIN (4 chiffres)' : 'Mot de passe *'}
            </label>
            <Input
              type={editingUser ? "text" : "password"}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: editingUser ? e.target.value.replace(/\D/g, '').slice(0, 4) : e.target.value })}
              placeholder={editingUser ? 'Laisser vide pour ne pas modifier le PIN' : 'Mot de passe fort'}
              required={!editingUser}
              maxLength={editingUser ? 4 : undefined}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {editingUser ? 'Code PIN pour la connexion tablette (4 chiffres)' : 'Mot de passe pour la connexion au dashboard'}
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
