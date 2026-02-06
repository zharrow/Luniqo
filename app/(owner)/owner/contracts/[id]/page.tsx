'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import {
  contractService,
  type ContractWithDetails,
  type UpdateContractInput
} from '@/lib/services/contract.service'
import {
  ArrowLeftIcon,
  DocumentTextIcon,
  CalendarIcon,
  ClockIcon,
  CurrencyEuroIcon,
  PencilIcon,
  PauseCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function ContractDetailPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const router = useRouter()
  const params = useParams()
  const contractId = params.id as string

  const [contract, setContract] = useState<ContractWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('info')

  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    hourly_rate: '',
    monthly_rate: '',
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

      setFormData({
        start_date: contractData.start_date,
        end_date: contractData.end_date || '',
        hourly_rate: contractData.hourly_rate?.toString() || '',
        monthly_rate: contractData.monthly_rate?.toString() || '',
        notes: contractData.notes || ''
      })
    } catch (err) {
      console.error('Error loading contract:', err)
      setError('Erreur lors du chargement du contrat.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!contract) return

    setSaving(true)
    setError(null)

    try {
      const updateData: UpdateContractInput = {
        start_date: formData.start_date,
        end_date: formData.end_date || undefined,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : undefined,
        monthly_rate: formData.monthly_rate ? parseFloat(formData.monthly_rate) : undefined,
        notes: formData.notes || undefined
      }

      await contractService.update(contractId, updateData)
      await loadData()
    } catch (err) {
      console.error('Error updating contract:', err)
      setError('Erreur lors de la mise à jour du contrat.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSuspend() {
    if (!contract || !confirm('Êtes-vous sûr de vouloir suspendre ce contrat ?')) return

    try {
      await contractService.suspend(contractId)
      await loadData()
    } catch (err) {
      console.error('Error suspending contract:', err)
      setError('Erreur lors de la suspension du contrat.')
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  function getStatusBadge(status: string) {
    const statusConfig: Record<string, { label: string; color: string }> = {
      draft: { label: 'Brouillon', color: 'bg-gray-100 text-gray-800' },
      pending_signature: { label: 'En attente signature', color: 'bg-yellow-100 text-yellow-800' },
      active: { label: 'Actif', color: 'bg-green-100 text-green-800' },
      suspended: { label: 'Suspendu', color: 'bg-orange-100 text-orange-800' },
      terminated: { label: 'Résilié', color: 'bg-red-100 text-red-800' }
    }
    const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800' }
    return <Badge className={config.color}>{config.label}</Badge>
  }

  function getRateTypeBadge(rateType: string) {
    const typeConfig: Record<string, { label: string; color: string }> = {
      psu: { label: 'PSU', color: 'bg-blue-100 text-blue-800' },
      paje: { label: 'PAJE', color: 'bg-purple-100 text-purple-800' },
      private: { label: 'Privé', color: 'bg-pink-100 text-pink-800' },
      company_sponsored: { label: 'Entreprise', color: 'bg-teal-100 text-teal-800' }
    }
    const config = typeConfig[rateType] || { label: rateType, color: 'bg-gray-100 text-gray-800' }
    return <Badge className={config.color}>{config.label}</Badge>
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
    <div className="p-6 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <PageBreadcrumb
        items={[
          { label: 'Tableau de bord', href: '/owner/dashboard' },
          { label: 'Contrats', href: '/owner/contracts' },
          { label: contract.contract_number, href: `/owner/contracts/${contract.id}` }
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 mt-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="p-2"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">
                Contrat {contract.contract_number}
              </h1>
              {getStatusBadge(contract.status)}
              {getRateTypeBadge(contract.rate_type)}
            </div>
            <p className="text-gray-600">
              {contract.child_first_name} {contract.child_last_name} - {contract.family_name}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {contract.status === 'active' && (
            <>
              <Button
                variant="outline"
                onClick={handleSuspend}
                className="text-orange-600 hover:text-orange-700"
              >
                <PauseCircleIcon className="h-5 w-5 mr-2" />
                Suspendre
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/owner/contracts/${contract.id}/terminate`)}
                className="text-red-600 hover:text-red-700"
              >
                <XCircleIcon className="h-5 w-5 mr-2" />
                Résilier
              </Button>
            </>
          )}
          <Button
            onClick={() => router.push(`/owner/contracts/${contract.id}/amendment`)}
            className="bg-[#9fa8da] hover:bg-[#9fa8da]/90 text-white"
          >
            <PencilIcon className="h-5 w-5 mr-2" />
            Avenant
          </Button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <Card className="p-4 mb-6 bg-red-50 border-red-200">
          <p className="text-red-800">{error}</p>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="info">Informations</TabsTrigger>
          <TabsTrigger value="schedule">Horaires</TabsTrigger>
          <TabsTrigger value="rates">Tarification</TabsTrigger>
          <TabsTrigger value="amendments">Avenants</TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info" className="space-y-6">
          {/* Family & Child */}
          <Card className="p-6 border-l-4 border-l-[#9fa8da]">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Famille et Enfant</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Famille</p>
                <p className="font-medium text-gray-900">{contract.family_name}</p>
              </div>
              <div>
                <p className="text-gray-600">Enfant</p>
                <p className="font-medium text-gray-900">
                  {contract.child_first_name} {contract.child_last_name}
                </p>
              </div>
            </div>
          </Card>

          {/* Contract Details */}
          <Card className="p-6 border-l-4 border-l-[#9fa8da]">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Détails du Contrat</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de début <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Notes concernant ce contrat..."
                />
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => loadData()}
                  disabled={saving}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-[#9fa8da] hover:bg-[#9fa8da]/90 text-white"
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </div>
          </Card>

          {/* Signatures */}
          <Card className="p-6 border-l-4 border-l-[#9fa8da]">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Signatures</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="font-medium text-gray-900 mb-2">Signature Famille</p>
                {contract.guardian_signature_date ? (
                  <div className="text-sm text-gray-600">
                    <p>✓ Signé le {formatDate(contract.guardian_signature_date)}</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">En attente de signature</p>
                )}
              </div>

              <div>
                <p className="font-medium text-gray-900 mb-2">Signature Directeur</p>
                {contract.director_signature_date ? (
                  <div className="text-sm text-gray-600">
                    <p>✓ Signé le {formatDate(contract.director_signature_date)}</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">En attente de signature</p>
                )}
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule">
          <Card className="p-6 border-l-4 border-l-[#9fa8da]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Horaires Hebdomadaires</h2>
              <Button
                onClick={() => router.push(`/owner/contracts/${contract.id}/schedule`)}
                className="bg-[#9fa8da] hover:bg-[#9fa8da]/90 text-white"
              >
                <ClockIcon className="h-5 w-5 mr-2" />
                Éditer les horaires
              </Button>
            </div>
            <p className="text-gray-600">
              Cliquez sur "Éditer les horaires" pour configurer le planning hebdomadaire de ce contrat.
            </p>
          </Card>
        </TabsContent>

        {/* Rates Tab */}
        <TabsContent value="rates">
          <Card className="p-6 border-l-4 border-l-[#9fa8da]">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Tarification</h2>
            <div className="space-y-4">
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
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => loadData()}
                  disabled={saving}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-[#9fa8da] hover:bg-[#9fa8da]/90 text-white"
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Amendments Tab */}
        <TabsContent value="amendments">
          <Card className="p-6 border-l-4 border-l-[#9fa8da]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Avenants au Contrat</h2>
              <Button
                onClick={() => router.push(`/owner/contracts/${contract.id}/amendment`)}
                className="bg-[#9fa8da] hover:bg-[#9fa8da]/90 text-white"
              >
                <DocumentTextIcon className="h-5 w-5 mr-2" />
                Créer un avenant
              </Button>
            </div>
            <p className="text-gray-600">
              Les avenants permettent de modifier les conditions du contrat en cours (horaires, tarifs, etc.).
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
