'use client'

import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { haccpService, type Child, type CreateChildInput, type Section } from '@/lib/services/haccp.service'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserGroupIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Badge } from '@/components/ui/badge'
import { DeleteConfirmationDialog } from '@/components/shared/DeleteConfirmationDialog'
import { FormDialog } from '@/components/shared/FormDialog'

export default function ChildrenPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Admin'])
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingChild, setEditingChild] = useState<Child | null>(null)
  const [childToDelete, setChildToDelete] = useState<Child | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<CreateChildInput>({
    first_name: '',
    last_name: '',
    birth_date: '',
    section: 'Babies',
    allergies: '',
    dietary_restrictions: ''
  })

  useEffect(() => {
    if (session?.enterprise) {
      loadChildren()
    }
  }, [session])

  async function loadChildren() {
    if (!session?.enterprise?.id) return

    try {
      setLoading(true)
      const data = await haccpService.getChildren(session.enterprise.id)
      setChildren(data)
    } catch (error) {
      console.error('Error loading children:', error)
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    setEditingChild(null)
    setFormData({
      first_name: '',
      last_name: '',
      birth_date: '',
      section: 'Babies',
      allergies: '',
      dietary_restrictions: ''
    })
    setShowModal(true)
  }

  function openEditModal(child: Child) {
    setEditingChild(child)
    setFormData({
      first_name: child.first_name,
      last_name: child.last_name,
      birth_date: child.birth_date,
      section: child.section,
      allergies: child.allergies || '',
      dietary_restrictions: child.dietary_restrictions || ''
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!session?.enterprise?.id) return

    try {
      setIsSubmitting(true)
      if (editingChild) {
        await haccpService.updateChild(editingChild.id, session.enterprise.id, formData)
      } else {
        await haccpService.createChild(session.enterprise.id, formData)
      }

      setShowModal(false)
      loadChildren()
    } catch (error) {
      console.error('Error saving child:', error)
      alert('Erreur lors de la sauvegarde')
    } finally {
      setIsSubmitting(false)
    }
  }

  function openDeleteDialog(child: Child) {
    setChildToDelete(child)
  }

  async function handleConfirmDelete() {
    if (!session?.enterprise?.id || !childToDelete) return

    try {
      setIsDeleting(true)
      await haccpService.deleteChild(childToDelete.id, session.enterprise.id)
      loadChildren()
    } catch (error) {
      console.error('Error deleting child:', error)
      alert('Erreur lors de la suppression')
    } finally {
      setIsDeleting(false)
      setChildToDelete(null)
    }
  }

  function calculateAge(birthDate: string): string {
    const today = new Date()
    const birth = new Date(birthDate)
    const ageInMonths = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth())

    if (ageInMonths < 12) {
      return `${ageInMonths} mois`
    } else {
      const years = Math.floor(ageInMonths / 12)
      const months = ageInMonths % 12
      return months > 0 ? `${years} an${years > 1 ? 's' : ''} ${months} mois` : `${years} an${years > 1 ? 's' : ''}`
    }
  }

  const getSectionColor = (section: Section) => {
    switch (section) {
      case 'Babies': return 'bg-primary-50 text-primary-700 border-primary-200'
      case 'Toddlers': return 'bg-secondary-50 text-secondary-700 border-secondary-200'
      case 'Preschoolers': return 'bg-accent-50 text-accent-700 border-accent-200'
      default: return 'bg-muted text-muted-foreground border-border'
    }
  }

  const getSectionLabel = (section: Section) => {
    switch (section) {
      case 'Babies': return 'Bébés'
      case 'Toddlers': return 'Moyens'
      case 'Preschoolers': return 'Grands'
      default: return section
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
        {/* Breadcrumb */}
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard/haccp">HACCP</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Enfants</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Enfants
            </h1>
            <p className="text-muted-foreground">
              Gestion des enfants inscrits et suivi des allergènes
            </p>
          </div>
          <Button onClick={openCreateModal} className="flex items-center gap-2">
            <PlusIcon className="w-5 h-5" />
            Nouvel enfant
          </Button>
        </div>

        {/* Children grid */}
        {children.length === 0 ? (
          <div className="card p-12 text-center">
            <UserGroupIcon className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              Aucun enfant inscrit
            </h3>
            <p className="text-muted-foreground mb-4">
              Commencez par inscrire votre premier enfant
            </p>
            <Button onClick={openCreateModal}>
              Inscrire un enfant
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {children.map((child) => (
              <div
                key={child.id}
                className={`card p-6 ${!child.is_active && 'opacity-50'}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-semibold text-primary-600">
                        {child.first_name[0]}{child.last_name[0]}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">
                        {child.first_name} {child.last_name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {calculateAge(child.birth_date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => openEditModal(child)}
                      className="p-2 rounded-lg hover:bg-muted transition-colors"
                      title="Modifier"
                    >
                      <PencilIcon className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => openDeleteDialog(child)}
                      className="p-2 rounded-lg hover:bg-danger-50 transition-colors"
                      title="Désactiver"
                    >
                      <TrashIcon className="w-4 h-4 text-danger-600" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Section</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${getSectionColor(child.section)}`}>
                      {getSectionLabel(child.section)}
                    </span>
                  </div>

                  {child.allergies && (
                    <div className="p-3 rounded-lg bg-danger-50 border border-danger-200">
                      <div className="flex items-start gap-2">
                        <ExclamationTriangleIcon className="w-5 h-5 text-danger-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-danger-900 mb-1">Allergies</p>
                          <p className="text-sm text-danger-700">{child.allergies}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {child.dietary_restrictions && (
                    <div className="p-3 rounded-lg bg-accent-50 border border-accent-200">
                      <p className="text-xs font-medium text-accent-900 mb-1">Régime alimentaire</p>
                      <p className="text-sm text-accent-700">{child.dietary_restrictions}</p>
                    </div>
                  )}

                  {!child.is_active && (
                    <div className="pt-2 border-t border-border">
                      <span className="text-xs text-danger-600 font-medium">Désactivé</span>
                    </div>
                  )}
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
          title={editingChild ? 'Modifier l\'enfant' : 'Nouvel enfant'}
          submitLabel={editingChild ? 'Modifier' : 'Créer'}
          isSubmitting={isSubmitting}
          maxWidth="md"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Prénom *
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Nom *
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Date de naissance *
            </label>
            <input
              type="date"
              value={formData.birth_date}
              onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Section *
            </label>
            <select
              value={formData.section}
              onChange={(e) => setFormData({ ...formData, section: e.target.value as Section })}
              className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              required
            >
              <option value="Babies">Bébés</option>
              <option value="Toddlers">Moyens</option>
              <option value="Preschoolers">Grands</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Allergies
            </label>
            <input
              type="text"
              value={formData.allergies}
              onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="ex: Arachides, Lactose, Oeufs"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Séparez les allergies par des virgules
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Restrictions alimentaires
            </label>
            <textarea
              value={formData.dietary_restrictions}
              onChange={(e) => setFormData({ ...formData, dietary_restrictions: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="ex: Végétarien, Sans gluten"
              rows={2}
            />
          </div>
        </FormDialog>

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmationDialog
          isOpen={!!childToDelete}
          onClose={() => setChildToDelete(null)}
          onConfirm={handleConfirmDelete}
          title="Confirmer la désactivation"
          description="Êtes-vous sûr de vouloir désactiver l'enfant"
          itemName={childToDelete ? `${childToDelete.first_name} ${childToDelete.last_name}` : ''}
          isDeleting={isDeleting}
        />
      </div>
    </DashboardLayout>
  )
}
