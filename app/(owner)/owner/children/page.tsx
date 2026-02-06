'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { childService, type Child, type ChildWithAllergies, type CreateChildInput } from '@/lib/services/child.service'
import { sectionService, type Section } from '@/lib/services/section.service'
import {
  allergiesDietaryService,
  type Allergy,
  type DietaryRequirement
} from '@/lib/services/allergies-dietary.service'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  UserGroupIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { DeleteConfirmationDialog } from '@/components/shared/DeleteConfirmationDialog'
import { FormDialog } from '@/components/shared/FormDialog'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'

type SectionCode = 'Babies' | 'Toddlers' | 'Preschoolers'

export default function ChildrenPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery } = useNursery()
  const router = useRouter()

  const [children, setChildren] = useState<ChildWithAllergies[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingChild, setEditingChild] = useState<ChildWithAllergies | null>(null)
  const [childToDelete, setChildToDelete] = useState<Child | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSection, setSelectedSection] = useState<string>('all')

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
      loadData()
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

  async function loadData() {
    if (!selectedNursery?.id) return

    try {
      setLoading(true)
      const [childrenData, sectionsData] = await Promise.all([
        childService.getAllWithAllergies(selectedNursery.id),
        sectionService.getActive(selectedNursery.id)
      ])
      setChildren(childrenData)
      setSections(sectionsData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter children
  const filteredChildren = children.filter(child => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch =
      child.first_name.toLowerCase().includes(searchLower) ||
      child.last_name.toLowerCase().includes(searchLower) ||
      child.preferred_name?.toLowerCase().includes(searchLower)

    const matchesSection = selectedSection === 'all' || child.section === selectedSection

    return matchesSearch && matchesSection && child.is_active
  })

  // Stats
  const totalChildren = children.length
  const activeChildren = children.filter(c => c.is_active).length
  const childrenWithAllergies = children.filter(c =>
    (c.childAllergies && c.childAllergies.length > 0) || c.allergies
  ).length

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

  async function openEditModal(child: ChildWithAllergies) {
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
        await childService.update(editingChild.id, formData)
        childId = editingChild.id
      } else {
        const newChild = await childService.create(selectedNursery.id, formData)
        childId = newChild.id
      }

      // Save allergies and dietary requirements (M2M)
      await Promise.all([
        allergiesDietaryService.setChildAllergies(childId, selectedAllergyIds),
        allergiesDietaryService.setChildDietaryRequirements(childId, selectedDietaryIds)
      ])

      setShowModal(false)
      loadData()
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
    if (!childToDelete) return

    try {
      setIsDeleting(true)
      await childService.delete(childToDelete.id)
      loadData()
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

  const getSectionColor = (section: string) => {
    switch (section) {
      case 'Babies': return 'bg-primary-50 text-primary-700 border-primary-200'
      case 'Toddlers': return 'bg-secondary-50 text-secondary-700 border-secondary-200'
      case 'Preschoolers': return 'bg-accent-50 text-accent-700 border-accent-200'
      default: return 'bg-muted text-muted-foreground border-border'
    }
  }

  const getSectionLabel = (section: string) => {
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f4c2c2]"></div>
        </div>
      </div>
    )
  }

  if (!selectedNursery) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <UserGroupIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Aucune crèche sélectionnée</h2>
          <p className="text-gray-600">Veuillez sélectionner une crèche pour voir les enfants.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <PageBreadcrumb
        items={[
          { label: 'Dashboard', href: '/owner/dashboard' },
          { label: 'Enfants' }
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-pink-100">
            <UserGroupIcon className="w-6 h-6 text-pink-600" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Enfants</h1>
            <p className="text-sm text-muted-foreground">
              Gestion des enfants inscrits et suivi des allergènes
            </p>
          </div>
        </div>
        <Button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-pink-500 hover:bg-pink-600 text-white"
        >
          <PlusIcon className="w-5 h-5" />
          Nouvel enfant
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 bg-gradient-to-br from-pink-50 to-white border-pink-100">
          <div className="text-sm text-gray-600">Total enfants</div>
          <div className="text-2xl font-bold text-gray-900">{totalChildren}</div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-green-50 to-white border-green-100">
          <div className="text-sm text-gray-600">Actifs</div>
          <div className="text-2xl font-bold text-green-600">{activeChildren}</div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-orange-50 to-white border-orange-100">
          <div className="text-sm text-gray-600">Avec PAI</div>
          <div className="text-2xl font-bold text-orange-600">0</div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-red-50 to-white border-red-100">
          <div className="text-sm text-gray-600">Allergies</div>
          <div className="text-2xl font-bold text-red-600">{childrenWithAllergies}</div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Rechercher un enfant (nom, prénom, surnom)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Section filter */}
        <div className="flex items-center gap-2">
          <FunnelIcon className="h-5 w-5 text-gray-400" />
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
          >
            <option value="all">Toutes les sections</option>
            <option value="Babies">Bébés</option>
            <option value="Toddlers">Moyens</option>
            <option value="Preschoolers">Grands</option>
            {sections.filter(s => !['Babies', 'Toddlers', 'Preschoolers'].includes(s.code || '')).map(section => (
              <option key={section.id} value={section.code || ''}>
                {section.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Children grid */}
      {filteredChildren.length === 0 ? (
        <div
          className="relative rounded-3xl p-12 text-center bg-white overflow-hidden"
          style={{
            border: '1px solid #f4c2c233',
            background: 'linear-gradient(to bottom right, #fef8f8, white)'
          }}
        >
          <UserGroupIcon className="w-16 h-16 mx-auto mb-4" style={{ color: '#f4c2c240' }} />
          <h3 className="text-lg font-medium mb-2 text-gray-900">
            {searchTerm || selectedSection !== 'all' ? 'Aucun enfant trouvé' : 'Aucun enfant inscrit'}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || selectedSection !== 'all'
              ? 'Aucun enfant ne correspond à vos critères de recherche.'
              : 'Commencez par inscrire votre premier enfant'}
          </p>
          {!searchTerm && selectedSection === 'all' && (
            <Button
              onClick={openCreateModal}
              className="bg-gradient-to-br from-pink-400 to-rose-500 hover:from-pink-500 hover:to-rose-600 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              Inscrire un enfant
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredChildren.map((child) => (
            <div
              key={child.id}
              className="relative rounded-3xl p-6 bg-white hover:-translate-y-1 transition-all duration-300 group overflow-hidden cursor-pointer"
              style={{
                border: '1px solid #f4c2c233',
                boxShadow: '0 0 0 0 rgba(244,194,194,0.25)'
              }}
              onClick={() => router.push(`/owner/children/${child.id}`)}
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
                  <div className="flex gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
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
                      title="Supprimer"
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
            onChange={(e) => setFormData({ ...formData, section: e.target.value as SectionCode })}
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
        title="Confirmer la suppression"
        description="Êtes-vous sûr de vouloir supprimer définitivement l'enfant"
        itemName={childToDelete ? `${childToDelete.first_name} ${childToDelete.last_name}` : ''}
        isDeleting={isDeleting}
      />
    </div>
  )
}
