'use client'

import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { nurseryService, type NurseryStats } from '@/lib/services/nursery.service'
import type { Nursery } from '@/types/database.types'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  BuildingOffice2Icon,
  UserGroupIcon,
  HomeIcon,
  UserIcon,
  StarIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DeleteConfirmationDialog } from '@/components/shared/DeleteConfirmationDialog'
import { FormDialog } from '@/components/shared/FormDialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'

interface NurseryWithStats extends Nursery {
  stats?: NurseryStats
}

interface NurseryFormData {
  name: string
  address?: string
  city?: string
  postal_code?: string
  phone?: string
  email?: string
  capacity?: number
}

export default function NurseriesPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const [nurseries, setNurseries] = useState<NurseryWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingNursery, setEditingNursery] = useState<Nursery | null>(null)
  const [nurseryToDelete, setNurseryToDelete] = useState<Nursery | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<NurseryFormData>({
    name: '',
    address: '',
    city: '',
    postal_code: '',
    phone: '',
    email: '',
    capacity: undefined
  })

  useEffect(() => {
    if (session?.enterprise?.id) {
      loadNurseries()
    } else if (!authLoading && session && !session.enterprise) {
      setLoading(false)
    }
  }, [session?.enterprise?.id, authLoading])

  async function loadNurseries() {
    if (!session?.enterprise?.id) return

    try {
      setLoading(true)
      const data = await nurseryService.getAll(session.enterprise.id)

      // Load stats for each nursery
      const nurseriesWithStats = await Promise.all(
        data.map(async (nursery) => {
          try {
            const stats = await nurseryService.getStats(nursery.id)
            return { ...nursery, stats }
          } catch (error) {
            console.error(`Error loading stats for nursery ${nursery.id}:`, error)
            return nursery
          }
        })
      )

      setNurseries(nurseriesWithStats)
    } catch (error) {
      console.error('Error loading nurseries:', error)
    } finally {
      setLoading(false)
    }
  }

  // Couleurs variées pour chaque crèche (principe "Interface Vivante")
  const nurseryColors = [
    { primary: '#5a9dc9', light: '#e3f2fd', shadow: 'rgba(90,157,201,0.25)' }, // Bleu
    { primary: '#f4a5a5', light: '#fef6f7', shadow: 'rgba(244,165,165,0.25)' }, // Rose
    { primary: '#ffab91', light: '#fff3e0', shadow: 'rgba(255,171,145,0.25)' }, // Pêche
    { primary: '#64b5d1', light: '#e0f7fa', shadow: 'rgba(100,181,209,0.25)' }, // Turquoise
    { primary: '#aed581', light: '#f1f8e9', shadow: 'rgba(174,213,129,0.25)' }, // Lime
    { primary: '#b39ddb', light: '#f3e5f5', shadow: 'rgba(179,157,219,0.25)' }, // Violet
    { primary: '#81c995', light: '#e8f5e9', shadow: 'rgba(129,201,149,0.25)' }, // Vert menthe
    { primary: '#9fa8da', light: '#e8eaf6', shadow: 'rgba(159,168,218,0.25)' }, // Indigo
  ]

  const getNurseryColor = (index: number) => {
    return nurseryColors[index % nurseryColors.length]
  }

  // Layout organique : pattern compact sur grille 12 colonnes
  type CardSize = 'featured' | 'medium' | 'small'

  const getCardLayout = (index: number): {
    size: CardSize
    colSpan: string
  } => {
    // Première carte toujours featured (6 colonnes)
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

    // Le reste en pattern 4 colonnes (3 par ligne)
    return {
      size: 'medium',
      colSpan: 'col-span-12 md:col-span-4'
    }
  }

  function openCreateModal() {
    setEditingNursery(null)
    setFormData({
      name: '',
      address: '',
      city: '',
      postal_code: '',
      phone: '',
      email: '',
      capacity: undefined
    })
    setShowModal(true)
  }

  function openEditModal(nursery: Nursery) {
    setEditingNursery(nursery)
    setFormData({
      name: nursery.name,
      address: nursery.address || '',
      city: nursery.city || '',
      postal_code: nursery.postal_code || '',
      phone: nursery.phone || '',
      email: nursery.email || '',
      capacity: nursery.capacity || undefined
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!session?.enterprise?.id) return

    try {
      setIsSubmitting(true)
      setError(null)

      if (editingNursery) {
        await nurseryService.update(editingNursery.id, session.enterprise.id, formData)
      } else {
        await nurseryService.create(session.enterprise.id, formData)
      }

      setShowModal(false)
      await loadNurseries()
    } catch (error) {
      console.error('Error saving nursery:', error)
      setError('Erreur lors de la sauvegarde')
    } finally {
      setIsSubmitting(false)
    }
  }

  function openDeleteDialog(nursery: Nursery) {
    setNurseryToDelete(nursery)
  }

  async function handleConfirmDelete() {
    if (!session?.enterprise?.id || !nurseryToDelete) return

    try {
      setIsDeleting(true)
      setError(null)
      await nurseryService.delete(nurseryToDelete.id, session.enterprise.id)
      await loadNurseries()
    } catch (error: any) {
      console.error('Error deleting nursery:', error)
      setError(error.message || 'Erreur lors de la suppression')
      alert(error.message || 'Erreur lors de la suppression')
    } finally {
      setIsDeleting(false)
      setNurseryToDelete(null)
    }
  }

  async function handleSetDefault(nursery: Nursery) {
    if (!session?.enterprise?.id || nursery.is_default) return

    try {
      setError(null)
      await nurseryService.setDefault(nursery.id, session.enterprise.id)
      await loadNurseries()
    } catch (error) {
      console.error('Error setting default nursery:', error)
      setError('Erreur lors de la modification')
      alert('Erreur lors de la modification')
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
            { label: 'Crèches' }
          ]}
        />

        {/* Header - Module Nurseries (Bleu) */}
        <div className="relative mb-6 p-6 rounded-3xl bg-white border overflow-hidden group hover:-translate-y-1 transition-all duration-300"
          style={{
            borderColor: '#5a9dc933',
            background: 'linear-gradient(to bottom right, #e3f2fd, white)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 16px 48px -12px rgba(90,157,201,0.25)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 0 0 0 rgba(90,157,201,0.25)'
          }}
        >
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#5a9dc9] to-[#4a8db9] flex items-center justify-center shadow-md shadow-[#5a9dc9]/30 group-hover:scale-105 group-hover:rotate-2 transition-all duration-300">
                <BuildingOffice2Icon className="w-6 h-6 text-white" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Crèches
                </h1>
                <p className="text-sm text-gray-600">
                  Gérez vos établissements multi-sites
                </p>
              </div>
            </div>
            <button
              onClick={openCreateModal}
              className="px-6 py-3 rounded-2xl bg-[#5a9dc9] hover:bg-[#4a8db9] text-white font-medium shadow-lg shadow-[#5a9dc9]/30 hover:shadow-xl hover:shadow-[#5a9dc9]/40 hover:scale-105 transition-all duration-300 flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              Nouvelle crèche
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Nurseries Bento Grid */}
        {nurseries.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <BuildingOffice2Icon className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              Aucune crèche
            </h3>
            <p className="text-muted-foreground mb-4">
              Commencez par créer votre première crèche
            </p>
            <Button onClick={openCreateModal}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Créer une crèche
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-3">
            {nurseries.map((nursery, index) => {
              const colors = getNurseryColor(index)
              const layout = getCardLayout(index)

              return (
                <div
                  key={nursery.id}
                  className={cn(
                    'group relative flex flex-col justify-between overflow-hidden rounded-3xl',
                    'bg-white border',
                    'hover:-translate-y-1 transition-all duration-300',
                    !nursery.is_active && 'opacity-50 hover:opacity-75',
                    layout.colSpan
                  )}
                  style={{
                    borderColor: colors.primary + '33',
                    background: `linear-gradient(to bottom right, ${colors.light}, white)`,
                    minHeight: layout.size === 'featured' ? '20rem' : layout.size === 'small' ? '16rem' : '17rem'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = `0 16px 48px -12px ${colors.shadow}`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 0 0 rgba(0,0,0,0)'
                  }}
                >
                  {/* Content */}
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
                          <BuildingOffice2Icon className={cn(
                            "text-white",
                            layout.size === 'featured' ? 'w-6 h-6' : layout.size === 'small' ? 'w-5 h-5' : 'w-5 h-5'
                          )} strokeWidth={2} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={cn(
                            "font-semibold text-gray-900 group-hover:text-gray-700 transition-colors",
                            layout.size === 'featured' ? 'text-lg mb-1' : layout.size === 'small' ? 'text-base' : 'text-base'
                          )}>
                            {nursery.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            {nursery.is_default && (
                              <Badge variant="success" size="sm" className="flex items-center gap-1">
                                <StarIconSolid className="w-3 h-3" />
                                Par défaut
                              </Badge>
                            )}
                            {!nursery.is_active && (
                              <Badge variant="danger" size="sm">
                                Désactivée
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {!nursery.is_default && nursery.is_active && (
                          <button
                            className="inline-flex items-center justify-center size-8 rounded-lg hover:bg-yellow-50 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSetDefault(nursery)
                            }}
                            title="Définir par défaut"
                          >
                            <StarIcon className="w-4 h-4 text-yellow-600" />
                          </button>
                        )}
                        <button
                          className="inline-flex items-center justify-center size-8 rounded-lg hover:bg-gray-100 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditModal(nursery)
                          }}
                          title="Modifier"
                        >
                          <PencilIcon className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          className="inline-flex items-center justify-center size-8 rounded-lg hover:bg-red-50 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            openDeleteDialog(nursery)
                          }}
                          title="Désactiver"
                        >
                          <TrashIcon className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>

                    {/* Address */}
                    {nursery.city && (
                      <p className={cn(
                        "text-gray-600 mb-3",
                        layout.size === 'featured' ? 'text-sm' : 'text-xs'
                      )}>
                        {nursery.address && `${nursery.address}, `}
                        {nursery.city} {nursery.postal_code}
                      </p>
                    )}

                    {/* Stats */}
                    {nursery.stats && (
                      <div className={cn(
                        "grid gap-2 mb-3",
                        layout.size === 'featured' ? 'grid-cols-3' : 'grid-cols-3'
                      )}>
                        <div className="flex flex-col items-center p-2 rounded-xl bg-white/50">
                          <UserIcon className={cn(
                            "text-gray-400 mb-1",
                            layout.size === 'featured' ? 'w-5 h-5' : 'w-4 h-4'
                          )} />
                          <div className={cn(
                            "font-bold text-gray-900",
                            layout.size === 'featured' ? 'text-lg' : 'text-base'
                          )}>
                            {nursery.stats.childCount}
                          </div>
                          <div className="text-xs text-gray-600">
                            Enfants
                          </div>
                        </div>
                        <div className="flex flex-col items-center p-2 rounded-xl bg-white/50">
                          <HomeIcon className={cn(
                            "text-gray-400 mb-1",
                            layout.size === 'featured' ? 'w-5 h-5' : 'w-4 h-4'
                          )} />
                          <div className={cn(
                            "font-bold text-gray-900",
                            layout.size === 'featured' ? 'text-lg' : 'text-base'
                          )}>
                            {nursery.stats.roomCount}
                          </div>
                          <div className="text-xs text-gray-600">
                            Salles
                          </div>
                        </div>
                        <div className="flex flex-col items-center p-2 rounded-xl bg-white/50">
                          <UserGroupIcon className={cn(
                            "text-gray-400 mb-1",
                            layout.size === 'featured' ? 'w-5 h-5' : 'w-4 h-4'
                          )} />
                          <div className={cn(
                            "font-bold text-gray-900",
                            layout.size === 'featured' ? 'text-lg' : 'text-base'
                          )}>
                            {nursery.stats.employeeCount}
                          </div>
                          <div className="text-xs text-gray-600">
                            Équipe
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Contact info */}
                    {(nursery.phone || nursery.email) && (
                      <div className={cn(
                        "text-gray-600 space-y-1",
                        layout.size === 'featured' ? 'text-sm' : 'text-xs'
                      )}>
                        {nursery.phone && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">📞</span>
                            <span>{nursery.phone}</span>
                          </div>
                        )}
                        {nursery.email && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">✉️</span>
                            <span className="truncate">{nursery.email}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Capacity */}
                    {nursery.capacity && (
                      <div className="mt-2">
                        <Badge variant="neutral" size="sm">
                          Capacité: {nursery.capacity} enfants
                        </Badge>
                      </div>
                    )}
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
          title={editingNursery ? 'Modifier la crèche' : 'Nouvelle crèche'}
          submitLabel={editingNursery ? 'Modifier' : 'Créer'}
          isSubmitting={isSubmitting}
          maxWidth="lg"
        >
          <div>
            <label className="block text-sm font-medium mb-1">
              Nom de la crèche *
            </label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="ex: Crèche Les Petits Loups - Site Centre"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Adresse
            </label>
            <Input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="ex: 123 Rue de la République"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Ville
              </label>
              <Input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="ex: Paris"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Code postal
              </label>
              <Input
                type="text"
                value={formData.postal_code}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                placeholder="ex: 75001"
                maxLength={5}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Téléphone
              </label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="ex: 01 23 45 67 89"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Capacité
              </label>
              <Input
                type="number"
                min={1}
                value={formData.capacity || ''}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="ex: 20"
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
              placeholder="ex: contact@creche.fr"
            />
          </div>
        </FormDialog>

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmationDialog
          isOpen={!!nurseryToDelete}
          onClose={() => setNurseryToDelete(null)}
          onConfirm={handleConfirmDelete}
          itemName={nurseryToDelete?.name}
          isDeleting={isDeleting}
          title="Désactiver cette crèche ?"
          description="Cette crèche sera désactivée et ne sera plus visible dans la liste. Les données seront conservées."
        />
      </div>
    </div>
  )
}
