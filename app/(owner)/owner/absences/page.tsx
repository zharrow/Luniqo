'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import {
  StaffPlanningService,
  type AbsenceWithEmployee
} from '@/lib/services/staff-planning.service'
import {
  CalendarIcon,
  ClockIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'

const staffPlanningService = new StaffPlanningService()

const ABSENCE_TYPES = [
  { value: 'vacation', label: 'Congés payés' },
  { value: 'sick_leave', label: 'Arrêt maladie' },
  { value: 'unpaid_leave', label: 'Congé sans solde' },
  { value: 'maternity_leave', label: 'Congé maternité' },
  { value: 'paternity_leave', label: 'Congé paternité' },
  { value: 'family_event', label: 'Événement familial' },
  { value: 'training', label: 'Formation' },
  { value: 'other', label: 'Autre' }
]

export default function AbsencesPage() {
  const router = useRouter()
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery, isLoading: nurseryLoading } = useNursery()
  const [absences, setAbsences] = useState<AbsenceWithEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'cancelled'>('all')

  useEffect(() => {
    if (session?.user?.id && selectedNursery?.id) {
      loadData()
    } else if (!authLoading && !nurseryLoading) {
      setLoading(false)
    }
  }, [session?.user?.id, selectedNursery?.id, filter, authLoading, nurseryLoading])

  async function loadData() {
    if (!selectedNursery?.id) return

    try {
      setLoading(true)

      const absencesData = await staffPlanningService.getAbsencesByNursery(
        selectedNursery.id,
        filter === 'all' ? undefined : filter
      )

      setAbsences(absencesData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  function getStatusBadgeVariant(status: string): 'default' | 'success' | 'warning' | 'destructive' {
    switch (status) {
      case 'approved':
        return 'success'
      case 'rejected':
        return 'destructive'
      case 'cancelled':
        return 'destructive'
      case 'pending':
        return 'warning'
      default:
        return 'default'
    }
  }

  function getStatusLabel(status: string): string {
    switch (status) {
      case 'pending':
        return 'En attente'
      case 'approved':
        return 'Approuvée'
      case 'rejected':
        return 'Rejetée'
      case 'cancelled':
        return 'Annulée'
      default:
        return status
    }
  }

  function getAbsenceTypeLabel(type: string): string {
    return ABSENCE_TYPES.find((t) => t.value === type)?.label || type
  }

  function getDaysBetween(startDate: string, endDate: string): number {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays + 1 // Include both start and end dates
  }

  if (authLoading || nurseryLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!selectedNursery) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center max-w-md">
          <p className="text-lg font-medium mb-2">Aucune crèche sélectionnée</p>
          <p className="text-sm text-muted-foreground mb-4">
            Veuillez sélectionner une crèche dans le menu
          </p>
        </Card>
      </div>
    )
  }

  const pendingCount = absences.filter((a) => a.status === 'pending').length
  const approvedCount = absences.filter((a) => a.status === 'approved').length
  const rejectedCount = absences.filter((a) => a.status === 'rejected').length

  // Get upcoming absences (approved, starting in the future)
  const today = new Date().toISOString().split('T')[0]
  const upcomingAbsences = absences.filter(
    (a) => a.status === 'approved' && a.start_date >= today
  )

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Breadcrumb */}
      <PageBreadcrumb
        items={[
          { label: 'Accueil', href: '/owner/dashboard' },
          { label: 'Absences', href: '/owner/absences' }
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-50 rounded-xl">
            <CalendarIcon className="h-8 w-8 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestion des absences</h1>
            <p className="text-gray-600">{selectedNursery.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/owner/absences/calendar')}
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            Vue calendrier
          </Button>
          <Button onClick={() => router.push('/owner/absences/requests')}>
            Demandes en attente
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">En attente</p>
              <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
            </div>
            <ClockIcon className="h-10 w-10 text-yellow-400" />
          </div>
        </Card>
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Approuvées</p>
              <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
            </div>
            <CheckCircleIcon className="h-10 w-10 text-green-400" />
          </div>
        </Card>
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Rejetées</p>
              <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
            </div>
            <XCircleIcon className="h-10 w-10 text-red-400" />
          </div>
        </Card>
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">À venir</p>
              <p className="text-2xl font-bold text-blue-600">{upcomingAbsences.length}</p>
            </div>
            <UserGroupIcon className="h-10 w-10 text-blue-400" />
          </div>
        </Card>
      </div>

      {/* Alert for pending requests */}
      {pendingCount > 0 && (
        <Card className="p-4 mb-6 bg-yellow-50 border-yellow-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
              <div>
                <h3 className="font-semibold text-yellow-900">
                  {pendingCount} demande{pendingCount > 1 ? 's' : ''} en attente
                </h3>
                <p className="text-sm text-yellow-700">
                  Ces demandes doivent être approuvées ou rejetées
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/owner/absences/requests')}
            >
              Traiter
              <ArrowRightIcon className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
          size="sm"
        >
          Toutes
        </Button>
        <Button
          variant={filter === 'pending' ? 'default' : 'outline'}
          onClick={() => setFilter('pending')}
          size="sm"
        >
          En attente ({pendingCount})
        </Button>
        <Button
          variant={filter === 'approved' ? 'default' : 'outline'}
          onClick={() => setFilter('approved')}
          size="sm"
        >
          Approuvées ({approvedCount})
        </Button>
        <Button
          variant={filter === 'rejected' ? 'default' : 'outline'}
          onClick={() => setFilter('rejected')}
          size="sm"
        >
          Rejetées ({rejectedCount})
        </Button>
      </div>

      {/* Absences List */}
      {absences.length === 0 ? (
        <Card className="p-12 text-center">
          <CalendarIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Aucune absence</h3>
          <p className="text-sm text-muted-foreground">
            {filter === 'all'
              ? 'Aucune demande d\'absence pour le moment'
              : `Aucune absence avec le statut "${filter}"`}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {absences.map((absence) => {
            const days = getDaysBetween(absence.start_date, absence.end_date)

            return (
              <Card
                key={absence.id}
                className={`p-6 ${
                  absence.status === 'pending'
                    ? 'bg-yellow-50 border-yellow-200'
                    : absence.status === 'rejected'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {absence.employee_name}
                      </h3>
                      <Badge variant={getStatusBadgeVariant(absence.status)}>
                        {getStatusLabel(absence.status)}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                      <div>
                        <p className="text-gray-600">Type</p>
                        <p className="font-medium">
                          {getAbsenceTypeLabel(absence.absence_type)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Du</p>
                        <p className="font-medium">
                          {new Date(absence.start_date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Au</p>
                        <p className="font-medium">
                          {new Date(absence.end_date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Durée</p>
                        <p className="font-medium">
                          {absence.is_partial_day
                            ? `${absence.partial_hours}h`
                            : `${days} jour${days > 1 ? 's' : ''}`}
                        </p>
                      </div>
                    </div>

                    {absence.replacement_name && (
                      <div className="flex items-center gap-2 mb-3">
                        <UserGroupIcon className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">Remplaçant:</span>
                        <span className="text-sm font-medium">{absence.replacement_name}</span>
                      </div>
                    )}

                    {absence.notes && (
                      <p className="text-sm text-gray-600 italic mb-3">{absence.notes}</p>
                    )}

                    {absence.status === 'rejected' && absence.rejection_reason && (
                      <div className="flex items-start gap-2 p-3 bg-red-100 border border-red-200 rounded-md">
                        <XCircleIcon className="h-5 w-5 text-red-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-red-900">Raison du rejet:</p>
                          <p className="text-sm text-red-700">{absence.rejection_reason}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-3">
                      <span>Demandée le {new Date(absence.requested_at).toLocaleDateString('fr-FR')}</span>
                      {absence.reviewed_at && (
                        <span>
                          Traitée le {new Date(absence.reviewed_at).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
