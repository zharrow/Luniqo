'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import {
  admissionService,
  type AdmissionWithDetails
} from '@/lib/services/admission.service'
import {
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  CalendarIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'

export default function AdmissionsPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery } = useNursery()
  const router = useRouter()

  const [admissions, setAdmissions] = useState<AdmissionWithDetails[]>([])
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
      const data = await admissionService.getByNursery(selectedNursery.id)
      setAdmissions(data)
    } catch (error) {
      console.error('Error loading admissions:', error)
    } finally {
      setLoading(false)
    }
  }

  function getStatusBadge(status: string) {
    const statusConfig: Record<string, { label: string; color: string }> = {
      pending: { label: 'En cours', color: 'bg-yellow-100 text-yellow-800' },
      active: { label: 'Active', color: 'bg-green-100 text-green-800' },
      completed: { label: 'Complétée', color: 'bg-blue-100 text-blue-800' },
      cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-800' }
    }
    const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800' }
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#64b5d1] mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des admissions...</p>
        </div>
      </div>
    )
  }

  if (!selectedNursery) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <UserGroupIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Aucune crèche sélectionnée</h2>
          <p className="text-gray-600">Veuillez sélectionner une crèche pour voir les admissions.</p>
        </div>
      </div>
    )
  }

  const pendingAdmissions = admissions.filter(a => a.status === 'pending')
  const activeAdmissions = admissions.filter(a => a.status === 'active')
  const completedAdmissions = admissions.filter(a => a.status === 'completed')

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <PageBreadcrumb
        items={[
          { label: 'Tableau de bord', href: '/owner/dashboard' },
          { label: 'Admissions', href: '/owner/admissions' }
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 mt-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admissions</h1>
          <p className="text-gray-600 mt-1">
            Processus d'admission pour {selectedNursery.name}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 bg-gradient-to-br from-yellow-50 to-white border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">En cours</p>
              <p className="text-2xl font-bold text-yellow-700">{pendingAdmissions.length}</p>
            </div>
            <ClockIcon className="h-8 w-8 text-yellow-500" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-green-50 to-white border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Actives</p>
              <p className="text-2xl font-bold text-green-700">{activeAdmissions.length}</p>
            </div>
            <CheckCircleIcon className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-blue-50 to-white border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Complétées</p>
              <p className="text-2xl font-bold text-blue-700">{completedAdmissions.length}</p>
            </div>
            <AcademicCapIcon className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-gray-50 to-white border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-700">{admissions.length}</p>
            </div>
            <UserGroupIcon className="h-8 w-8 text-gray-500" />
          </div>
        </Card>
      </div>

      {/* Admissions List */}
      {admissions.length === 0 ? (
        <Card className="p-12 text-center bg-gray-50">
          <AcademicCapIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune admission</h3>
          <p className="text-gray-600 mb-4">
            Aucune admission en cours pour le moment.
          </p>
          <Button
            onClick={() => router.push('/owner/applications')}
            className="bg-[#64b5d1] hover:bg-[#64b5d1]/90 text-white"
          >
            Voir les demandes
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Pending Admissions */}
          {pendingAdmissions.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">En Cours ({pendingAdmissions.length})</h2>
              <div className="space-y-3">
                {pendingAdmissions.map((admission) => (
                  <Card
                    key={admission.id}
                    className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-[#64b5d1]"
                    onClick={() => router.push(`/owner/admissions/${admission.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-gray-900">
                            {admission.child_first_name} {admission.child_last_name}
                          </h3>
                          {getStatusBadge(admission.status)}
                          {admission.in_trial_period && (
                            <Badge className="bg-orange-100 text-orange-800">
                              Période d'adaptation
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-3 text-sm">
                          <div>
                            <p className="text-gray-600">Parent</p>
                            <p className="font-medium text-gray-900">
                              {admission.parent1_first_name} {admission.parent1_last_name}
                            </p>
                            <p className="text-gray-600">{admission.parent1_email}</p>
                          </div>

                          <div>
                            <p className="text-gray-600">Date de début</p>
                            <p className="font-medium text-gray-900">{formatDate(admission.start_date)}</p>
                            {!admission.has_started && admission.days_until_start >= 0 && (
                              <p className="text-xs text-blue-600">Dans {admission.days_until_start} jours</p>
                            )}
                          </div>

                          <div>
                            <p className="text-gray-600">Section</p>
                            <p className="font-medium text-gray-900">{admission.section_name || 'Non assignée'}</p>
                            {admission.room_name && (
                              <p className="text-xs text-gray-600">{admission.room_name}</p>
                            )}
                          </div>

                          <div>
                            <p className="text-gray-600">Période d'adaptation</p>
                            <p className="font-medium text-gray-900">{admission.trial_period_weeks} semaines</p>
                            {admission.trial_period_end && (
                              <p className="text-xs text-gray-600">Jusqu'au {formatDate(admission.trial_period_end)}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="ml-4">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/owner/admissions/${admission.id}`)
                          }}
                          className="bg-[#64b5d1] hover:bg-[#64b5d1]/90 text-white"
                        >
                          Gérer
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Active Admissions */}
          {activeAdmissions.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Actives ({activeAdmissions.length})</h2>
              <div className="space-y-3">
                {activeAdmissions.map((admission) => (
                  <Card
                    key={admission.id}
                    className="p-6 bg-green-50 border-green-200 cursor-pointer"
                    onClick={() => router.push(`/owner/admissions/${admission.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900">
                            {admission.child_first_name} {admission.child_last_name}
                          </h3>
                          {getStatusBadge(admission.status)}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Parent</p>
                            <p className="font-medium text-gray-900">
                              {admission.parent1_first_name} {admission.parent1_last_name}
                            </p>
                          </div>

                          <div>
                            <p className="text-gray-600">Début</p>
                            <p className="font-medium text-gray-900">{formatDate(admission.start_date)}</p>
                          </div>

                          <div>
                            <p className="text-gray-600">Section</p>
                            <p className="font-medium text-gray-900">{admission.section_name || '-'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Completed Admissions */}
          {completedAdmissions.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Complétées ({completedAdmissions.length})</h2>
              <div className="space-y-3">
                {completedAdmissions.map((admission) => (
                  <Card
                    key={admission.id}
                    className="p-4 bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <CheckCircleIcon className="h-8 w-8 text-green-500" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {admission.child_first_name} {admission.child_last_name}
                            </span>
                            {getStatusBadge(admission.status)}
                          </div>
                          <p className="text-sm text-gray-600">
                            {admission.parent1_first_name} {admission.parent1_last_name}
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-600">
                        <p>Début: {formatDate(admission.start_date)}</p>
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
