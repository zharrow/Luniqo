'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { childService } from '@/lib/services/child.service'
import { familyService, type Family as FamilyType } from '@/lib/services/family.service'
import { sectionService } from '@/lib/services/section.service'
import { guardianService } from '@/lib/services/guardian.service'
import {
  allergiesDietaryService,
  type Allergy,
  type DietaryRequirement
} from '@/lib/services/allergies-dietary.service'

interface ChildFormData {
  // Famille
  family_id?: string
  new_family?: {
    family_name: string
    caf_number?: string
  }

  // Identité
  first_name: string
  last_name: string
  preferred_name?: string
  birth_date: string
  gender?: string
  nationality?: string
  birth_place?: string
  social_security_number?: string
  caf_number?: string

  // Section et dates
  section_id?: string
  admission_date?: string
  adaptation_end_date?: string

  // Tuteur principal
  guardian?: {
    first_name: string
    last_name: string
    relation_type: string
    phone_primary?: string
    email?: string
    can_pickup: boolean
  }

  // Santé basique
  allergies?: Array<{
    allergen_name: string
    severity: string
  }>
  diets?: Array<{
    diet_type: string
    diet_name: string
  }>
  notes?: string
}

const STEPS = [
  { id: 1, name: 'Famille', description: 'Choix ou création' },
  { id: 2, name: 'Identité', description: 'Informations de l\'enfant' },
  { id: 3, name: 'Section', description: 'Affectation et dates' },
  { id: 4, name: 'Tuteur', description: 'Contact principal' },
  { id: 5, name: 'Santé', description: 'Informations de base' },
  { id: 6, name: 'Résumé', description: 'Validation' }
]

const RELATION_TYPES = ['mother', 'father', 'legal_guardian', 'other']

