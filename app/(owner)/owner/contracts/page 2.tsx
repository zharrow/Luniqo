'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import {
  contractService,
  type Contract
} from '@/lib/services/contract.service'
import {
  DocumentTextIcon,
  PlusIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  PauseCircleIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'

export default function ContractsPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery } = useNursery()
  const router = useRouter()

  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (selectedNursery?.id) {
      loadData()
    } else if (!authLoading && !selectedNursery) {
      setLoading(false)
    }
  }, [selectedNursery?.id, authLoading])

  async function loadData() {
    if (!selectedNursery?.id) return

    try {
      setLoading(true)
      const data = await contractService.getByNursery(selectedNursery.id)
      setContracts(data)
    } catch (error) {
      console.error('Error loading contracts:', error)
    } finally {
      setLoading(false)
    }
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
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    )
  }

  function getRateTypeBadge(rateType: string) {
    const typeConfig: Record<string, { label: string; color: string }> = {
      psu: { label: 'PSU', color: 'bg-blue-100 text-blue-800' },
      paje: { label: 'PAJE', color: 'bg-purple-100 text-purple-800' },
      private: { label: 'Privé', color: 'bg-pink-100 text-pink-800' },
      company_sponsored: { label: 'Entreprise', color: 'bg-teal-100 text-teal-800' }
    }
    const config = typeConfig[rateType] || { label: rateType, color: 'bg-gray-100 text-gray-800' }
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    )
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
          <p className="mt-4 text-gray-600">Chargement des contrats...</p>
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
          <p className="text-gray-600">Veuillez sélectionner une crèche pour voir les contrats.</p>
        </div>
      </div>
    )
  }

  const activeContracts = contracts.filter(c => c.status === 'active')
  const draftContracts = contracts.filter(c => c.status === 'draft' || c.status === 'pending_signature')
  const otherContracts = contracts.filter(c => !['active', 'draft', 'pending_signature'].includes(c.status))

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <PageBreadcrumb
        items={[
          { label: 'Tableau de bord', href: '/owner/dashboard' },
          { label: 'Contrats', href: '/owner/contracts' }
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 mt-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contrats d'Accueil</h1>
          <p className="text-gray-600 mt-1">
            Gestion des contrats pour {selectedNursery.name}
          </p>
        </div>
        <Button
          onClick={() => router.push('/owner/contracts/new')}
          className="bg-[#9fa8da] hover:bg-[#9fa8da]/90 text-white"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Nouveau contrat
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card className="p-4 bg-gradient-to-br from-green-50 to-white border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Actifs</p>
              <p className="text-2xl font-bold text-green-700">{activeContracts.length}</p>
            </div>
            <CheckCircleIcon className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-yellow-50 to-white border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Brouillons</p>
              <p className="text-2xl font-bold text-yellow-700">{draftContracts.length}</p>
            </div>
            <ClockIcon className="h-8 w-8 text-yellow-500" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-orange-50 to-white border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Suspendus</p>
              <p className="text-2xl font-bold text-orange-700">
                {contracts.filter(c => c.status === 'suspended').length}
              </p>
            </div>
            <PauseCircleIcon className="h-8 w-8 text-orange-500" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-red-50 to-white border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Résiliés</p>
              <p className="text-2xl font-bold text-red-700">
                {contracts.filter(c => c.status === 'terminated').length}
              </p>
            </div>
            <XCircleIcon className="h-8 w-8 text-red-500" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-gray-50 to-white border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-700">{contracts.length}</p>
            </div>
            <DocumentTextIcon className="h-8 w-8 text-gray-500" />
          </div>
        </Card>
      </div>

      {/* Contracts List */}
      {contracts.length === 0 ? (
        <Card className="p-12 text-center bg-gray-50">
          <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun contrat</h3>
          <p className="text-gray-600 mb-4">
            Commencez par créer un nouveau contrat d'accueil.
          </p>
          <Button
            onClick={() => router.push('/owner/contracts/new')}
            className="bg-[#9fa8da] hover:bg-[#9fa8da]/90 text-white"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Nouveau contrat
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Active Contracts */}
          {activeContracts.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Contrats Actifs ({activeContracts.length})</h2>
              <div className="space-y-3">
                {activeContracts.map((contract) => (
                  <Card
                    key={contract.id}
                    className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-[#9fa8da]"
                    onClick={() => router.push(`/owner/contracts/${contract.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-gray-900">
                            Contrat {contract.contract_number}
                          </h3>
                          {getStatusBadge(contract.status)}
                          {getRateTypeBadge(contract.rate_type)}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-3 text-sm">
                          <div>
                            <p className="text-gray-600">N° de contrat</p>
                            <p className="font-medium text-gray-900">{contract.contract_number}</p>
                          </div>

                          <div>
                            <p className="text-gray-600">Type</p>
                            <p className="font-medium text-gray-900 capitalize">
                              {contract.contract_type === 'regular' ? 'Régulier' :
                               contract.contract_type === 'occasional' ? 'Occasionnel' :
                               contract.contract_type === 'emergency' ? 'Urgence' :
                               contract.contract_type === 'short_term' ? 'Court terme' :
                               contract.contract_type}
                            </p>
                          </div>

                          <div>
                            <p className="text-gray-600">Période</p>
                            <p className="font-medium text-gray-900">
                              {formatDate(contract.start_date)}
                              {contract.end_date && ` - ${formatDate(contract.end_date)}`}
                            </p>
                          </div>

                          <div>
                            <p className="text-gray-600">Tarif</p>
                            <p className="font-medium text-gray-900">
                              {contract.monthly_rate ? `${contract.monthly_rate}€/mois` :
                               contract.hourly_rate ? `${contract.hourly_rate}€/h` : 'Non défini'}
                            </p>
                            {contract.weekly_hours && (
                              <p className="text-xs text-gray-600">{contract.weekly_hours}h/sem</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Draft Contracts */}
          {draftContracts.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Brouillons ({draftContracts.length})</h2>
              <div className="space-y-3">
                {draftContracts.map((contract) => (
                  <Card
                    key={contract.id}
                    className="p-6 bg-yellow-50 border-yellow-200 cursor-pointer"
                    onClick={() => router.push(`/owner/contracts/${contract.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900">
                            Contrat {contract.contract_number}
                          </h3>
                          {getStatusBadge(contract.status)}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">N° de contrat</p>
                            <p className="font-medium text-gray-900">{contract.contract_number}</p>
                          </div>

                          <div>
                            <p className="text-gray-600">Début prévu</p>
                            <p className="font-medium text-gray-900">{formatDate(contract.start_date)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="ml-4">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/owner/contracts/${contract.id}`)
                          }}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white"
                        >
                          Compléter
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Other Contracts */}
          {otherContracts.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Autres ({otherContracts.length})</h2>
              <div className="space-y-3">
                {otherContracts.map((contract) => (
                  <Card
                    key={contract.id}
                    className="p-4 bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/owner/contracts/${contract.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              Contrat {contract.contract_number}
                            </span>
                            {getStatusBadge(contract.status)}
                          </div>
                          <p className="text-sm text-gray-600">{contract.contract_type}</p>
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-600">
                        <p>{formatDate(contract.start_date)}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
