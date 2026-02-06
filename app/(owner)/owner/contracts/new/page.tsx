'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import {
  contractService,
  type CreateContractInput,
  type Contract
} from '@/lib/services/contract.service'
import { familyService, type Family } from '@/lib/services/family.service'
import { childService, type Child } from '@/lib/services/child.service'
import { ArrowLeftIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'

export default function NewContractPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery } = useNursery()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [families, setFamilies] = useState<Family[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [filteredChildren, setFilteredChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    family_id: searchParams.get('family_id') || '',
    child_id: searchParams.get('child_id') || '',
    contract_type: 'regular' as Contract['contract_type'],
    start_date: '',
    end_date: '',
    rate_type: 'psu' as Contract['rate_type'],
    hourly_rate: '',
    monthly_rate: '',
    billing_frequency: 'monthly' as Contract['billing_frequency'],
    billing_day_of_month: 1,
    notes: ''
  })

  useEffect(() => {
    if (selectedNursery?.id) {
      loadData()
    }
  }, [selectedNursery?.id])

  useEffect(() => {
    if (formData.family_id) {
      const familyChildren = children.filter(c => c.family_id === formData.family_id)
      setFilteredChildren(familyChildren)

      // Auto-select child if only one
      if (familyChildren.length === 1 && !formData.child_id) {
        setFormData(prev => ({ ...prev, child_id: familyChildren[0].id }))
      }
    } else {
      setFilteredChildren([])
    }
  }, [formData.family_id, children])

  async function loadData() {
    if (!selectedNursery?.id) return

    try {
      setLoading(true)
      const [familiesData, childrenData] = await Promise.all([
        familyService.getActive(selectedNursery.id),
        childService.getActive(selectedNursery.id)
      ])
      setFamilies(familiesData)
      setChildren(childrenData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedNursery?.id || !session?.user?.id) return

    setSaving(true)
    setError(null)

    try {
      const input: CreateContractInput = {
        nursery_id: selectedNursery.id,
        family_id: formData.family_id,
        child_id: formData.child_id,
        contract_type: formData.contract_type,
        start_date: formData.start_date,
        end_date: formData.end_date || undefined,
        rate_type: formData.rate_type,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : undefined,
        monthly_rate: formData.monthly_rate ? parseFloat(formData.monthly_rate) : undefined,
        billing_frequency: formData.billing_frequency,
        billing_day_of_month: formData.billing_day_of_month,
        notes: formData.notes || undefined,
        created_by_id: session.user.id
      }

      const contract = await contractService.create(input)
      router.push(`/owner/contracts/${contract.id}`)
    } catch (err) {
      console.error('Error creating contract:', err)
      setError('Erreur lors de la création du contrat. Veuillez réessayer.')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#9fa8da] mx-auto"></div>
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
          { label: 'Contrats', href: '/owner/contracts' },
          { label: 'Nouveau contrat', href: '/owner/contracts/new' }
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
          <h1 className="text-2xl font-bold text-gray-900">Nouveau Contrat d'Accueil</h1>
          <p className="text-gray-600 mt-1">
            Créer un nouveau contrat pour {selectedNursery.name}
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
        {/* Family & Child */}
        <Card className="p-6 border-l-4 border-l-[#9fa8da]">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Famille et Enfant</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Famille <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.family_id}
                onChange={(e) => setFormData(prev => ({ ...prev, family_id: e.target.value, child_id: '' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Sélectionner une famille</option>
                {families.map((family) => (
                  <option key={family.id} value={family.id}>
                    {family.family_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Enfant <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.child_id}
                onChange={(e) => setFormData(prev => ({ ...prev, child_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                disabled={!formData.family_id}
              >
                <option value="">Sélectionner un enfant</option>
                {filteredChildren.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.first_name} {child.last_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Contract Details */}
        <Card className="p-6 border-l-4 border-l-[#9fa8da]">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Détails du Contrat</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type de contrat <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.contract_type}
                onChange={(e) => setFormData(prev => ({ ...prev, contract_type: e.target.value as Contract['contract_type'] }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="regular">Régulier</option>
                <option value="occasional">Occasionnel</option>
                <option value="emergency">Urgence</option>
                <option value="short_term">Court terme</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type de tarification <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.rate_type}
                onChange={(e) => setFormData(prev => ({ ...prev, rate_type: e.target.value as Contract['rate_type'] }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="psu">PSU (Prestation de Service Unique)</option>
                <option value="paje">PAJE</option>
                <option value="private">Privé</option>
                <option value="company_sponsored">Entreprise</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de début <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de fin (optionnel)
              </label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
              />
            </div>
          </div>
        </Card>

        {/* Pricing */}
        <Card className="p-6 border-l-4 border-l-[#9fa8da]">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Tarification</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tarif horaire (€)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.hourly_rate}
                onChange={(e) => setFormData(prev => ({ ...prev, hourly_rate: e.target.value }))}
                placeholder="Ex: 8.50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tarif mensuel (€)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.monthly_rate}
                onChange={(e) => setFormData(prev => ({ ...prev, monthly_rate: e.target.value }))}
                placeholder="Ex: 650.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fréquence de facturation
              </label>
              <select
                value={formData.billing_frequency}
                onChange={(e) => setFormData(prev => ({ ...prev, billing_frequency: e.target.value as Contract['billing_frequency'] }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="monthly">Mensuelle</option>
                <option value="quarterly">Trimestrielle</option>
                <option value="annual">Annuelle</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Jour de prélèvement
              </label>
              <Input
                type="number"
                min="1"
                max="28"
                value={formData.billing_day_of_month}
                onChange={(e) => setFormData(prev => ({ ...prev, billing_day_of_month: parseInt(e.target.value) || 1 }))}
              />
            </div>
          </div>
        </Card>

        {/* Notes */}
        <Card className="p-6 border-l-4 border-l-[#9fa8da]">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Notes</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes internes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Notes ou observations concernant ce contrat..."
            />
          </div>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={saving}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="bg-[#9fa8da] hover:bg-[#9fa8da]/90 text-white"
          >
            {saving ? 'Création...' : 'Créer le contrat'}
          </Button>
        </div>
      </form>
    </div>
  )
}
