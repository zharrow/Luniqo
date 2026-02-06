'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import {
  applicationService,
  type CreateApplicationInput
} from '@/lib/services/application.service'
import { ArrowLeftIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'

export default function NewApplicationPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery } = useNursery()
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    child_first_name: '',
    child_last_name: '',
    child_birth_date: '',
    child_gender: '',
    parent1_first_name: '',
    parent1_last_name: '',
    parent1_email: '',
    parent1_phone: '',
    parent2_first_name: '',
    parent2_last_name: '',
    parent2_email: '',
    parent2_phone: '',
    address: '',
    postal_code: '',
    city: '',
    desired_start_date: '',
    desired_contract_type: '',
    desired_schedule: '',
    motivation_letter: '',
    special_needs: '',
    notes: ''
  })

  function handleChange(field: string, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedNursery?.id) return

    setLoading(true)
    setError(null)

    try {
      const input: CreateApplicationInput = {
        nursery_id: selectedNursery.id,
        child_first_name: formData.child_first_name,
        child_last_name: formData.child_last_name,
        child_birth_date: formData.child_birth_date,
        child_gender: formData.child_gender || undefined,
        parent1_first_name: formData.parent1_first_name,
        parent1_last_name: formData.parent1_last_name,
        parent1_email: formData.parent1_email,
        parent1_phone: formData.parent1_phone,
        parent2_first_name: formData.parent2_first_name || undefined,
        parent2_last_name: formData.parent2_last_name || undefined,
        parent2_email: formData.parent2_email || undefined,
        parent2_phone: formData.parent2_phone || undefined,
        address: formData.address || undefined,
        postal_code: formData.postal_code || undefined,
        city: formData.city || undefined,
        desired_start_date: formData.desired_start_date,
        desired_contract_type: formData.desired_contract_type || undefined,
        desired_schedule: formData.desired_schedule || undefined,
        motivation_letter: formData.motivation_letter || undefined,
        special_needs: formData.special_needs || undefined,
        notes: formData.notes || undefined
      }

      const application = await applicationService.create(input)
      router.push(`/owner/applications/${application.id}`)
    } catch (err) {
      console.error('Error creating application:', err)
      setError('Erreur lors de la création de la demande. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f4a5a5] mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!selectedNursery) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Aucune crèche sélectionnée</h2>
          <p className="text-gray-600">Veuillez sélectionner une crèche.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <PageBreadcrumb
        items={[
          { label: 'Tableau de bord', href: '/owner/dashboard' },
          { label: 'Inscriptions', href: '/owner/applications' },
          { label: 'Nouvelle demande', href: '/owner/applications/new' }
        ]}
      />

      {/* Header */}
      <div className="flex items-center gap-4 mb-6 mt-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="p-2"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nouvelle Demande d'Inscription</h1>
          <p className="text-gray-600 mt-1">
            Créer une nouvelle demande de pré-inscription pour {selectedNursery.name}
          </p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <Card className="p-4 mb-6 bg-red-50 border-red-200">
          <p className="text-red-800">{error}</p>
        </Card>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Child Information */}
        <Card className="p-6 border-l-4 border-l-[#f4a5a5]">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Informations de l'Enfant</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prénom <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                required
                value={formData.child_first_name}
                onChange={(e) => handleChange('child_first_name', e.target.value)}
                placeholder="Prénom de l'enfant"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                required
                value={formData.child_last_name}
                onChange={(e) => handleChange('child_last_name', e.target.value)}
                placeholder="Nom de l'enfant"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de naissance <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                required
                value={formData.child_birth_date}
                onChange={(e) => handleChange('child_birth_date', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sexe</label>
              <select
                value={formData.child_gender}
                onChange={(e) => handleChange('child_gender', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Non spécifié</option>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Parent 1 Information */}
        <Card className="p-6 border-l-4 border-l-[#f4a5a5]">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Parent 1</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prénom <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                required
                value={formData.parent1_first_name}
                onChange={(e) => handleChange('parent1_first_name', e.target.value)}
                placeholder="Prénom"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                required
                value={formData.parent1_last_name}
                onChange={(e) => handleChange('parent1_last_name', e.target.value)}
                placeholder="Nom"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <Input
                type="email"
                required
                value={formData.parent1_email}
                onChange={(e) => handleChange('parent1_email', e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Téléphone <span className="text-red-500">*</span>
              </label>
              <Input
                type="tel"
                required
                value={formData.parent1_phone}
                onChange={(e) => handleChange('parent1_phone', e.target.value)}
                placeholder="06 12 34 56 78"
              />
            </div>
          </div>
        </Card>

        {/* Parent 2 Information */}
        <Card className="p-6 border-l-4 border-l-[#f4a5a5]">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Parent 2 (Optionnel)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
              <Input
                type="text"
                value={formData.parent2_first_name}
                onChange={(e) => handleChange('parent2_first_name', e.target.value)}
                placeholder="Prénom"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <Input
                type="text"
                value={formData.parent2_last_name}
                onChange={(e) => handleChange('parent2_last_name', e.target.value)}
                placeholder="Nom"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <Input
                type="email"
                value={formData.parent2_email}
                onChange={(e) => handleChange('parent2_email', e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <Input
                type="tel"
                value={formData.parent2_phone}
                onChange={(e) => handleChange('parent2_phone', e.target.value)}
                placeholder="06 12 34 56 78"
              />
            </div>
          </div>
        </Card>

        {/* Address */}
        <Card className="p-6 border-l-4 border-l-[#f4a5a5]">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Adresse</h2>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
              <Input
                type="text"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Numéro et nom de rue"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code postal</label>
                <Input
                  type="text"
                  value={formData.postal_code}
                  onChange={(e) => handleChange('postal_code', e.target.value)}
                  placeholder="75001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
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

        {/* Request Details */}
        <Card className="p-6 border-l-4 border-l-[#f4a5a5]">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Détails de la Demande</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date souhaitée d'entrée <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                required
                value={formData.desired_start_date}
                onChange={(e) => handleChange('desired_start_date', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type de contrat</label>
              <select
                value={formData.desired_contract_type}
                onChange={(e) => handleChange('desired_contract_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Non spécifié</option>
                <option value="regular">Régulier</option>
                <option value="occasional">Occasionnel</option>
                <option value="emergency">Urgence</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Horaires souhaités
              </label>
              <Input
                type="text"
                value={formData.desired_schedule}
                onChange={(e) => handleChange('desired_schedule', e.target.value)}
                placeholder="Ex: Temps plein 8h-18h, Mi-temps matin, etc."
              />
            </div>
          </div>
        </Card>

        {/* Additional Information */}
        <Card className="p-6 border-l-4 border-l-[#f4a5a5]">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Informations Complémentaires</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lettre de motivation
              </label>
              <textarea
                value={formData.motivation_letter}
                onChange={(e) => handleChange('motivation_letter', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Pourquoi souhaitez-vous inscrire votre enfant dans notre crèche ?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Besoins spécifiques
              </label>
              <textarea
                value={formData.special_needs}
                onChange={(e) => handleChange('special_needs', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Allergies, handicap, régime alimentaire spécial, etc."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes internes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Notes pour usage interne uniquement"
              />
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-[#f4a5a5] hover:bg-[#f4a5a5]/90 text-gray-900"
          >
            {loading ? 'Création...' : 'Créer la demande'}
          </Button>
        </div>
      </form>
    </div>
  )
}
