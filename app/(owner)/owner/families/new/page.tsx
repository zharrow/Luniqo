'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { familyService } from '@/lib/services/family.service'

interface FamilyFormData {
  family_name: string
  address?: string
  city?: string
  postal_code?: string
  phone_primary?: string
  phone_secondary?: string
  email?: string
  caf_number?: string
  family_situation?: string
  annual_income_bracket?: string
  notes?: string
}

export default function NewFamilyPage() {
  const router = useRouter()
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery, isLoading: nurseryLoading } = useNursery()

  const [formData, setFormData] = useState<FamilyFormData>({
    family_name: '',
    address: '',
    city: '',
    postal_code: '',
    phone_primary: '',
    phone_secondary: '',
    email: '',
    caf_number: '',
    family_situation: 'married',
    annual_income_bracket: '',
    notes: ''
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

    if (!session?.user?.id) {
      setError('Session invalide')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      const newFamily = await familyService.create(
        selectedNursery.id,
        session.user.id,
        {
          family_name: formData.family_name,
          address: formData.address || undefined,
          city: formData.city || undefined,
          postal_code: formData.postal_code || undefined,
          caf_number: formData.caf_number || undefined,
          family_situation: formData.family_situation || undefined
        }
      )

      // Redirection vers la fiche famille
      router.push(`/owner/families/${newFamily.id}`)
    } catch (err: any) {
      console.error('Error creating family:', err)
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/owner/families')}
          className="mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Retour à la liste
        </Button>

        <h1 className="text-3xl font-bold text-gray-900">Nouvelle famille</h1>
        <p className="text-gray-500 mt-2">Créez un dossier famille</p>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Téléphone principal
                  </label>
                  <Input
                    type="tel"
                    value={formData.phone_primary}
                    onChange={(e) => handleChange('phone_primary', e.target.value)}
                    placeholder="06 12 34 56 78"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Téléphone secondaire
                  </label>
                  <Input
                    type="tel"
                    value={formData.phone_secondary}
                    onChange={(e) => handleChange('phone_secondary', e.target.value)}
                    placeholder="01 23 45 67 89"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="famille.dupont@example.com"
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
                placeholder="Notes confidentielles visibles uniquement par le personnel..."
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
              onClick={() => router.push('/owner/families')}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#ffe5b4] hover:bg-[#ffd89b] text-gray-900"
            >
              {isSubmitting ? 'Création...' : 'Créer la famille'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
