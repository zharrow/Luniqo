'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { childService, type Child } from '@/lib/services/child.service'

interface ChildFormData {
  first_name: string
  last_name: string
  birth_date: string
  gender?: string
  nationality?: string
  birth_place?: string
  social_security_number?: string
  caf_number?: string
  admission_date?: string
  trial_period_end?: string
  preferred_name?: string
  section: string
  allergies?: string
  specific_diet?: string
  notes?: string
}

export default function EditChildPage() {
  const router = useRouter()
  const params = useParams()
  const childId = params.id as string
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery, isLoading: nurseryLoading } = useNursery()

  const [child, setChild] = useState<Child | null>(null)
  const [formData, setFormData] = useState<ChildFormData>({
    first_name: '',
    last_name: '',
    birth_date: '',
    gender: '',
    nationality: 'Française',
    birth_place: '',
    social_security_number: '',
    caf_number: '',
    admission_date: '',
    trial_period_end: '',
    preferred_name: '',
    section: '',
    allergies: '',
    specific_diet: '',
    notes: ''
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)

  useEffect(() => {
    if (childId && selectedNursery?.id) {
      loadChild()
    }
  }, [childId, selectedNursery?.id])

  async function loadChild() {
    try {
      setIsLoadingData(true)
      const data = await childService.getById(childId)

      if (!data) {
        setError('Enfant introuvable')
        return
      }

      setChild(data)
      setFormData({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        birth_date: data.birth_date || '',
        gender: data.gender || '',
        nationality: data.nationality || 'Française',
        birth_place: data.birth_place || '',
        social_security_number: data.social_security_number || '',
        caf_number: data.caf_number || '',
        admission_date: data.admission_date || '',
        trial_period_end: data.trial_period_end || '',
        preferred_name: data.preferred_name || '',
        section: data.section || '',
        allergies: data.allergies || '',
        specific_diet: data.specific_diet || '',
        notes: data.notes || ''
      })
    } catch (err: any) {
      console.error('Error loading child:', err)
      setError(err.message || 'Erreur lors du chargement')
    } finally {
      setIsLoadingData(false)
    }
  }

  function handleChange(field: keyof ChildFormData, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!selectedNursery?.id) {
      setError('Veuillez sélectionner une crèche')
      return
    }

    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      setError('Le prénom et le nom sont obligatoires')
      return
    }

    if (!formData.birth_date) {
      setError('La date de naissance est obligatoire')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      await childService.update(childId, {
        first_name: formData.first_name,
        last_name: formData.last_name,
        birth_date: formData.birth_date,
        gender: formData.gender || undefined,
        nationality: formData.nationality || undefined,
        birth_place: formData.birth_place || undefined,
        social_security_number: formData.social_security_number || undefined,
        caf_number: formData.caf_number || undefined,
        admission_date: formData.admission_date || undefined,
        trial_period_end: formData.trial_period_end || undefined,
        preferred_name: formData.preferred_name || undefined,
        section: formData.section,
        allergies: formData.allergies || undefined,
        specific_diet: formData.specific_diet || undefined,
        notes: formData.notes || undefined
      })

      // Redirection vers la fiche enfant
      router.push(`/owner/children/${childId}`)
    } catch (err: any) {
      console.error('Error updating child:', err)
      setError(err.message || 'Une erreur est survenue lors de la mise à jour')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (authLoading || nurseryLoading || isLoadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5a9dc9]"></div>
      </div>
    )
  }

  if (!child) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-6 bg-red-50 border-red-200">
          <p className="text-sm text-red-800">Enfant introuvable</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push(`/owner/children/${childId}`)}
          className="mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Retour à la fiche enfant
        </Button>

        <h1 className="text-3xl font-bold text-gray-900">Modifier l'enfant</h1>
        <p className="text-gray-500 mt-2">
          Modifiez les informations de {child.first_name} {child.last_name}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Identité */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Identité</h3>
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
                    required
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
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prénom usuel (surnom)
                </label>
                <Input
                  type="text"
                  value={formData.preferred_name}
                  onChange={(e) => handleChange('preferred_name', e.target.value)}
                  placeholder="Mimi"
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
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Genre
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => handleChange('gender', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#5a9dc9] focus:border-[#5a9dc9]"
                  >
                    <option value="">Non spécifié</option>
                    <option value="Fille">Fille</option>
                    <option value="Garçon">Garçon</option>
                    <option value="Autre">Autre</option>
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
                    value={formData.nationality}
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
                    value={formData.birth_place}
                    onChange={(e) => handleChange('birth_place', e.target.value)}
                    placeholder="Paris, France"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Informations administratives */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Informations administratives</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Numéro de sécurité sociale
                  </label>
                  <Input
                    type="text"
                    value={formData.social_security_number}
                    onChange={(e) => handleChange('social_security_number', e.target.value)}
                    placeholder="1 23 45 67 890 123 45"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Numéro CAF
                  </label>
                  <Input
                    type="text"
                    value={formData.caf_number}
                    onChange={(e) => handleChange('caf_number', e.target.value)}
                    placeholder="123456789"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date d'admission
                  </label>
                  <Input
                    type="date"
                    value={formData.admission_date}
                    onChange={(e) => handleChange('admission_date', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fin de la période d'adaptation
                  </label>
                  <Input
                    type="date"
                    value={formData.trial_period_end}
                    onChange={(e) => handleChange('trial_period_end', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Section
                </label>
                <select
                  value={formData.section}
                  onChange={(e) => handleChange('section', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#5a9dc9] focus:border-[#5a9dc9]"
                >
                  <option value="">Sélectionnez...</option>
                  <option value="Bébés">Bébés</option>
                  <option value="Moyens">Moyens</option>
                  <option value="Grands">Grands</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Santé */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Informations de santé</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Allergies
                </label>
                <textarea
                  value={formData.allergies}
                  onChange={(e) => handleChange('allergies', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#5a9dc9] focus:border-[#5a9dc9]"
                  placeholder="Lait de vache, arachides..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Régime alimentaire spécifique
                </label>
                <textarea
                  value={formData.specific_diet}
                  onChange={(e) => handleChange('specific_diet', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#5a9dc9] focus:border-[#5a9dc9]"
                  placeholder="Végétarien, sans gluten..."
                />
              </div>
            </div>
          </Card>

          {/* Notes */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Notes</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes internes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#5a9dc9] focus:border-[#5a9dc9]"
                placeholder="Informations complémentaires..."
              />
            </div>
          </Card>

          {/* Error Message */}
          {error && (
            <Card className="p-4 bg-red-50 border-red-200">
              <p className="text-sm text-red-800">{error}</p>
            </Card>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/owner/children/${childId}`)}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#f4c2c2] hover:bg-[#e8b0b0] text-gray-900"
            >
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
