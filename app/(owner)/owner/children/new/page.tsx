'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { childService } from '@/lib/services/child.service'
import { familyService, type Family as FamilyType } from '@/lib/services/family.service'
import { sectionService, type Section as SectionType } from '@/lib/services/section.service'
import { guardianService } from '@/lib/services/guardian.service'

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
const SEVERITIES = ['mild', 'moderate', 'severe', 'critical']
const DIET_TYPES = ['vegetarian', 'vegan', 'halal', 'kosher', 'gluten_free', 'lactose_free', 'texture_modified', 'other']

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

  useEffect(() => {
    if (authLoading || nurseryLoading || !selectedNursery?.id) return
    loadData()
  }, [authLoading, nurseryLoading, selectedNursery?.id])

  async function loadData() {
    if (!selectedNursery?.id) return

    try {
      const [familiesData, sectionsData] = await Promise.all([
        familyService.getAll(selectedNursery.id),
        sectionService.getByNursery(selectedNursery.id)
      ])

      setFamilies(familiesData)
      setSections(sectionsData)
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

  function addAllergy() {
    setFormData(prev => ({
      ...prev,
      allergies: [...(prev.allergies || []), { allergen_name: '', severity: 'moderate' }]
    }))
  }

  function updateAllergy(index: number, field: string, value: string) {
    setFormData(prev => ({
      ...prev,
      allergies: prev.allergies?.map((a, i) => i === index ? { ...a, [field]: value } : a) || []
    }))
  }

  function removeAllergy(index: number) {
    setFormData(prev => ({
      ...prev,
      allergies: prev.allergies?.filter((_, i) => i !== index) || []
    }))
  }

  function addDiet() {
    setFormData(prev => ({
      ...prev,
      diets: [...(prev.diets || []), { diet_type: 'vegetarian', diet_name: '' }]
    }))
  }

  function updateDiet(index: number, field: string, value: string) {
    setFormData(prev => ({
      ...prev,
      diets: prev.diets?.map((d, i) => i === index ? { ...d, [field]: value } : d) || []
    }))
  }

  function removeDiet(index: number) {
    setFormData(prev => ({
      ...prev,
      diets: prev.diets?.filter((_, i) => i !== index) || []
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
          section: formData.section_id || ''
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

      // Ajouter les allergies
      if (formData.allergies && formData.allergies.length > 0) {
        for (const allergy of formData.allergies) {
          if (allergy.allergen_name) {
            await childService.addAllergy(newChild.id, {
              allergy_type: 'food',
              allergen_name: allergy.allergen_name,
              severity: allergy.severity
            })
          }
        }
      }

      // Ajouter les régimes
      if (formData.diets && formData.diets.length > 0) {
        for (const diet of formData.diets) {
          if (diet.diet_name) {
            await childService.addDiet(newChild.id, {
              diet_type: diet.diet_type,
              diet_name: diet.diet_name,
              start_date: new Date().toISOString().split('T')[0]
            })
          }
        }
      }

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
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Allergies</h3>
                <Button type="button" size="sm" onClick={addAllergy}>
                  Ajouter une allergie
                </Button>
              </div>

              {formData.allergies && formData.allergies.length > 0 ? (
                <div className="space-y-3">
                  {formData.allergies.map((allergy, index) => (
                    <div key={index} className="flex items-end space-x-3">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Allergène
                        </label>
                        <Input
                          type="text"
                          value={allergy.allergen_name}
                          onChange={(e) => updateAllergy(index, 'allergen_name', e.target.value)}
                          placeholder="Arachides, lait, etc."
                        />
                      </div>
                      <div className="w-40">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Sévérité
                        </label>
                        <select
                          value={allergy.severity}
                          onChange={(e) => updateAllergy(index, 'severity', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#5a9dc9] focus:border-[#5a9dc9]"
                        >
                          <option value="mild">Légère</option>
                          <option value="moderate">Modérée</option>
                          <option value="severe">Sévère</option>
                          <option value="critical">Critique</option>
                        </select>
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeAllergy(index)}
                      >
                        Retirer
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Aucune allergie connue</p>
              )}
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Régimes alimentaires</h3>
                <Button type="button" size="sm" onClick={addDiet}>
                  Ajouter un régime
                </Button>
              </div>

              {formData.diets && formData.diets.length > 0 ? (
                <div className="space-y-3">
                  {formData.diets.map((diet, index) => (
                    <div key={index} className="flex items-end space-x-3">
                      <div className="w-48">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Type de régime
                        </label>
                        <select
                          value={diet.diet_type}
                          onChange={(e) => updateDiet(index, 'diet_type', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#5a9dc9] focus:border-[#5a9dc9]"
                        >
                          <option value="vegetarian">Végétarien</option>
                          <option value="vegan">Vegan</option>
                          <option value="halal">Halal</option>
                          <option value="kosher">Casher</option>
                          <option value="gluten_free">Sans gluten</option>
                          <option value="lactose_free">Sans lactose</option>
                          <option value="texture_modified">Textures modifiées</option>
                          <option value="other">Autre</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <Input
                          type="text"
                          value={diet.diet_name}
                          onChange={(e) => updateDiet(index, 'diet_name', e.target.value)}
                          placeholder="Précisions sur le régime"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeDiet(index)}
                      >
                        Retirer
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Aucun régime alimentaire spécifique</p>
              )}
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Notes importantes</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes de santé ou observations
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#5a9dc9] focus:border-[#5a9dc9]"
                  placeholder="Informations importantes à connaître sur l'enfant..."
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

                {formData.allergies && formData.allergies.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Allergies</h4>
                    <div className="flex flex-wrap gap-2">
                      {formData.allergies.map((allergy, index) => (
                        allergy.allergen_name && (
                          <Badge key={index} variant="danger">
                            {allergy.allergen_name} ({allergy.severity})
                          </Badge>
                        )
                      ))}
                    </div>
                  </div>
                )}

                {formData.diets && formData.diets.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Régimes alimentaires</h4>
                    <div className="flex flex-wrap gap-2">
                      {formData.diets.map((diet, index) => (
                        diet.diet_name && (
                          <Badge key={index} variant="default">
                            {diet.diet_name}
                          </Badge>
                        )
                      ))}
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
