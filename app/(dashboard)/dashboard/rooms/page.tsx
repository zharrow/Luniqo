'use client'

import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { roomsService, type Room, type CreateRoomInput } from '@/lib/services/rooms.service'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  BuildingOfficeIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ShineBorder } from '@/components/ui/shine-border'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'

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
            <h1 className="text-3xl font-bold mb-2">
              Pièces
            </h1>
            <p className="text-muted-foreground">
              Gérez les pièces de votre crèche
            </p>
          </div>
          <Button onClick={openCreateModal} className="flex items-center gap-2">
            <PlusIcon className="w-5 h-5" />
            Nouvelle pièce
          </Button>
        </div>

        {/* Rooms grid */}
        {rooms.length === 0 ? (
          <div className="card p-12 text-center">
            <BuildingOfficeIcon className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              Aucune pièce
            </h3>
            <p className="text-muted-foreground mb-4">
              Commencez par créer votre première pièce
            </p>
            <Button onClick={openCreateModal}>
              Créer une pièce
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <ShineBorder
                key={room.id}
                color="#a855f7"
                className={`${!room.is_active && 'opacity-50'}`}
              >
                <Card className="border-0">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <BuildingOfficeIcon className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">
                            {room.name}
                          </h3>
                          {!room.is_active && (
                            <Badge variant="danger" size="sm">Désactivée</Badge>
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
                          <DropdownMenuItem onClick={() => openEditModal(room)}>
                            <PencilIcon className="w-4 h-4" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => handleDelete(room)}
                          >
                            <TrashIcon className="w-4 h-4" />
                            Désactiver
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {room.description && (
                      <p className="text-sm text-muted-foreground mb-4">
                        {room.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Ordre d'affichage</span>
                      <Badge variant="neutral" size="sm">
                        {room.display_order || '-'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </ShineBorder>
            ))}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowModal(false)}></div>
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <Card className="w-full max-w-md animate-slide-up">
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold mb-4">
                    {editingRoom ? 'Modifier la pièce' : 'Nouvelle pièce'}
                  </h2>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Nom de la pièce *
                      </label>
                      <Input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="ex: Salle de jeu"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        placeholder="Description optionnelle"
                        rows={3}
                      />
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
                      <Button type="submit" className="flex-1">
                        {editingRoom ? 'Modifier' : 'Créer'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
