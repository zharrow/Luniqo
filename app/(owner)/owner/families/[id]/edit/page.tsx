'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { familyService, type Family } from '@/lib/services/family.service'

interface FamilyFormData {
  family_name: string
  address?: string
  city?: string
  postal_code?: string
  caf_number?: string
  family_situation?: string
  annual_income_bracket?: string
  notes?: string
}

export default function EditFamilyPage() {
  const router = useRouter()
  const params = useParams()
  const familyId = params.id as string
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery, isLoading: nurseryLoading } = useNursery()

  const [family, setFamily] = useState<Family | null>(null)
  const [formData, setFormData] = useState<FamilyFormData>({
    family_name: '',
    address: '',
    city: '',
    postal_code: '',
    caf_number: '',
    family_situation: 'married',
    annual_income_bracket: '',
    notes: ''
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)

  useEffect(() => {
    if (familyId && selectedNursery?.id) {
      loadFamily()
    }
  }, [familyId, selectedNursery?.id])

  async function loadFamily() {
    try {
      setIsLoadingData(true)
      const data = await familyService.getById(familyId)

      if (!data) {
        setError('Famille introuvable')
        return
      }

      setFamily(data)
      setFormData({
        family_name: data.family_name || '',
        address: data.address || '',
        city: data.city || '',
        postal_code: data.postal_code || '',
        caf_number: data.caf_number || '',
        family_situation: data.family_situation || 'married',
        annual_income_bracket: '',
        notes: ''
      })
    } catch (err: any) {
      console.error('Error loading family:', err)
      setError(err.message || 'Erreur lors du chargement')
    } finally {
      setIsLoadingData(false)
    }
  }

  function handleChange(field: keyof FamilyFormData, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!selectedNursery?.id) {
      setError('Veuillez sélectionner une crèche')
      return
    }

    if (!formData.family_name.trim()) {
      setError('Le nom de famille est obligatoire')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      await familyService.update(familyId, {
        family_name: formData.family_name,
        address: formData.address || undefined,
        city: formData.city || undefined,
        postal_code: formData.postal_code || undefined,
        caf_number: formData.caf_number || undefined,
        family_situation: formData.family_situation || undefined
      })

      // Redirection vers la fiche famille
      router.push(`/owner/families/${familyId}`)
    } catch (err: any) {
      console.error('Error updating family:', err)
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

  if (!family) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-6 bg-red-50 border-red-200">
          <p className="text-sm text-red-800">Famille introuvable</p>
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
          onClick={() => router.push(`/owner/families/${familyId}`)}
          className="mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Retour à la fiche famille
        </Button>

        <h1 className="text-3xl font-bold text-gray-900">Modifier la famille</h1>
        <p className="text-gray-500 mt-2">Modifiez les informations de la famille {family.family_name}</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Informations générales */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Informations générales</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de famille <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.family_name}
                  onChange={(e) => handleChange('family_name', e.target.value)}
                  placeholder="Famille Dupont"
                  required
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Situation familiale
                </label>
                <select
                  value={formData.family_situation}
                  onChange={(e) => handleChange('family_situation', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#5a9dc9] focus:border-[#5a9dc9]"
                >
                  <option value="married">Marié(s)</option>
                  <option value="single_parent">Parent seul</option>
                  <option value="divorced">Divorcé(s)</option>
                  <option value="separated">Séparé(s)</option>
                  <option value="cohabiting">En concubinage</option>
                  <option value="pacs">Pacsé(s)</option>
                  <option value="widowed">Veuf/Veuve</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tranche de revenus annuels
                </label>
                <select
                  value={formData.annual_income_bracket}
                  onChange={(e) => handleChange('annual_income_bracket', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#5a9dc9] focus:border-[#5a9dc9]"
                >
                  <option value="">Sélectionnez...</option>
                  <option value="0-20000">Moins de 20 000 €</option>
                  <option value="20000-35000">20 000 € - 35 000 €</option>
                  <option value="35000-50000">35 000 € - 50 000 €</option>
                  <option value="50000-75000">50 000 € - 75 000 €</option>
                  <option value="75000-100000">75 000 € - 100 000 €</option>
                  <option value="100000+">Plus de 100 000 €</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Coordonnées */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Coordonnées</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse
                </label>
                <Input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="12 rue de la Paix"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code postal
                  </label>
                  <Input
                    type="text"
                    value={formData.postal_code}
                    onChange={(e) => handleChange('postal_code', e.target.value)}
                    placeholder="75001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ville
                  </label>
                  <Input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="Paris"
                  />
                </div>
              </div>
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
              onClick={() => router.push(`/owner/families/${familyId}`)}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#ffe5b4] hover:bg-[#ffd89b] text-gray-900"
            >
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
