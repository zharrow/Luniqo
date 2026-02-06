'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { roomsService, type Room, type CreateRoomInput } from '@/lib/services/rooms.service'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  BuildingOfficeIcon,
  ClipboardDocumentListIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DeleteConfirmationDialog } from '@/components/shared/DeleteConfirmationDialog'
import { FormDialog } from '@/components/shared/FormDialog'
import { cn } from '@/lib/utils'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'

export default function RoomsPage() {
  const router = useRouter()
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery } = useNursery()
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
    if (selectedNursery?.id) {
      loadRooms()
    } else if (!authLoading && !selectedNursery) {
      setLoading(false)
    }
  }, [selectedNursery?.id, authLoading])

  async function loadRooms() {
    if (!selectedNursery?.id) return

    try {
      setLoading(true)
      const data = await roomsService.getAll(selectedNursery.id)
      setRooms(data)
    } catch (error) {
      console.error('Error loading rooms:', error)
    } finally {
      setLoading(false)
    }
  }

  // Couleurs variées pour chaque pièce (principe "Interface Vivante")
  const roomColors = [
    { primary: '#ffab91', light: '#fff3e0', shadow: 'rgba(255,171,145,0.25)' }, // Pêche
    { primary: '#64b5d1', light: '#e0f7fa', shadow: 'rgba(100,181,209,0.25)' }, // Turquoise
    { primary: '#b39ddb', light: '#f3e5f5', shadow: 'rgba(179,157,219,0.25)' }, // Violet
    { primary: '#aed581', light: '#f1f8e9', shadow: 'rgba(174,213,129,0.25)' }, // Lime
    { primary: '#81c995', light: '#e8f5e9', shadow: 'rgba(129,201,149,0.25)' }, // Vert menthe
    { primary: '#f4a5a5', light: '#fef6f7', shadow: 'rgba(244,165,165,0.25)' }, // Rose
    { primary: '#9fa8da', light: '#e8eaf6', shadow: 'rgba(159,168,218,0.25)' }, // Indigo
    { primary: '#5a9dc9', light: '#e3f2fd', shadow: 'rgba(90,157,201,0.25)' }, // Bleu ciel
  ]

  const getRoomColor = (index: number) => {
    return roomColors[index % roomColors.length]
  }

  // Layout organique : pattern compact sur grille 12 colonnes
  type CardSize = 'featured' | 'medium' | 'small'

  const getCardLayout = (index: number): {
    size: CardSize
    colSpan: string
  } => {
    // Première carte toujours featured mais plus compacte (6 colonnes au lieu de 8)
    if (index === 0) {
      return {
        size: 'featured',
        colSpan: 'col-span-12 md:col-span-6'
      }
    }

    // Les 2 cartes suivantes complètent la première ligne (3 colonnes chacune)
    if (index === 1 || index === 2) {
      return {
        size: 'small',
        colSpan: 'col-span-12 md:col-span-3'
      }
    }

    // Le reste en pattern 4 colonnes (3 par ligne) pour maximiser l'espace horizontal
    return {
      size: 'medium',
      colSpan: 'col-span-12 md:col-span-4'
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
    if (!selectedNursery?.id) return

    try {
      setIsSubmitting(true)
      if (editingRoom) {
        await roomsService.update(editingRoom.id, selectedNursery.id, formData)
      } else {
        await roomsService.create(selectedNursery.id, formData)
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
    if (!selectedNursery?.id || !roomToDelete) return

    try {
      setIsDeleting(true)
      await roomsService.delete(roomToDelete.id, selectedNursery.id)
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
        {/* Breadcrumb */}
        <PageBreadcrumb
          items={[
            { label: 'Dashboard', href: '/owner/dashboard' },
            { label: 'Pièces' }
          ]}
        />

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-orange-100">
              <BuildingOfficeIcon className="w-6 h-6 text-orange-600" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Pièces</h1>
              <p className="text-sm text-muted-foreground">
                Gérez les pièces de votre crèche
              </p>
            </div>
          </div>
          <Button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white"
          >
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
          <div className="grid grid-cols-12 gap-3">
            {rooms.map((room, index) => {
              const colors = getRoomColor(index)
              const layout = getCardLayout(index)

              return (
                <div
                  key={room.id}
                  className={cn(
                    'group relative flex flex-col justify-between overflow-hidden rounded-3xl',
                    'bg-white border',
                    'hover:-translate-y-1 transition-all duration-300 cursor-pointer',
                    !room.is_active && 'opacity-50 hover:opacity-75',
                    layout.colSpan
                  )}
                  style={{
                    borderColor: colors.primary + '33',
                    background: `linear-gradient(to bottom right, ${colors.light}, white)`,
                    minHeight: layout.size === 'featured' ? '18rem' : layout.size === 'small' ? '14rem' : '15rem'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = `0 16px 48px -12px ${colors.shadow}`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 0 0 rgba(0,0,0,0)'
                  }}
                  onClick={() => router.push(`/owner/rooms/${room.id}`)}
                >
                  {/* Sparkle decoration */}
                  <SparklesIcon
                    className="absolute top-4 right-4 w-6 h-6 opacity-0 group-hover:opacity-20 transition-all duration-300 group-hover:rotate-12 pointer-events-none"
                    style={{ color: colors.primary }}
                  />

                  {/* Content - Different templates based on size */}
                  <div className={cn(
                    "relative z-10 flex-1 flex flex-col",
                    layout.size === 'small' ? 'p-4' : 'p-5'
                  )}>
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div
                          className={cn(
                            "rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 group-hover:rotate-3 transition-all duration-300",
                            layout.size === 'featured' ? 'w-12 h-12' : layout.size === 'small' ? 'w-9 h-9' : 'w-10 h-10'
                          )}
                          style={{
                            background: `linear-gradient(to bottom right, ${colors.primary}, ${colors.primary}dd)`,
                            boxShadow: `0 4px 12px ${colors.shadow}`
                          }}
                        >
                          <BuildingOfficeIcon className={cn(
                            "text-white",
                            layout.size === 'featured' ? 'w-6 h-6' : layout.size === 'small' ? 'w-5 h-5' : 'w-5 h-5'
                          )} strokeWidth={2} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={cn(
                            "font-semibold text-gray-900 group-hover:text-gray-700 transition-colors",
                            layout.size === 'featured' ? 'text-lg mb-1' : layout.size === 'small' ? 'text-base' : 'text-base'
                          )}>
                            {room.name}
                          </h3>
                          {!room.is_active && (
                            <Badge variant="danger" size="sm" className="mt-1">
                              Désactivée
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          className="inline-flex items-center justify-center size-8 rounded-lg hover:bg-gray-100 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditModal(room)
                          }}
                          title="Modifier"
                        >
                          <PencilIcon className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          className="inline-flex items-center justify-center size-8 rounded-lg hover:bg-red-50 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            openDeleteDialog(room)
                          }}
                          title="Supprimer"
                        >
                          <TrashIcon className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>

                    {/* Description */}
                    {room.description && (
                      <p className={cn(
                        "text-gray-600 mb-3",
                        layout.size === 'featured' ? 'text-sm line-clamp-2' : 'text-xs line-clamp-1'
                      )}>
                        {room.description}
                      </p>
                    )}

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Footer CTA */}
                    <div className="pt-3 border-t opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ borderColor: colors.primary + '20' }}
                    >
                      <div className="flex items-center gap-2 text-sm font-medium"
                        style={{ color: colors.primary }}
                      >
                        <span>Gérer les tâches</span>
                        <ClipboardDocumentListIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                      </div>
                    </div>
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