'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { usersService } from '@/lib/services/users.service'
import {
  StaffPlanningService,
  type AbsenceWithEmployee
} from '@/lib/services/staff-planning.service'
import {
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowLeftIcon,
  UserGroupIcon,
  ClockIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'
import { FormDialog } from '@/components/shared/FormDialog'

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

export default function AbsenceRequestsPage() {
  const router = useRouter()
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery, isLoading: nurseryLoading } = useNursery()
  const [absences, setAbsences] = useState<AbsenceWithEmployee[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAbsence, setSelectedAbsence] = useState<AbsenceWithEmployee | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showReplacementDialog, setShowReplacementDialog] = useState(false)
  const [showRejectionDialog, setShowRejectionDialog] = useState(false)
  const [replacementId, setReplacementId] = useState('')
  const [replacementNotes, setReplacementNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => {
    if (session?.user?.id && selectedNursery?.id) {
      loadData()
    } else if (!authLoading && !nurseryLoading) {
      setLoading(false)
    }
  }, [session?.user?.id, selectedNursery?.id, authLoading, nurseryLoading])

  async function loadData() {
    if (!selectedNursery?.id || !session?.enterprise?.id) return

    try {
      setLoading(true)

      const [absencesData, employeesData] = await Promise.all([
        staffPlanningService.getPendingAbsences(selectedNursery.id),
        usersService.getActiveEmployeesByNursery(selectedNursery.id)
      ])

      setAbsences(absencesData)
      setEmployees(employeesData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  function openApprovalDialog(absence: AbsenceWithEmployee) {
    setSelectedAbsence(absence)
    setActionType('approve')
    setReplacementId('')
    setReplacementNotes('')
    setShowReplacementDialog(true)
  }

  function openRejectionDialog(absence: AbsenceWithEmployee) {
    setSelectedAbsence(absence)
    setActionType('reject')
    setRejectionReason('')
    setShowRejectionDialog(true)
  }

  async function handleApprove() {
    if (!selectedAbsence || !session?.user?.id) return

    try {
      setIsSubmitting(true)
      await staffPlanningService.approveAbsence(selectedAbsence.id, session.user.id)

      // Assign replacement if provided
      if (replacementId) {
        await staffPlanningService.assignReplacement(
          selectedAbsence.id,
          replacementId,
          replacementNotes || undefined
        )
      }

      await loadData()
      setShowReplacementDialog(false)
      setSelectedAbsence(null)
      setReplacementId('')
      setReplacementNotes('')
    } catch (error) {
      console.error('Error approving absence:', error)
      alert('Erreur lors de l\'approbation')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleReject() {
    if (!selectedAbsence || !session?.user?.id) return

    try {
      setIsSubmitting(true)
      await staffPlanningService.rejectAbsence(
        selectedAbsence.id,
        session.user.id,
        rejectionReason || 'Absence non approuvée'
      )

      await loadData()
      setShowRejectionDialog(false)
      setSelectedAbsence(null)
      setRejectionReason('')
    } catch (error) {
      console.error('Error rejecting absence:', error)
      alert('Erreur lors du rejet')
    } finally {
      setIsSubmitting(false)
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
    return diffDays + 1
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

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Breadcrumb */}
      <PageBreadcrumb
        items={[
          { label: 'Accueil', href: '/owner/dashboard' },
          { label: 'Absences', href: '/owner/absences' },
          { label: 'Demandes en attente', href: '/owner/absences/requests' }
        ]}
      />

      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push('/owner/absences')}
        className="mb-4"
      >
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Retour aux absences
      </Button>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-yellow-50 rounded-xl">
            <ClockIcon className="h-8 w-8 text-yellow-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Demandes en attente</h1>
            <p className="text-gray-600">{absences.length} demande{absences.length > 1 ? 's' : ''} à traiter</p>
          </div>
        </div>
      </div>

      {/* Pending Requests List */}
      {absences.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Aucune demande en attente</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Toutes les demandes d'absence ont été traitées
          </p>
          <Button variant="outline" onClick={() => router.push('/owner/absences')}>
            Voir toutes les absences
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {absences.map((absence) => {
            const days = getDaysBetween(absence.start_date, absence.end_date)

            return (
              <Card key={absence.id} className="p-6 bg-yellow-50 border-yellow-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {absence.employee_name}
                      </h3>
                      <Badge variant="warning">En attente</Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
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

                    {absence.notes && (
                      <div className="flex items-start gap-2 p-3 bg-white border border-yellow-200 rounded-md mb-4">
                        <DocumentTextIcon className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Notes:</p>
                          <p className="text-sm text-gray-700">{absence.notes}</p>
                        </div>
                      </div>
                    )}

                    {absence.justification_required && (
                      <div className="flex items-center gap-2 mb-4">
                        <Badge variant="default">Justificatif requis</Badge>
                        {absence.justification_document_url && (
                          <Badge variant="success">Justificatif fourni</Badge>
                        )}
                      </div>
                    )}

                    <div className="text-xs text-gray-500">
                      Demandée le {new Date(absence.requested_at).toLocaleDateString('fr-FR')}
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      onClick={() => openApprovalDialog(absence)}
                      className="border-green-300 text-green-700 hover:bg-green-50"
                    >
                      <CheckCircleIcon className="h-4 w-4 mr-1" />
                      Approuver
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => openRejectionDialog(absence)}
                      className="border-red-300 text-red-700 hover:bg-red-50"
                    >
                      <XCircleIcon className="h-4 w-4 mr-1" />
                      Rejeter
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Approval Dialog (with optional replacement) */}
      <FormDialog
        isOpen={showReplacementDialog}
        onClose={() => setShowReplacementDialog(false)}
        title="Approuver l'absence"
        onSubmit={(e) => {
          e.preventDefault()
          handleApprove()
        }}
        isSubmitting={isSubmitting}
      >
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-900">
              Vous êtes sur le point d'approuver cette demande d'absence.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Assigner un remplaçant (optionnel)
            </label>
            <select
              className="w-full border rounded-md px-3 py-2"
              value={replacementId}
              onChange={(e) => setReplacementId(e.target.value)}
            >
              <option value="">Pas de remplaçant</option>
              {employees
                .filter((e) => e.id !== selectedAbsence?.employee_id)
                .map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.first_name} {employee.last_name}
                  </option>
                ))}
            </select>
          </div>

          {replacementId && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Notes pour le remplaçant
              </label>
              <textarea
                className="w-full border rounded-md px-3 py-2 min-h-[80px]"
                value={replacementNotes}
                onChange={(e) => setReplacementNotes(e.target.value)}
                placeholder="Instructions ou informations pour le remplaçant..."
              />
            </div>
          )}
        </div>
      </FormDialog>

      {/* Rejection Dialog */}
      <FormDialog
        isOpen={showRejectionDialog}
        onClose={() => setShowRejectionDialog(false)}
        title="Rejeter l'absence"
        onSubmit={(e) => {
          e.preventDefault()
          handleReject()
        }}
        isSubmitting={isSubmitting}
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-900">
              Vous êtes sur le point de rejeter cette demande d'absence. L'employé sera notifié.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Raison du rejet *</label>
            <textarea
              className="w-full border rounded-md px-3 py-2 min-h-[100px]"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="ex: Surcharge de travail prévue, manque de personnel, dates non disponibles..."
              required
            />
          </div>
        </div>
      </FormDialog>
    </div>
  )
}
