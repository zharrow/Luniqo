'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import {
  contractService,
  type ContractWithDetails,
  type CreateAmendmentInput
} from '@/lib/services/contract.service'
import { ArrowLeftIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'

export default function CreateAmendmentPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const router = useRouter()
  const params = useParams()
  const contractId = params.id as string

  const [contract, setContract] = useState<ContractWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    amendment_type: 'schedule_change' as CreateAmendmentInput['amendment_type'],
    effective_date: '',
    new_hourly_rate: '',
    new_monthly_rate: '',
    reason: '',
    notes: ''
  })

  useEffect(() => {
    if (contractId) {
      loadData()
    }
  }, [contractId])

  async function loadData() {
    try {
      setLoading(true)
      const contractData = await contractService.getByIdWithDetails(contractId)
      setContract(contractData)

      // Pre-fill with current rates
      setFormData(prev => ({
        ...prev,
        new_hourly_rate: contractData.hourly_rate?.toString() || '',
        new_monthly_rate: contractData.monthly_rate?.toString() || ''
      }))
    } catch (err) {
      console.error('Error loading contract:', err)
      setError('Erreur lors du chargement du contrat.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!session?.user?.id) return

    setSaving(true)
    setError(null)

    try {
      const input: CreateAmendmentInput = {
        amendment_type: formData.amendment_type,
        effective_date: formData.effective_date,
        changes_description: formData.reason,
        new_hourly_rate: formData.new_hourly_rate ? parseFloat(formData.new_hourly_rate) : undefined,
        new_monthly_rate: formData.new_monthly_rate ? parseFloat(formData.new_monthly_rate) : undefined,
        notes: formData.notes || undefined,
        created_by_id: session.user.id
      }

      await contractService.createAmendment(contractId, input)
      router.push(`/owner/contracts/${contractId}`)
    } catch (err) {
      console.error('Error creating amendment:', err)
      setError('Erreur lors de la création de l\'avenant.')
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

  if (error && !contract) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erreur</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => router.push('/owner/contracts')}>
            Retour à la liste
          </Button>
        </div>
      </div>
    )
  }

  if (!contract) return null

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <PageBreadcrumb
        items={[
          { label: 'Tableau de bord', href: '/owner/dashboard' },
          { label: 'Contrats', href: '/owner/contracts' },
          { label: contract.contract_number, href: `/owner/contracts/${contract.id}` },
          { label: 'Avenant', href: `/owner/contracts/${contract.id}/amendment` }
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
          <h1 className="text-3xl font-bold text-gray-900">Créer un Avenant</h1>
          <p className="text-gray-600 mt-1">
            Contrat {contract.contract_number} - {contract.child_first_name} {contract.child_last_name}
          </p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <Card className="p-4 mb-6 bg-red-50 border-red-200">
          <p className="text-red-800">{error}</p>
        </Card>
      )}

      {/* Info Card */}
      <Card className="p-6 mb-6 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <DocumentTextIcon className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">À propos des avenants</h3>
            <p className="text-sm text-blue-800">
              Un avenant permet de modifier les conditions du contrat en cours (horaires, tarifs, etc.)
              sans créer un nouveau contrat. Les modifications prennent effet à la date spécifiée.
            </p>
          </div>
        </div>
      </Card>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Amendment Type */}
        <Card className="p-6 border-l-4 border-l-[#9fa8da]">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Type d'Avenant</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type de modification <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.amendment_type}
                onChange={(e) => setFormData(prev => ({ ...prev, amendment_type: e.target.value as CreateAmendmentInput['amendment_type'] }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="schedule_change">Modification des horaires</option>
                <option value="rate_change">Modification des tarifs</option>
                <option value="hours_change">Modification du volume horaire</option>
                <option value="suspension">Suspension temporaire</option>
                <option value="reactivation">Réactivation</option>
                <option value="other">Autre</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date d'effet <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                required
                value={formData.effective_date}
                onChange={(e) => setFormData(prev => ({ ...prev, effective_date: e.target.value }))}
              />
            </div>
          </div>
        </Card>

        {/* New Rates */}
        {(formData.amendment_type === 'rate_change' || formData.amendment_type === 'hours_change') && (
          <Card className="p-6 border-l-4 border-l-[#9fa8da]">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Nouveaux Tarifs</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nouveau tarif horaire (€)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.new_hourly_rate}
                  onChange={(e) => setFormData(prev => ({ ...prev, new_hourly_rate: e.target.value }))}
                  placeholder={`Actuel: ${contract.hourly_rate || 'N/A'}€`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nouveau tarif mensuel (€)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.new_monthly_rate}
                  onChange={(e) => setFormData(prev => ({ ...prev, new_monthly_rate: e.target.value }))}
                  placeholder={`Actuel: ${contract.monthly_rate || 'N/A'}€`}
                />
              </div>
            </div>
          </Card>
        )}

        {/* Reason & Notes */}
        <Card className="p-6 border-l-4 border-l-[#9fa8da]">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Justification</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Raison de l'avenant <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                required
                value={formData.reason}
                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Ex: Changement de situation familiale, passage à temps partiel, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes complémentaires
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Informations complémentaires sur cet avenant..."
              />
            </div>
          </div>
        </Card>

        {/* Current Contract Info */}
        <Card className="p-6 bg-gray-50 border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">Conditions actuelles du contrat</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Tarif horaire</p>
              <p className="font-medium text-gray-900">{contract.hourly_rate || 'N/A'}€/h</p>
            </div>
            <div>
              <p className="text-gray-600">Tarif mensuel</p>
              <p className="font-medium text-gray-900">{contract.monthly_rate || 'N/A'}€/mois</p>
            </div>
            <div>
              <p className="text-gray-600">Type de tarification</p>
              <p className="font-medium text-gray-900 capitalize">{contract.rate_type}</p>
            </div>
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
            {saving ? 'Création...' : 'Créer l\'avenant'}
          </Button>
        </div>
      </form>
    </div>
  )
}
