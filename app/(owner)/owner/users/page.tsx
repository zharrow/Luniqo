'use client'

import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { createClient } from '@/lib/supabase/client'
import { usersService, type ProfileWithRooms, type CreateEmployeeInput } from '@/lib/services/users.service'
import { roomsService, type Room } from '@/lib/services/rooms.service'

interface Nursery {
  id: string
  name: string
  is_active: boolean
}
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserGroupIcon,
  KeyIcon,
  EllipsisVerticalIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
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
  const { selectedNursery } = useNursery()
  const [users, setUsers] = useState<ProfileWithRooms[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [nurseries, setNurseries] = useState<Nursery[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<ProfileWithRooms | null>(null)
  const [userToDelete, setUserToDelete] = useState<ProfileWithRooms | null>(null)
  const [actionType, setActionType] = useState<'deactivate' | 'reactivate' | 'hardDelete'>('deactivate')
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<CreateEmployeeInput>({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    pin: '',
    avatar_url: '',
    nursery_ids: [],
    room_ids: []
  })

  useEffect(() => {
    if (selectedNursery?.id && session?.enterprise?.id) {
      loadData()
    } else if (!authLoading && !selectedNursery) {
      setLoading(false)
    }
  }, [selectedNursery?.id, session?.enterprise?.id, authLoading])

  async function loadData() {
    if (!selectedNursery?.id || !session?.enterprise?.id) return

    try {
      setLoading(true)
      const supabase = createClient() as any

      const [usersData, roomsData, nurseriesData] = await Promise.all([
        usersService.getEmployeesByNursery(selectedNursery.id),
        roomsService.getActive(selectedNursery.id),
        supabase
          .from('nursery')
          .select('id, name, is_active')
          .eq('enterprise_id', session.enterprise.id)
          .eq('is_active', true)
          .order('name', { ascending: true })
      ])

      setUsers(usersData)
      setRooms(roomsData)
      setNurseries(nurseriesData.data || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Couleurs variées pour chaque employé (principe "Interface Vivante")
  const userColors = [
    { primary: '#f4a5a5', light: '#fef6f7', shadow: 'rgba(244,165,165,0.25)' }, // Rose
    { primary: '#64b5d1', light: '#e0f7fa', shadow: 'rgba(100,181,209,0.25)' }, // Turquoise
    { primary: '#b39ddb', light: '#f3e5f5', shadow: 'rgba(179,157,219,0.25)' }, // Violet
    { primary: '#aed581', light: '#f1f8e9', shadow: 'rgba(174,213,129,0.25)' }, // Lime
    { primary: '#81c995', light: '#e8f5e9', shadow: 'rgba(129,201,149,0.25)' }, // Vert menthe
    { primary: '#ffab91', light: '#fff3e0', shadow: 'rgba(255,171,145,0.25)' }, // Pêche
    { primary: '#9fa8da', light: '#e8eaf6', shadow: 'rgba(159,168,218,0.25)' }, // Indigo
    { primary: '#5a9dc9', light: '#e3f2fd', shadow: 'rgba(90,157,201,0.25)' }, // Bleu ciel
  ]

  const getUserColor = (index: number) => {
    return userColors[index % userColors.length]
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
      nursery_ids: [selectedNursery?.id].filter(Boolean) as string[], // Pre-select current nursery
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
      nursery_ids: user.accessible_nurseries || [],
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

        // Update nursery and room access
        await Promise.all([
          usersService.updateNurseryAccess(editingUser.id, formData.nursery_ids || []),
          usersService.updateRoomAccess(editingUser.id, formData.room_ids || [])
        ])
      } else {
        // Create user
        const newEmployee = await usersService.createEmployee(session.enterprise.id, session.user.id, formData)

        // Assign nurseries to the new employee
        if (formData.nursery_ids && formData.nursery_ids.length > 0) {
          await usersService.updateNurseryAccess(newEmployee.id, formData.nursery_ids)
        }
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

  function openDeactivateDialog(user: ProfileWithRooms) {
    setActionType('deactivate')
    setUserToDelete(user)
  }

  function openReactivateDialog(user: ProfileWithRooms) {
    setActionType('reactivate')
    setUserToDelete(user)
  }

  function openHardDeleteDialog(user: ProfileWithRooms) {
    setActionType('hardDelete')
    setUserToDelete(user)
  }

  async function handleConfirmAction() {
    if (!session?.enterprise?.id || !userToDelete) return

    try {
      setIsDeleting(true)

      if (actionType === 'deactivate') {
        await usersService.softDelete(userToDelete.id, session.enterprise.id)
      } else if (actionType === 'reactivate') {
        await usersService.reactivateEmployee(userToDelete.id, session.enterprise.id)
      } else if (actionType === 'hardDelete') {
        await usersService.hardDeleteEmployee(userToDelete.id, session.enterprise.id)
      }

      loadData()
    } catch (error) {
      console.error('Error performing action:', error)
      alert('Erreur lors de l\'opération')
    } finally {
      setIsDeleting(false)
      setUserToDelete(null)
    }
  }

  function toggleNursery(nurseryId: string) {
    const currentNurseries = formData.nursery_ids || []
    if (currentNurseries.includes(nurseryId)) {
      setFormData({
        ...formData,
        nursery_ids: currentNurseries.filter(id => id !== nurseryId)
      })
    } else {
      setFormData({
        ...formData,
        nursery_ids: [...currentNurseries, nurseryId]
      })
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

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-pink-100">
              <UserGroupIcon className="w-6 h-6 text-pink-600" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Employés</h1>
              <p className="text-sm text-muted-foreground">
                Gérez vos employés et leurs accès aux pièces
              </p>
            </div>
          </div>
          <Button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-pink-500 hover:bg-pink-600 text-white"
          >
            <PlusIcon className="w-5 h-5" />
            Nouvel employé
          </Button>
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
            {users.map((user, index) => {
              const colors = getUserColor(index)

              return (
                <div
                  key={user.id}
                  className={`${!user.is_active && 'opacity-50'} relative rounded-3xl p-6 bg-white border hover:-translate-y-1 transition-all duration-300 group overflow-hidden cursor-pointer`}
                  style={{
                    borderColor: colors.primary + '33',
                    background: `linear-gradient(to bottom right, ${colors.light}, white)`
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = `0 16px 48px -12px ${colors.shadow}`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 0 0 rgba(0,0,0,0)'
                  }}
                >
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-12 w-12 ring-2 group-hover:ring-4 transition-all duration-300"
                            style={{ '--tw-ring-color': colors.primary + '40' } as React.CSSProperties}
                          >
                            {user.avatar_url ? (
                              <AvatarImage src={user.avatar_url} alt="Avatar" />
                            ) : null}
                            <AvatarFallback className="font-semibold text-white"
                              style={{ background: `linear-gradient(to bottom right, ${colors.primary}, ${colors.primary}dd)` }}
                            >
                              {user.first_name?.[0] || '?'}{user.last_name?.[0] || '?'}
                            </AvatarFallback>
                          </Avatar>
                          {/* Status indicator */}
                          <div
                            className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-sm"
                            style={{
                              background: user.is_active ? '#81c995' : '#9e9e9e'
                            }}
                          />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">
                            {user.first_name} {user.last_name}
                          </h3>
                          {!user.is_active && (
                            <Badge variant="danger" size="sm">Désactivé</Badge>
                          )}
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex items-center justify-center size-9 rounded-md hover:bg-gray-100 transition-colors">
                          <EllipsisVerticalIcon className="w-5 h-5 text-gray-600" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditModal(user)}>
                            <PencilIcon className="w-4 h-4" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {user.is_active ? (
                            <>
                              <DropdownMenuItem
                                onClick={() => openDeactivateDialog(user)}
                              >
                                <XCircleIcon className="w-4 h-4" />
                                Désactiver
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => openHardDeleteDialog(user)}
                              >
                                <TrashIcon className="w-4 h-4" />
                                Supprimer définitivement
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <>
                              <DropdownMenuItem
                                onClick={() => openReactivateDialog(user)}
                              >
                                <CheckCircleIcon className="w-4 h-4" />
                                Réactiver
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => openHardDeleteDialog(user)}
                              >
                                <TrashIcon className="w-4 h-4" />
                                Supprimer définitivement
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {user.email && (
                      <p className="text-sm text-gray-600 mb-3">
                        {user.email}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg"
                      style={{ background: colors.primary + '10' }}
                    >
                      <KeyIcon className="w-4 h-4" style={{ color: colors.primary }} />
                      <span className="text-sm font-medium" style={{ color: colors.primary }}>
                        Code PIN configuré
                      </span>
                    </div>

                    <div className="pt-3 border-t"
                      style={{ borderColor: colors.primary + '20' }}
                    >
                      <p className="text-xs text-gray-500 mb-2">Accès aux pièces</p>
                      {user.accessible_rooms.length === 0 ? (
                        <p className="text-sm text-gray-500">Aucune pièce assignée</p>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {user.accessible_rooms.slice(0, 3).map(roomId => {
                            const room = rooms.find(r => r.id === roomId)
                            return room ? (
                              <Badge
                                key={roomId}
                                size="sm"
                                className="text-white"
                                style={{
                                  background: `linear-gradient(to right, ${colors.primary}, ${colors.primary}dd)`,
                                  boxShadow: `0 2px 8px ${colors.shadow}`
                                }}
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

                  {/* Micro-animation : icône utilisateur au hover */}
                  <div
                    className="absolute bottom-3 right-3 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:rotate-12 transition-all duration-300"
                    style={{
                      background: `linear-gradient(to bottom right, ${colors.primary}, ${colors.primary}dd)`,
                      boxShadow: `0 4px 12px ${colors.shadow}`
                    }}
                  >
                    <UserGroupIcon className="w-4 h-4 text-white" strokeWidth={2} />
                  </div>
                </div>
              )
            })}
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
              disabled={!!editingUser} // Email cannot be changed after creation
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
              Crèches assignées *
            </label>
            {nurseries.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune crèche disponible</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-border rounded-lg">
                {nurseries.map((nursery) => (
                  <label
                    key={nursery.id}
                    className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                  >
                    <Checkbox
                      checked={(formData.nursery_ids || []).includes(nursery.id)}
                      onCheckedChange={() => toggleNursery(nursery.id)}
                    />
                    <span className="text-sm">{nursery.name}</span>
                  </label>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Sélectionnez les crèches où cet employé travaillera
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Accès aux pièces (optionnel)
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
            <p className="text-xs text-muted-foreground mt-1">
              Les pièces de la crèche actuellement sélectionnée
            </p>
          </div>
        </FormDialog>

        {/* Action Confirmation Dialog */}
        <DeleteConfirmationDialog
          isOpen={!!userToDelete}
          onClose={() => setUserToDelete(null)}
          onConfirm={handleConfirmAction}
          title={
            actionType === 'deactivate'
              ? 'Confirmer la désactivation'
              : actionType === 'reactivate'
              ? 'Confirmer la réactivation'
              : 'Confirmer la suppression définitive'
          }
          description={
            actionType === 'deactivate'
              ? 'Êtes-vous sûr de vouloir désactiver l\'employé'
              : actionType === 'reactivate'
              ? 'Êtes-vous sûr de vouloir réactiver l\'employé'
              : 'Cette action est irréversible. Toutes les données associées seront supprimées. Êtes-vous sûr de vouloir supprimer définitivement l\'employé'
          }
          itemName={userToDelete ? `${userToDelete.first_name} ${userToDelete.last_name}` : ''}
          isDeleting={isDeleting}
          confirmButtonText={
            actionType === 'deactivate'
              ? 'Désactiver'
              : actionType === 'reactivate'
              ? 'Réactiver'
              : 'Supprimer définitivement'
          }
          confirmingButtonText={
            actionType === 'deactivate'
              ? 'Désactivation...'
              : actionType === 'reactivate'
              ? 'Réactivation...'
              : 'Suppression...'
          }
          showIrreversibleWarning={actionType === 'hardDelete'}
        />
      </div>
    </div>
  )
}
