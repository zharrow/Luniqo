'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { roomsService, type Room, type CreateRoomInput } from '@/lib/services/rooms.service'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  BuildingOfficeIcon,
  EllipsisVerticalIcon,
  ClipboardDocumentListIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { DeleteConfirmationDialog } from '@/components/shared/DeleteConfirmationDialog'
import { FormDialog } from '@/components/shared/FormDialog'
import { BentoGrid } from '@/components/ui/bento-grid'
import { cn } from '@/lib/utils'

export default function RoomsPage() {
  const router = useRouter()
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<CreateRoomInput>({
    name: '',
    description: ''
  })

  useEffect(() => {
    if (session?.enterprise?.id) {
      loadRooms()
    } else if (!authLoading && session && !session.enterprise) {
      setLoading(false)
    }
  }, [session?.enterprise?.id, authLoading])

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
      setIsSubmitting(true)
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
    } finally {
      setIsSubmitting(false)
    }
  }

  function openDeleteDialog(room: Room) {
    setRoomToDelete(room)
  }

  async function handleConfirmDelete() {
    if (!session?.enterprise?.id || !roomToDelete) return

    try {
      setIsDeleting(true)
      await roomsService.delete(roomToDelete.id, session.enterprise.id)
      loadRooms()
    } catch (error) {
      console.error('Error deleting room:', error)
      alert('Erreur lors de la suppression')
    } finally {
      setIsDeleting(false)
      setRoomToDelete(null)
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

        {/* Rooms Bento Grid */}
        {rooms.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <BuildingOfficeIcon className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              Aucune pièce
            </h3>
            <p className="text-muted-foreground mb-4">
              Commencez par créer votre première pièce
            </p>
            <Button onClick={openCreateModal}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Créer une pièce
            </Button>
          </div>
        ) : (
          <BentoGrid className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3 auto-rows-[18rem]">
            {rooms.map((room, index) => {
              // Patterns de colonnes pour un layout Bento dynamique
              const colSpanClass =
                index % 7 === 0 ? 'md:col-span-2' :
                index % 5 === 0 ? 'md:col-span-2' :
                'md:col-span-1'

              return (
                <div
                  key={room.id}
                  className={cn(
                    'group relative col-span-1 flex flex-col justify-between overflow-hidden rounded-xl',
                    'bg-gradient-to-br from-[#e3f2fd] to-white',
                    'border border-border border-l-4 border-l-[#5a9dc9]',
                    'hover:shadow-lg transition-all duration-300',
                    'hover:scale-[1.02]',
                    !room.is_active && 'opacity-50 hover:opacity-75',
                    colSpanClass
                  )}
                >
                  {/* Background decoration */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#5a9dc9]/5 via-transparent to-[#5a9dc9]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  {/* Sparkle effect on hover */}
                  <SparklesIcon className="absolute top-4 right-4 w-6 h-6 text-[#5a9dc9]/20 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:rotate-12" />

                  {/* Content */}
                  <div className="relative z-10 p-6 flex-1 flex flex-col">
                    {/* Header with icon and actions */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-12 h-12 rounded-xl bg-[#5a9dc9]/10 flex items-center justify-center group-hover:bg-[#5a9dc9]/20 transition-colors duration-300 group-hover:scale-110 transform">
                          <BuildingOfficeIcon className="w-6 h-6 text-[#2c5f7f]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg truncate group-hover:text-[#2c5f7f] transition-colors">
                            {room.name}
                          </h3>
                          {!room.is_active && (
                            <Badge variant="danger" size="sm" className="mt-1">
                              Désactivée
                            </Badge>
                          )}
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 hover:bg-primary/10"
                            title="Actions"
                          >
                            <EllipsisVerticalIcon className="w-5 h-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/rooms/${room.id}`)}>
                            <ClipboardDocumentListIcon className="w-4 h-4" />
                            Gérer les tâches
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openEditModal(room)}>
                            <PencilIcon className="w-4 h-4" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => openDeleteDialog(room)}
                          >
                            <TrashIcon className="w-4 h-4" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Description */}
                    {room.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                        {room.description}
                      </p>
                    )}

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Footer CTA */}
                    <div className="pt-4 border-t border-border/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto font-medium text-[#2c5f7f] hover:text-[#5a9dc9]"
                        onClick={() => router.push(`/dashboard/rooms/${room.id}`)}
                      >
                        Gérer les tâches
                        <ClipboardDocumentListIcon className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>

                  {/* Hover effect overlay */}
                  <div className="absolute inset-0 pointer-events-none border-2 border-[#5a9dc9]/0 group-hover:border-[#5a9dc9]/20 rounded-xl transition-all duration-300" />
                </div>
              )
            })}
          </BentoGrid>
        )}

        {/* Form Dialog */}
        <FormDialog
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
          title={editingRoom ? 'Modifier la pièce' : 'Nouvelle pièce'}
          submitLabel={editingRoom ? 'Modifier' : 'Créer'}
          isSubmitting={isSubmitting}
        >
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
              className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Description optionnelle"
              rows={3}
            />
          </div>
        </FormDialog>

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmationDialog
          isOpen={!!roomToDelete}
          onClose={() => setRoomToDelete(null)}
          onConfirm={handleConfirmDelete}
          itemName={roomToDelete?.name}
          isDeleting={isDeleting}
        />
      </div>
    </div>
  )
}