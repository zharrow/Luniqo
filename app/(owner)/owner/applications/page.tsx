'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import {
  applicationService,
  type Application,
  type ApplicationsSummary,
  type ApplicationFilters
} from '@/lib/services/application.service'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  QueueListIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'

export default function ApplicationsPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery } = useNursery()
  const router = useRouter()

  const [applications, setApplications] = useState<Application[]>([])
  const [summary, setSummary] = useState<ApplicationsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)

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
      const filters: ApplicationFilters = {
        status: statusFilter.length > 0 ? statusFilter : undefined,
        search: searchTerm || undefined
      }
      const [applicationsData, summaryData] = await Promise.all([
        applicationService.getByNursery(selectedNursery.id, filters),
        applicationService.getSummary(selectedNursery.id)
      ])
      setApplications(applicationsData)
      setSummary(summaryData)
    } catch (error) {
      console.error('Error loading applications:', error)
    } finally {
      setLoading(false)
    }
  }

  // Reload when filters change
  useEffect(() => {
    if (selectedNursery?.id) {
      loadData()
    }
  }, [statusFilter, searchTerm])

  function getStatusBadge(status: Application['status']) {
    const statusConfig = {
      received: { label: 'Reçue', color: 'bg-blue-100 text-blue-800' },
      under_review: { label: 'En examen', color: 'bg-yellow-100 text-yellow-800' },
      accepted: { label: 'Acceptée', color: 'bg-green-100 text-green-800' },
      rejected: { label: 'Refusée', color: 'bg-red-100 text-red-800' },
      waiting_list: { label: 'Liste d\'attente', color: 'bg-purple-100 text-purple-800' },
      cancelled: { label: 'Annulée', color: 'bg-gray-100 text-gray-800' }
    }
    const config = statusConfig[status]
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

  function toggleStatusFilter(status: string) {
    setStatusFilter(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    )
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f4a5a5] mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des demandes...</p>
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
          <p className="text-gray-600">Veuillez sélectionner une crèche pour voir les demandes.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <PageBreadcrumb
        items={[
          { label: 'Tableau de bord', href: '/owner/dashboard' },
          { label: 'Inscriptions', href: '/owner/applications' }
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-pink-100">
            <DocumentTextIcon className="w-6 h-6 text-pink-600" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Demandes d'Inscription</h1>
            <p className="text-sm text-muted-foreground">
              Gestion des pré-inscriptions pour {selectedNursery.name}
            </p>
          </div>
        </div>
        <Button
          onClick={() => router.push('/owner/applications/new')}
          className="bg-[#f4a5a5] hover:bg-[#f4a5a5]/90 text-gray-900"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Nouvelle demande
        </Button>
      </div>

      {/* Stats */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-white border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Reçues</p>
                <p className="text-2xl font-bold text-blue-700">{summary.received}</p>
              </div>
              <DocumentTextIcon className="h-8 w-8 text-blue-500" />
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-yellow-50 to-white border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">En examen</p>
                <p className="text-2xl font-bold text-yellow-700">{summary.under_review}</p>
              </div>
              <ClockIcon className="h-8 w-8 text-yellow-500" />
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-green-50 to-white border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Acceptées</p>
                <p className="text-2xl font-bold text-green-700">{summary.accepted}</p>
              </div>
              <CheckCircleIcon className="h-8 w-8 text-green-500" />
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-purple-50 to-white border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Liste d'attente</p>
                <p className="text-2xl font-bold text-purple-700">{summary.waiting_list}</p>
              </div>
              <QueueListIcon className="h-8 w-8 text-purple-500" />
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-red-50 to-white border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Refusées</p>
                <p className="text-2xl font-bold text-red-700">{summary.rejected}</p>
              </div>
              <XCircleIcon className="h-8 w-8 text-red-500" />
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-gray-50 to-white border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-700">{summary.total_applications}</p>
              </div>
              <DocumentTextIcon className="h-8 w-8 text-gray-500" />
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4 mb-6 bg-white">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Rechercher (nom enfant, parent, email...)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filter toggle */}
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-gray-100' : ''}
          >
            <FunnelIcon className="h-5 w-5 mr-2" />
            Filtres {statusFilter.length > 0 && `(${statusFilter.length})`}
          </Button>
        </div>

        {/* Status filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-medium text-gray-700 mb-2">Statut</p>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'received', label: 'Reçue', color: 'bg-blue-100 text-blue-800' },
                { value: 'under_review', label: 'En examen', color: 'bg-yellow-100 text-yellow-800' },
                { value: 'accepted', label: 'Acceptée', color: 'bg-green-100 text-green-800' },
                { value: 'waiting_list', label: 'Liste d\'attente', color: 'bg-purple-100 text-purple-800' },
                { value: 'rejected', label: 'Refusée', color: 'bg-red-100 text-red-800' },
                { value: 'cancelled', label: 'Annulée', color: 'bg-gray-100 text-gray-800' }
              ].map(status => (
                <Badge
                  key={status.value}
                  onClick={() => toggleStatusFilter(status.value)}
                  className={`cursor-pointer ${statusFilter.includes(status.value) ? status.color : 'bg-gray-200 text-gray-600'}`}
                >
                  {status.label}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Applications List */}
      {applications.length === 0 ? (
        <Card className="p-12 text-center bg-gray-50">
          <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune demande</h3>
          <p className="text-gray-600 mb-4">
            {statusFilter.length > 0 || searchTerm
              ? 'Aucune demande ne correspond à vos critères de recherche.'
              : 'Commencez par créer une nouvelle demande d\'inscription.'}
          </p>
          <Button
            onClick={() => router.push('/owner/applications/new')}
            className="bg-[#f4a5a5] hover:bg-[#f4a5a5]/90 text-gray-900"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Nouvelle demande
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {applications.map((application) => (
            <Card
              key={application.id}
              className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-[#f4a5a5]"
              onClick={() => router.push(`/owner/applications/${application.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Child info */}
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">
                      {application.child_first_name} {application.child_last_name}
                    </h3>
                    {getStatusBadge(application.status)}
                  </div>

                  {/* Parent info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 text-sm">
                    <div>
                      <p className="text-gray-600">Parent 1</p>
                      <p className="font-medium text-gray-900">
                        {application.parent1_first_name} {application.parent1_last_name}
                      </p>
                      <p className="text-gray-600">{application.parent1_email}</p>
                      <p className="text-gray-600">{application.parent1_phone}</p>
                    </div>

                    <div>
                      <p className="text-gray-600">Date de naissance</p>
                      <p className="font-medium text-gray-900">
                        {formatDate(application.child_birth_date)}
                      </p>
                      <p className="text-gray-600 mt-2">Date souhaitée d'entrée</p>
                      <p className="font-medium text-gray-900">
                        {formatDate(application.desired_start_date)}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-600">Date de demande</p>
                      <p className="font-medium text-gray-900">
                        {formatDate(application.application_date)}
                      </p>
                      {application.desired_contract_type && (
                        <>
                          <p className="text-gray-600 mt-2">Type de contrat</p>
                          <p className="font-medium text-gray-900">
                            {application.desired_contract_type}
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Special needs */}
                  {application.special_needs && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm font-medium text-yellow-900">Besoins spécifiques</p>
                      <p className="text-sm text-yellow-800 mt-1">{application.special_needs}</p>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="ml-4">
                  {(application.status === 'received' || application.status === 'under_review') && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/owner/applications/${application.id}/review`)
                      }}
                      className="bg-[#f4a5a5] hover:bg-[#f4a5a5]/90 text-gray-900"
                    >
                      Examiner
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
