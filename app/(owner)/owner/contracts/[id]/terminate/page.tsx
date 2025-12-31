'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import {
  contractService,
  type ContractWithDetails
} from '@/lib/services/contract.service'
import { ArrowLeftIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'

export default function TerminateContractPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const router = useRouter()
  const params = useParams()
  const contractId = params.id as string

  const [contract, setContract] = useState<ContractWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [terminating, setTerminating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    termination_date: '',
    termination_reason: '',
    termination_notes: ''
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
    } catch (err) {
      console.error('Error loading contract:', err)
      setError('Erreur lors du chargement du contrat.')
    } finally {
      setLoading(false)
    }
  }

  async function handleTerminate(e: React.FormEvent) {
    e.preventDefault()
    if (!contract) return

    if (!confirm('⚠️ ATTENTION : La résiliation d\'un contrat est définitive. Êtes-vous sûr de vouloir continuer ?')) {
      return
    }

    setTerminating(true)
    setError(null)

    try {
      await contractService.terminate(
        contractId,
        formData.termination_date,
        formData.termination_reason,
        formData.termination_notes || undefined
      )

      router.push('/owner/contracts')
    } catch (err) {
      console.error('Error terminating contract:', err)
      setError('Erreur lors de la résiliation du contrat.')
    } finally {
      setTerminating(false)
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
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
          { label: 'Résiliation', href: `/owner/contracts/${contract.id}/terminate` }
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
          <h1 className="text-3xl font-bold text-gray-900">Résilier le Contrat</h1>
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

      {/* Warning Card */}
      <Card className="p-6 mb-6 bg-red-50 border-red-200">
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-red-900 mb-2">⚠️ Action Irréversible</h3>
            <p className="text-sm text-red-800 mb-2">
              La résiliation d'un contrat est une action <strong>définitive et irréversible</strong>.
            </p>
            <ul className="text-sm text-red-800 list-disc list-inside space-y-1">
              <li>Le contrat passera au statut "Résilié"</li>
              <li>Aucune modification ne sera possible après la résiliation</li>
              <li>Un nouveau contrat devra être créé si besoin</li>
              <li>Les données historiques seront conservées</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Current Contract Info */}
      <Card className="p-6 mb-6 border-l-4 border-l-[#9fa8da]">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Informations du Contrat</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Numéro de contrat</p>
            <p className="font-medium text-gray-900">{contract.contract_number}</p>
          </div>
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
          <div>
            <p className="text-gray-600">Date de début</p>
            <p className="font-medium text-gray-900">{formatDate(contract.start_date)}</p>
          </div>
          <div>
            <p className="text-gray-600">Type de contrat</p>
            <p className="font-medium text-gray-900 capitalize">{contract.contract_type}</p>
          </div>
          <div>
            <p className="text-gray-600">Tarification</p>
            <p className="font-medium text-gray-900 capitalize">{contract.rate_type}</p>
          </div>
        </div>
      </Card>

      {/* Termination Form */}
      <form onSubmit={handleTerminate} className="space-y-6">
        <Card className="p-6 border-l-4 border-l-red-500">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Détails de la Résiliation</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de résiliation <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                required
                value={formData.termination_date}
                onChange={(e) => setFormData(prev => ({ ...prev, termination_date: e.target.value }))}
              />
              <p className="text-xs text-gray-600 mt-1">
                Le contrat prendra fin à partir de cette date
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motif de résiliation <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.termination_reason}
                onChange={(e) => setFormData(prev => ({ ...prev, termination_reason: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Sélectionner un motif</option>
                <option value="end_of_childcare">Fin de la garde (enfant quitte la crèche)</option>
                <option value="family_request">Demande de la famille</option>
                <option value="non_payment">Non-paiement</option>
                <option value="non_compliance">Non-respect du règlement</option>
                <option value="relocation">Déménagement de la famille</option>
                <option value="mutual_agreement">Accord mutuel</option>
                <option value="other">Autre motif</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes complémentaires
              </label>
              <textarea
                value={formData.termination_notes}
                onChange={(e) => setFormData(prev => ({ ...prev, termination_notes: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Détails supplémentaires concernant la résiliation..."
              />
            </div>
          </div>
        </Card>

        {/* Confirmation */}
        <Card className="p-6 bg-yellow-50 border-yellow-200">
          <h3 className="font-semibold text-yellow-900 mb-2">Confirmation Requise</h3>
          <p className="text-sm text-yellow-800">
            En soumettant ce formulaire, vous confirmez vouloir résilier définitivement ce contrat.
            Un message de confirmation supplémentaire vous sera demandé avant la résiliation finale.
          </p>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={terminating}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={terminating}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            <XCircleIcon className="h-5 w-5 mr-2" />
            {terminating ? 'Résiliation en cours...' : 'Résilier le contrat'}
          </Button>
        </div>
      </form>
    </div>
  )
}