export default function NewChildPage() {
  const router = useRouter()
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery, isLoading: nurseryLoading } = useNursery()

  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<ChildFormData>({
    first_name: '',
    last_name: '',
    birth_date: '',
    new_family: { family_name: '' },
    guardian: {
      first_name: '',
      last_name: '',
      relation_type: 'mother',
      can_pickup: true
    },
    allergies: [],
    diets: []
  })

  const [families, setFamilies] = useState<FamilyType[]>([])
  const [sections, setSections] = useState<any[]>([])
  const [useExistingFamily, setUseExistingFamily] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Allergies & Dietary requirements (new checkbox system)
  const [allAllergies, setAllAllergies] = useState<Allergy[]>([])
  const [allDietaryRequirements, setAllDietaryRequirements] = useState<DietaryRequirement[]>([])
  const [selectedAllergyIds, setSelectedAllergyIds] = useState<string[]>([])
  const [selectedDietaryIds, setSelectedDietaryIds] = useState<string[]>([])

  useEffect(() => {
    if (authLoading || nurseryLoading || !selectedNursery?.id) return
    loadData()
  }, [authLoading, nurseryLoading, selectedNursery?.id])

  async function loadData() {
    if (!selectedNursery?.id) return

    try {
      const [familiesData, sectionsData, allergiesData, dietaryData] = await Promise.all([
        familyService.getAll(selectedNursery.id),
        sectionService.getByNursery(selectedNursery.id),
        allergiesDietaryService.getAllAllergies(),
        allergiesDietaryService.getAllDietaryRequirements()
      ])

      setFamilies(familiesData)
      setSections(sectionsData)
      setAllAllergies(allergiesData)
      setAllDietaryRequirements(dietaryData)
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  function handleChange(field: keyof ChildFormData, value: any) {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  function handleNestedChange(parent: keyof ChildFormData, field: string, value: any) {
    setFormData(prev => ({
      ...prev,
      [parent]: { ...(prev[parent] as any), [field]: value }
    }))
  }

  function validateStep(step: number): boolean {
    setError(null)

    switch (step) {
      case 1:
        if (useExistingFamily && !formData.family_id) {
          setError('Veuillez sélectionner une famille')
          return false
        }
        if (!useExistingFamily && !formData.new_family?.family_name) {
          setError('Veuillez entrer le nom de la famille')
          return false
        }
        break
      case 2:
        if (!formData.first_name || !formData.last_name || !formData.birth_date) {
          setError('Prénom, nom et date de naissance sont obligatoires')
          return false
        }
        break
      case 3:
        if (!formData.section_id) {
          setError('Veuillez sélectionner une section')
          return false
        }
        break
    }

    return true
  }

  function nextStep() {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length))
    }
  }

  function prevStep() {
    setCurrentStep(prev => Math.max(prev - 1, 1))
    setError(null)
  }

  async function handleSubmit() {
    if (!selectedNursery?.id) {
      setError('Veuillez sélectionner une crèche')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      let finalFamilyId = formData.family_id

      // Créer la famille si nécessaire
      if (!useExistingFamily && formData.new_family?.family_name && session?.user?.id) {
        const newFamily = await familyService.create(
          selectedNursery.id,
          session.user.id,
          {
            family_name: formData.new_family.family_name,
            caf_number: formData.new_family.caf_number || undefined
          }
        )
        finalFamilyId = newFamily.id
      }

      // Créer l'enfant
      // Note: Le champ 'section' est un enum legacy ('Babies', 'Toddlers', 'Preschoolers')
      // On utilise 'Babies' par défaut, la vraie affectation se fait via child_section (M2M)
      const newChild = await childService.create(
        selectedNursery.id,
        {
          family_id: finalFamilyId || undefined,
          first_name: formData.first_name,
          last_name: formData.last_name,
          preferred_name: formData.preferred_name || undefined,
          birth_date: formData.birth_date,
          gender: formData.gender || undefined,
          nationality: formData.nationality || undefined,
          birth_place: formData.birth_place || undefined,
          social_security_number: formData.social_security_number || undefined,
          caf_number: formData.caf_number || undefined,
          admission_date: formData.admission_date || undefined,
          notes: formData.notes || undefined,
          section: 'Babies' // Legacy enum field - actual section via child_section M2M
        }
      )

      // Affecter à la section
      if (formData.section_id && session?.user?.id) {
        await sectionService.assignChild(
          newChild.id,
          formData.section_id,
          formData.admission_date || new Date().toISOString().split('T')[0],
          session.user.id
        )
      }

      // Créer le tuteur principal si renseigné
      if (formData.guardian?.first_name && formData.guardian?.last_name && finalFamilyId) {
        const guardian = await guardianService.create(
          finalFamilyId,
          {
            first_name: formData.guardian.first_name,
            last_name: formData.guardian.last_name,
            legal_responsibility: formData.guardian.relation_type,
            relationship_to_child: formData.guardian.relation_type,
            phone_primary: formData.guardian.phone_primary || undefined,
            email: formData.guardian.email || undefined,
            can_pick_up: formData.guardian.can_pickup
          }
        )

        // Lier le tuteur à l'enfant
        await guardianService.linkToChild(guardian.id, newChild.id, {
          is_primary_contact: true
        })
      }

      // Ajouter les allergies et régimes alimentaires (nouveau système M2M)
      await Promise.all([
        allergiesDietaryService.setChildAllergies(newChild.id, selectedAllergyIds),
        allergiesDietaryService.setChildDietaryRequirements(newChild.id, selectedDietaryIds)
      ])

      // Redirection vers la fiche enfant
      router.push(`/owner/children/${newChild.id}`)
    } catch (err: any) {
      console.error('Error creating child:', err)
      setError(err.message || 'Une erreur est survenue lors de la création')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (authLoading || nurseryLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5a9dc9]"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/owner/children')}
          className="mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Retour à la liste
        </Button>

        <h1 className="text-3xl font-bold text-gray-900">Nouvel enfant</h1>
        <p className="text-gray-500 mt-2">Créez un dossier enfant complet</p>
      </div>

      {/* Stepper */}
      <Card className="p-6 mb-8">
        <nav aria-label="Progress">
          <ol className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <li key={step.id} className="relative flex-1">
                <div className="flex items-center">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className={`w-10 h-10 flex items-center justify-center rounded-full ${
                      currentStep > step.id
                        ? 'bg-[#b5ead7]'
                        : currentStep === step.id
                        ? 'bg-[#5a9dc9] text-white'
                        : 'bg-gray-200'
                    }`}>
                      {currentStep > step.id ? (
                        <CheckIcon className="h-5 w-5 text-gray-900" />
                      ) : (
                        <span className={currentStep === step.id ? 'text-white' : 'text-gray-500'}>
                          {step.id}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-center">
                      <div className={`text-sm font-medium ${
                        currentStep >= step.id ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {step.name}
                      </div>
                      <div className="text-xs text-gray-500 hidden md:block">
                        {step.description}
                      </div>
                    </div>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-4 ${
                      currentStep > step.id ? 'bg-[#b5ead7]' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              </li>
            ))}
          </ol>
        </nav>
      </Card>

      {/* Step Content */}
      <div className="space-y-6">
        {/* Step 1: Famille */}
        {currentStep === 1 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Choix de la famille</h3>

            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={() => setUseExistingFamily(true)}
                  className={`flex-1 p-4 rounded-lg border-2 text-left transition-all ${
                    useExistingFamily
                      ? 'border-[#5a9dc9] bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900">Famille existante</div>
                  <div className="text-sm text-gray-500 mt-1">Rattacher à une famille existante</div>
                </button>

                <button
                  type="button"
                  onClick={() => setUseExistingFamily(false)}
                  className={`flex-1 p-4 rounded-lg border-2 text-left transition-all ${
                    !useExistingFamily
                      ? 'border-[#5a9dc9] bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900">Nouvelle famille</div>
                  <div className="text-sm text-gray-500 mt-1">Créer une nouvelle famille</div>
                </button>
              </div>

              {useExistingFamily ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sélectionner une famille
                  </label>
                  {families.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>Aucune famille trouvée</p>
                      <Button
                        variant="link"
                        onClick={() => setUseExistingFamily(false)}
                        className="mt-2"
                      >
                        Créer une nouvelle famille
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {families.map((family) => (
                        <button
                          key={family.id}
                          type="button"
                          onClick={() => handleChange('family_id', family.id)}
                          className={`p-4 rounded-lg border-2 text-left transition-all ${
                            formData.family_id === family.id
                              ? 'border-[#5a9dc9] bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="font-medium text-gray-900">{family.family_name}</div>
                          {family.caf_number && (
                            <div className="text-sm text-gray-500 mt-1">CAF: {family.caf_number}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom de famille <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={formData.new_family?.family_name || ''}
                      onChange={(e) => handleNestedChange('new_family', 'family_name', e.target.value)}
                      placeholder="Famille Dupont"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Numéro CAF
                    </label>
                    <Input
                      type="text"
                      value={formData.new_family?.caf_number || ''}
                      onChange={(e) => handleNestedChange('new_family', 'caf_number', e.target.value)}
                      placeholder="123456789"
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Step 2: Identité */}
        {currentStep === 2 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Identité de l'enfant</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prénom <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => handleChange('first_name', e.target.value)}
                    placeholder="Marie"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => handleChange('last_name', e.target.value)}
                    placeholder="Dupont"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prénom usuel / Surnom
                </label>
                <Input
                  type="text"
                  value={formData.preferred_name || ''}
                  onChange={(e) => handleChange('preferred_name', e.target.value)}
                  placeholder="Optionnel"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de naissance <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => handleChange('birth_date', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Genre
                  </label>
                  <select
                    value={formData.gender || ''}
                    onChange={(e) => handleChange('gender', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#5a9dc9] focus:border-[#5a9dc9]"
                  >
                    <option value="">Non spécifié</option>
                    <option value="male">Garçon</option>
                    <option value="female">Fille</option>
                    <option value="other">Autre</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nationalité
                  </label>
                  <Input
                    type="text"
                    value={formData.nationality || ''}
                    onChange={(e) => handleChange('nationality', e.target.value)}
                    placeholder="Française"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lieu de naissance
                  </label>
                  <Input
                    type="text"
                    value={formData.birth_place || ''}
                    onChange={(e) => handleChange('birth_place', e.target.value)}
                    placeholder="Paris"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Numéro de sécurité sociale
                  </label>
                  <Input
                    type="text"
                    value={formData.social_security_number || ''}
                    onChange={(e) => handleChange('social_security_number', e.target.value)}
                    placeholder="1 23 45 67 890 123"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Numéro CAF
                  </label>
                  <Input
                    type="text"
                    value={formData.caf_number || ''}
                    onChange={(e) => handleChange('caf_number', e.target.value)}
                    placeholder="123456789"
                  />
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Step 3: Section */}
        {currentStep === 3 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Section et dates</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Affecter à une section <span className="text-red-500">*</span>
                </label>
                {sections.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>Aucune section trouvée</p>
                    <Button
                      variant="link"
                      onClick={() => window.open('/owner/sections/new', '_blank')}
                      className="mt-2"
                    >
                      Créer une section
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {sections.map((section) => (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => handleChange('section_id', section.id)}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          formData.section_id === section.id
                            ? 'border-[#5a9dc9] ring-2 ring-[#5a9dc9] ring-offset-2'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        style={{
                          backgroundColor: formData.section_id === section.id
                            ? `${section.color_hex || '#e5e7eb'}20`
                            : 'transparent'
                        }}
                      >
                        <div className="font-medium text-gray-900">{section.name}</div>
                        {(section.age_min_months !== null || section.age_max_months !== null) && (
                          <div className="text-sm text-gray-500 mt-1">
                            {section.age_min_months || 0}-{section.age_max_months || 36} mois
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date d'admission
                  </label>
                  <Input
                    type="date"
                    value={formData.admission_date || ''}
                    onChange={(e) => handleChange('admission_date', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de fin d'adaptation
                  </label>
                  <Input
                    type="date"
                    value={formData.adaptation_end_date || ''}
                    onChange={(e) => handleChange('adaptation_end_date', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Step 4: Tuteur principal */}
        {currentStep === 4 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Tuteur principal (optionnel)</h3>
            <p className="text-sm text-gray-500 mb-4">
              Vous pourrez ajouter d'autres tuteurs plus tard depuis la fiche enfant
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prénom
                  </label>
                  <Input
                    type="text"
                    value={formData.guardian?.first_name || ''}
                    onChange={(e) => handleNestedChange('guardian', 'first_name', e.target.value)}
                    placeholder="Sophie"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom
                  </label>
                  <Input
                    type="text"
                    value={formData.guardian?.last_name || ''}
                    onChange={(e) => handleNestedChange('guardian', 'last_name', e.target.value)}
                    placeholder="Dupont"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lien de parenté
                </label>
                <select
                  value={formData.guardian?.relation_type || 'mother'}
                  onChange={(e) => handleNestedChange('guardian', 'relation_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#5a9dc9] focus:border-[#5a9dc9]"
                >
                  <option value="mother">Mère</option>
                  <option value="father">Père</option>
                  <option value="legal_guardian">Tuteur légal</option>
                  <option value="other">Autre</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Téléphone
                  </label>
                  <Input
                    type="tel"
                    value={formData.guardian?.phone_primary || ''}
                    onChange={(e) => handleNestedChange('guardian', 'phone_primary', e.target.value)}
                    placeholder="06 12 34 56 78"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={formData.guardian?.email || ''}
                    onChange={(e) => handleNestedChange('guardian', 'email', e.target.value)}
                    placeholder="sophie.dupont@example.com"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="can_pickup"
                  checked={formData.guardian?.can_pickup || false}
                  onChange={(e) => handleNestedChange('guardian', 'can_pickup', e.target.checked)}
                  className="rounded border-gray-300 text-[#5a9dc9] focus:ring-[#5a9dc9]"
                />
                <label htmlFor="can_pickup" className="text-sm text-gray-700">
                  Autorisé à récupérer l'enfant
                </label>
              </div>
            </div>
          </Card>
        )}

        {/* Step 5: Santé basique */}
        {currentStep === 5 && (
          <div className="space-y-6">
            {/* Allergies checkboxes */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                Allergies
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Selectionnez les allergies connues de l'enfant
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 rounded-lg border border-red-200 bg-red-50/50 max-h-64 overflow-y-auto">
                {allAllergies.map((allergy) => (
                  <label
                    key={allergy.id}
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                      selectedAllergyIds.includes(allergy.id)
                        ? 'bg-red-100 border border-red-300'
                        : 'bg-white border border-transparent hover:bg-red-50'
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
                      className="w-4 h-4 rounded border-red-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm">
                      {allergy.icon} {allergy.name}
                    </span>
                    {allergy.severity === 'severe' && (
                      <span className="text-xs text-red-600 font-medium">!</span>
                    )}
                  </label>
                ))}
              </div>
              {selectedAllergyIds.length > 0 && (
                <p className="text-xs text-red-600 mt-2 font-medium">
                  {selectedAllergyIds.length} allergie{selectedAllergyIds.length > 1 ? 's' : ''} selectionnee{selectedAllergyIds.length > 1 ? 's' : ''}
                </p>
              )}
            </Card>

            {/* Dietary requirements checkboxes */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Regimes alimentaires</h3>
              <p className="text-sm text-gray-500 mb-4">
                Selectionnez les regimes alimentaires applicables
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50/50 max-h-64 overflow-y-auto">
                {allDietaryRequirements.map((diet) => (
                  <label
                    key={diet.id}
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                      selectedDietaryIds.includes(diet.id)
                        ? 'bg-amber-100 border border-amber-300'
                        : 'bg-white border border-transparent hover:bg-amber-50'
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
                      className="w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-sm">
                      {diet.icon} {diet.name}
                    </span>
                  </label>
                ))}
              </div>
              {selectedDietaryIds.length > 0 && (
                <p className="text-xs text-amber-700 mt-2">
                  {selectedDietaryIds.length} regime{selectedDietaryIds.length > 1 ? 's' : ''} selectionne{selectedDietaryIds.length > 1 ? 's' : ''}
                </p>
              )}
            </Card>

            {/* Notes */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Notes importantes</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes de sante ou observations
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#5a9dc9] focus:border-[#5a9dc9]"
                  placeholder="Informations importantes a connaitre sur l'enfant..."
                />
              </div>
            </Card>
          </div>
        )}

        {/* Step 6: Résumé */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Récapitulatif</h3>

              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Famille</h4>
                  <p className="text-gray-700">
                    {useExistingFamily
                      ? families.find(f => f.id === formData.family_id)?.family_name || 'Non renseignée'
                      : formData.new_family?.family_name || 'Non renseignée'}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Enfant</h4>
                  <dl className="space-y-1">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Nom complet:</dt>
                      <dd className="text-gray-900">{formData.first_name} {formData.last_name}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Date de naissance:</dt>
                      <dd className="text-gray-900">{formData.birth_date}</dd>
                    </div>
                    {formData.gender && (
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Genre:</dt>
                        <dd className="text-gray-900 capitalize">{formData.gender}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Section</h4>
                  <p className="text-gray-700">
                    {sections.find(s => s.id === formData.section_id)?.section_name || 'Non renseignée'}
                  </p>
                </div>

                {formData.guardian?.first_name && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Tuteur principal</h4>
                    <dl className="space-y-1">
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Nom:</dt>
                        <dd className="text-gray-900">{formData.guardian.first_name} {formData.guardian.last_name}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Relation:</dt>
                        <dd className="text-gray-900 capitalize">{formData.guardian.relation_type}</dd>
                      </div>
                      {formData.guardian.phone_primary && (
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Téléphone:</dt>
                          <dd className="text-gray-900">{formData.guardian.phone_primary}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                )}

                {selectedAllergyIds.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Allergies</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedAllergyIds.map((id) => {
                        const allergy = allAllergies.find(a => a.id === id)
                        return allergy ? (
                          <Badge key={id} variant="danger">
                            {allergy.icon} {allergy.name}
                          </Badge>
                        ) : null
                      })}
                    </div>
                  </div>
                )}

                {selectedDietaryIds.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Regimes alimentaires</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedDietaryIds.map((id) => {
                        const diet = allDietaryRequirements.find(d => d.id === id)
                        return diet ? (
                          <Badge key={id} variant="warning">
                            {diet.icon} {diet.name}
                          </Badge>
                        ) : null
                      })}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <Card className="p-4 bg-red-50 border-red-200">
            <p className="text-sm text-red-800">{error}</p>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1 || isSubmitting}
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Précédent
          </Button>

          {currentStep < STEPS.length ? (
            <Button
              type="button"
              onClick={nextStep}
              className="bg-[#5a9dc9] hover:bg-[#4a8db9] text-white"
            >
              Suivant
              <ArrowRightIcon className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-[#f4c2c2] hover:bg-[#e4b2b2] text-gray-900"
            >
              {isSubmitting ? 'Création...' : 'Créer l\'enfant'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
