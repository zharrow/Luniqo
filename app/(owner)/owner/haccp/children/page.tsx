'use client'

import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { haccpService, type Child, type CreateChildInput, type Section } from '@/lib/services/haccp.service'
import {
  allergiesDietaryService,
  type Allergy,
  type DietaryRequirement
} from '@/lib/services/allergies-dietary.service'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserGroupIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DeleteConfirmationDialog } from '@/components/shared/DeleteConfirmationDialog'
import { FormDialog } from '@/components/shared/FormDialog'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'

// Extended child with allergies and dietary requirements
interface ChildWithDetails extends Child {
  childAllergies?: Allergy[]
  childDietaryRequirements?: DietaryRequirement[]
}

export default function ChildrenPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery } = useNursery()
  const [children, setChildren] = useState<ChildWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingChild, setEditingChild] = useState<ChildWithDetails | null>(null)
  const [childToDelete, setChildToDelete] = useState<Child | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reference data
  const [allAllergies, setAllAllergies] = useState<Allergy[]>([])
  const [allDietaryRequirements, setAllDietaryRequirements] = useState<DietaryRequirement[]>([])

  // Form state
  const [formData, setFormData] = useState<CreateChildInput>({
    first_name: '',
    last_name: '',
    birth_date: '',
    section: 'Babies',
    allergies: '',
    specific_diet: ''
  })
  const [selectedAllergyIds, setSelectedAllergyIds] = useState<string[]>([])
  const [selectedDietaryIds, setSelectedDietaryIds] = useState<string[]>([])

  useEffect(() => {
    loadReferenceData()
  }, [])

  useEffect(() => {
    if (selectedNursery?.id) {
      loadChildren()
    } else if (!authLoading && !selectedNursery) {
      setLoading(false)
    }
  }, [selectedNursery?.id, authLoading])

  async function loadReferenceData() {
    try {
      const [allergies, dietary] = await Promise.all([
        allergiesDietaryService.getAllAllergies(),
        allergiesDietaryService.getAllDietaryRequirements()
      ])
      setAllAllergies(allergies)
      setAllDietaryRequirements(dietary)
    } catch (error) {
      console.error('Error loading reference data:', error)
    }
  }

  async function loadChildren() {
    if (!selectedNursery?.id) return

    try {
      setLoading(true)
      const data = await haccpService.getChildren(selectedNursery.id)

      // Load allergies and dietary requirements for each child
      const childrenWithDetails = await Promise.all(
        data.map(async (child) => {
          try {
            const [allergies, dietary] = await Promise.all([
              allergiesDietaryService.getChildAllergies(child.id),
              allergiesDietaryService.getChildDietaryRequirements(child.id)
            ])
            return {
              ...child,
              childAllergies: allergies.map(ca => ca.allergy).filter(Boolean) as Allergy[],
              childDietaryRequirements: dietary.map(cd => cd.dietary_requirement).filter(Boolean) as DietaryRequirement[]
            }
          } catch {
            return child
          }
        })
      )

      setChildren(childrenWithDetails)
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
      specific_diet: ''
    })
    setSelectedAllergyIds([])
    setSelectedDietaryIds([])
    setShowModal(true)
  }

  async function openEditModal(child: ChildWithDetails) {
    setEditingChild(child)
    setFormData({
      first_name: child.first_name,
      last_name: child.last_name,
      birth_date: child.birth_date,
      section: child.section,
      allergies: child.allergies || '',
      specific_diet: child.specific_diet || ''
    })

    // Load current allergies and dietary requirements
    try {
      const [allergyIds, dietaryIds] = await Promise.all([
        allergiesDietaryService.getChildAllergyIds(child.id),
        allergiesDietaryService.getChildDietaryRequirementIds(child.id)
      ])
      setSelectedAllergyIds(allergyIds)
      setSelectedDietaryIds(dietaryIds)
    } catch (error) {
      console.error('Error loading child allergies/dietary:', error)
      setSelectedAllergyIds([])
      setSelectedDietaryIds([])
    }

    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedNursery?.id) return

    try {
      setIsSubmitting(true)

      let childId: string

      if (editingChild) {
        await haccpService.updateChild(editingChild.id, selectedNursery.id, formData)
        childId = editingChild.id
      } else {
        const newChild = await haccpService.createChild(selectedNursery.id, formData)
        childId = newChild.id
      }

      // Save allergies and dietary requirements (M2M)
      await Promise.all([
        allergiesDietaryService.setChildAllergies(childId, selectedAllergyIds),
        allergiesDietaryService.setChildDietaryRequirements(childId, selectedDietaryIds)
      ])

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
    if (!selectedNursery?.id || !childToDelete) return

    try {
      setIsDeleting(true)
      await haccpService.deleteChild(childToDelete.id, selectedNursery.id)
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
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#81c995]"></div>
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
            { label: 'HACCP', href: '/owner/haccp' },
            { label: 'Enfants' }
          ]}
        />

        {/* Header - Style organique rose (users) */}
        <div
          className="relative rounded-3xl p-6 mb-8 bg-white overflow-hidden"
          style={{
            border: '1px solid #f4c2c233',
            background: 'linear-gradient(to bottom right, #fef8f8, white)'
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="inline-flex items-center justify-center w-14 h-14 rounded-2xl"
                style={{ background: 'linear-gradient(to bottom right, #f4c2c21A, #f4c2c20D)' }}
              >
                <UserGroupIcon className="w-7 h-7" style={{ color: '#e59ba1' }} strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-1 bg-gradient-to-r from-pink-500 to-rose-600 bg-clip-text text-transparent">
                  Enfants
                </h1>
                <p className="text-muted-foreground">
                  Gestion des enfants inscrits et suivi des allergènes
                </p>
              </div>
            </div>
            <Button
              onClick={openCreateModal}
              className="flex items-center gap-2 bg-gradient-to-br from-pink-400 to-rose-500 hover:from-pink-500 hover:to-rose-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              <PlusIcon className="w-5 h-5" />
              Nouvel enfant
            </Button>
          </div>
        </div>

        {/* Children grid */}
        {children.length === 0 ? (
          <div
            className="relative rounded-3xl p-12 text-center bg-white overflow-hidden"
            style={{
              border: '1px solid #f4c2c233',
              background: 'linear-gradient(to bottom right, #fef8f8, white)'
            }}
          >
            <UserGroupIcon className="w-16 h-16 mx-auto mb-4" style={{ color: '#f4c2c240' }} />
            <h3 className="text-lg font-medium mb-2 text-gray-900">
              Aucun enfant inscrit
            </h3>
            <p className="text-gray-600 mb-4">
              Commencez par inscrire votre premier enfant
            </p>
            <Button
              onClick={openCreateModal}
              className="bg-gradient-to-br from-pink-400 to-rose-500 hover:from-pink-500 hover:to-rose-600 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              Inscrire un enfant
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {children.map((child) => (
              <div
                key={child.id}
                className={`relative rounded-3xl p-6 bg-white hover:-translate-y-1 transition-all duration-300 group overflow-hidden ${!child.is_active && 'opacity-50'}`}
                style={{
                  border: '1px solid #f4c2c233',
                  boxShadow: '0 0 0 0 rgba(244,194,194,0.25)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 16px 48px -12px rgba(244,194,194,0.25)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 0 0 rgba(244,194,194,0.25)'
                }}
              >
                {/* Gradient fond rose */}
                <div
                  className="absolute inset-0 opacity-60"
                  style={{ background: 'linear-gradient(to bottom right, #fef8f8, white)' }}
                />

                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1">
                      {/* Avatar avec animation rose */}
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 group-hover:rotate-2 transition-all duration-300"
                        style={{ background: 'linear-gradient(to bottom right, #f4c2c21A, #f4c2c20D)' }}
                      >
                        <span className="text-lg font-semibold" style={{ color: '#e59ba1' }}>
                          {child.first_name[0]}{child.last_name[0]}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate text-gray-900">
                          {child.first_name} {child.last_name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {calculateAge(child.birth_date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => openEditModal(child)}
                        className="p-2 rounded-xl hover:bg-pink-50 transition-all duration-300 hover:scale-110"
                        title="Modifier"
                      >
                        <PencilIcon className="w-4 h-4 text-pink-600" />
                      </button>
                      <button
                        onClick={() => openDeleteDialog(child)}
                        className="p-2 rounded-xl hover:bg-red-50 transition-all duration-300 hover:scale-110"
                        title="Désactiver"
                      >
                        <TrashIcon className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Section</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getSectionColor(child.section)}`}>
                        {getSectionLabel(child.section)}
                      </span>
                    </div>

                    {/* Allergies as badges */}
                    {(child.childAllergies && child.childAllergies.length > 0) && (
                      <div className="p-3 rounded-lg bg-danger-50 border border-danger-200">
                        <div className="flex items-start gap-2">
                          <ExclamationTriangleIcon className="w-5 h-5 text-danger-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs font-medium text-danger-900 mb-2">Allergies</p>
                            <div className="flex flex-wrap gap-1">
                              {child.childAllergies.map((allergy) => (
                                <Badge
                                  key={allergy.id}
                                  variant="danger"
                                  size="sm"
                                  className="text-xs"
                                >
                                  {allergy.icon} {allergy.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Legacy text allergies (fallback) */}
                    {child.allergies && (!child.childAllergies || child.childAllergies.length === 0) && (
                      <div className="p-3 rounded-lg bg-danger-50 border border-danger-200">
                        <div className="flex items-start gap-2">
                          <ExclamationTriangleIcon className="w-5 h-5 text-danger-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-medium text-danger-900 mb-1">Allergies (texte)</p>
                            <p className="text-sm text-danger-700">{child.allergies}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Dietary requirements as badges */}
                    {(child.childDietaryRequirements && child.childDietaryRequirements.length > 0) && (
                      <div className="p-3 rounded-lg bg-accent-50 border border-accent-200">
                        <p className="text-xs font-medium text-accent-900 mb-2">Régime alimentaire</p>
                        <div className="flex flex-wrap gap-1">
                          {child.childDietaryRequirements.map((diet) => (
                            <Badge
                              key={diet.id}
                              variant="warning"
                              size="sm"
                              className="text-xs"
                            >
                              {diet.icon} {diet.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Legacy text dietary (fallback) */}
                    {child.specific_diet && (!child.childDietaryRequirements || child.childDietaryRequirements.length === 0) && (
                      <div className="p-3 rounded-lg bg-accent-50 border border-accent-200">
                        <p className="text-xs font-medium text-accent-900 mb-1">Régime (texte)</p>
                        <p className="text-sm text-accent-700">{child.specific_diet}</p>
                      </div>
                    )}

                    {!child.is_active && (
                      <div className="pt-2 border-t border-border">
                        <span className="text-xs text-danger-600 font-medium">Désactivé</span>
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

          {/* Allergies checkboxes */}
          <div>
            <label className="block text-sm font-medium mb-2">
              <ExclamationTriangleIcon className="w-4 h-4 inline mr-1 text-danger-600" />
              Allergies
            </label>
            <div className="grid grid-cols-2 gap-2 p-3 rounded-lg border border-danger-200 bg-danger-50/50 max-h-48 overflow-y-auto">
              {allAllergies.map((allergy) => (
                <label
                  key={allergy.id}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                    selectedAllergyIds.includes(allergy.id)
                      ? 'bg-danger-100 border border-danger-300'
                      : 'bg-white border border-transparent hover:bg-danger-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedAllergyIds.includes(allergy.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedAllergyIds([...selectedAllergyIds, allergy.id])
                      } else {
                        setSelectedAllergyIds(selectedAllergyIds.filter(id => id !== allergy.id))
                      }
                    }}
                    className="w-4 h-4 rounded border-danger-300 text-danger-600 focus:ring-danger-500"
                  />
                  <span className="text-sm">
                    {allergy.icon} {allergy.name}
                  </span>
                  {allergy.severity === 'severe' && (
                    <span className="text-xs text-danger-600 font-medium">!</span>
                  )}
                </label>
              ))}
            </div>
            {selectedAllergyIds.length > 0 && (
              <p className="text-xs text-danger-600 mt-1 font-medium">
                {selectedAllergyIds.length} allergie{selectedAllergyIds.length > 1 ? 's' : ''} sélectionnée{selectedAllergyIds.length > 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Dietary requirements checkboxes */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Régimes alimentaires
            </label>
            <div className="grid grid-cols-2 gap-2 p-3 rounded-lg border border-accent-200 bg-accent-50/50 max-h-48 overflow-y-auto">
              {allDietaryRequirements.map((diet) => (
                <label
                  key={diet.id}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                    selectedDietaryIds.includes(diet.id)
                      ? 'bg-accent-100 border border-accent-300'
                      : 'bg-white border border-transparent hover:bg-accent-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedDietaryIds.includes(diet.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedDietaryIds([...selectedDietaryIds, diet.id])
                      } else {
                        setSelectedDietaryIds(selectedDietaryIds.filter(id => id !== diet.id))
                      }
                    }}
                    className="w-4 h-4 rounded border-accent-300 text-accent-600 focus:ring-accent-500"
                  />
                  <span className="text-sm">
                    {diet.icon} {diet.name}
                  </span>
                </label>
              ))}
            </div>
            {selectedDietaryIds.length > 0 && (
              <p className="text-xs text-accent-700 mt-1">
                {selectedDietaryIds.length} régime{selectedDietaryIds.length > 1 ? 's' : ''} sélectionné{selectedDietaryIds.length > 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Legacy text fields (collapsed) */}
          <details className="text-sm">
            <summary className="text-muted-foreground cursor-pointer hover:text-foreground">
              Champs texte (ancienne méthode)
            </summary>
            <div className="mt-2 space-y-3 pl-4 border-l-2 border-muted">
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">
                  Allergies (texte libre)
                </label>
                <input
                  type="text"
                  value={formData.allergies}
                  onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="ex: Arachides, Lactose"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">
                  Régime (texte libre)
                </label>
                <input
                  type="text"
                  value={formData.specific_diet}
                  onChange={(e) => setFormData({ ...formData, specific_diet: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="ex: Végétarien"
                />
              </div>
            </div>
          </details>
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
    </div>
  )
}
