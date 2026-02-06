'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import {
  applicationService,
  type Application,
  type ApplicationPriority
} from '@/lib/services/application.service'
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  QueueListIcon,
  StarIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'

export default function ReviewApplicationPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const router = useRouter()
  const params = useParams()
  const applicationId = params.id as string

  const [application, setApplication] = useState<Application | null>(null)
  const [priorities, setPriorities] = useState<ApplicationPriority[]>([])
  const [totalPriority, setTotalPriority] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDecision, setSelectedDecision] = useState<'accept' | 'reject' | 'waiting_list' | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => {
    if (applicationId) {
      loadData()
    }
  }, [applicationId])

  async function loadData() {
    try {
      setLoading(true)
      const [appData, prioritiesData, totalScore] = await Promise.all([
        applicationService.getById(applicationId),
        applicationService.getPriorities(applicationId),
        applicationService.calculateTotalPriority(applicationId)
      ])
      setApplication(appData)
      setPriorities(prioritiesData)
      setTotalPriority(totalScore)

      // Mark as under review if still received
      if (appData.status === 'received') {
        await applicationService.markUnderReview(applicationId)
        appData.status = 'under_review'
        setApplication(appData)
      }
    } catch (err) {
      console.error('Error loading application:', err)
      setError('Erreur lors du chargement de la demande.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedDecision || !session?.user?.id) return

    // Validate rejection reason
    if (selectedDecision === 'reject' && !rejectionReason.trim()) {
      setError('Veuillez indiquer un motif de refus.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await applicationService.review(
        applicationId,
        selectedDecision,
        session.user.id,
        selectedDecision === 'reject' ? rejectionReason : undefined
      )

      // Redirect based on decision
      if (selectedDecision === 'waiting_list') {
        router.push('/owner/waiting-list')
      } else {
        router.push('/owner/applications')
      }
    } catch (err) {
      console.error('Error reviewing application:', err)
      setError('Erreur lors de l\'examen de la demande. Veuillez réessayer.')
    } finally {
      setSubmitting(false)
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  function getPriorityLabel(type: string): string {
    const labels: Record<string, string> = {
      sibling: 'Fratrie',
      single_parent: 'Parent isolé',
      special_needs: 'Besoins spéciaux',
      employee_child: 'Enfant d\'employé',
      local_resident: 'Résident local',
      low_income: 'Revenus modestes',
      other: 'Autre'
    }
    return labels[type] || type
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f4a5a5] mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (error && !application) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erreur</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => router.push('/owner/applications')}>
            Retour à la liste
          </Button>
        </div>
      </div>
    )
  }

  if (!application) return null

  // Check if application can be reviewed
  if (application.status !== 'received' && application.status !== 'under_review') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Demande déjà traitée</h2>
          <p className="text-gray-600 mb-4">Cette demande a déjà été examinée.</p>
          <Button onClick={() => router.push(`/owner/applications/${application.id}`)}>
            Voir la demande
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <PageBreadcrumb
        items={[
          { label: 'Tableau de bord', href: '/owner/dashboard' },
          { label: 'Inscriptions', href: '/owner/applications' },
          { label: `${application.child_first_name} ${application.child_last_name}`, href: `/owner/applications/${application.id}` },
          { label: 'Examiner', href: `/owner/applications/${application.id}/review` }
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
          <h1 className="text-2xl font-bold text-gray-900">
            Examiner la Demande
          </h1>
          <p className="text-gray-600 mt-1">
            {application.child_first_name} {application.child_last_name}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Decision Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Error message */}
          {error && (
            <Card className="p-4 bg-red-50 border-red-200">
              <p className="text-red-800">{error}</p>
            </Card>
          )}

          {/* Decision Form */}
          <form onSubmit={handleSubmit}>
            <Card className="p-6 border-l-4 border-l-[#f4a5a5]">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Décision</h2>

              {/* Decision options */}
              <div className="space-y-4 mb-6">
                {/* Accept */}
                <div
                  onClick={() => setSelectedDecision('accept')}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedDecision === 'accept'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-green-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 ${selectedDecision === 'accept' ? 'text-green-600' : 'text-gray-400'}`}>
                      <CheckCircleIcon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">Accepter</h3>
                      <p className="text-sm text-gray-600">
                        La demande est acceptée. L'enfant sera admis directement.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Waiting List */}
                <div
                  onClick={() => setSelectedDecision('waiting_list')}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedDecision === 'waiting_list'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 ${selectedDecision === 'waiting_list' ? 'text-purple-600' : 'text-gray-400'}`}>
                      <QueueListIcon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">Liste d'attente</h3>
                      <p className="text-sm text-gray-600">
                        La demande est acceptée mais il n'y a pas de place disponible actuellement. L'enfant sera ajouté à la liste d'attente.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Reject */}
                <div
                  onClick={() => setSelectedDecision('reject')}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedDecision === 'reject'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-red-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 ${selectedDecision === 'reject' ? 'text-red-600' : 'text-gray-400'}`}>
                      <XCircleIcon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">Refuser</h3>
                      <p className="text-sm text-gray-600">
                        La demande est refusée. Vous devez indiquer un motif.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rejection reason */}
              {selectedDecision === 'reject' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Motif du refus <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Indiquez la raison du refus de la demande..."
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-4 mt-6 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={submitting}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={!selectedDecision || submitting}
                  className="bg-[#f4a5a5] hover:bg-[#f4a5a5]/90 text-gray-900"
                >
                  {submitting ? 'Enregistrement...' : 'Confirmer la décision'}
                </Button>
              </div>
            </Card>
          </form>
        </div>

        {/* Sidebar - Application Summary */}
        <div className="space-y-6">
          {/* Priority Score */}
          {totalPriority > 0 && (
            <Card className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
              <div className="flex items-center gap-3">
                <StarIcon className="h-8 w-8 text-yellow-600" />
                <div>
                  <p className="text-sm text-gray-600">Score de priorité</p>
                  <p className="text-2xl font-bold text-yellow-700">{totalPriority} pts</p>
                </div>
              </div>
            </Card>
          )}

          {/* Application Info */}
          <Card className="p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Résumé</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-600">Enfant</p>
                <p className="font-medium text-gray-900">
                  {application.child_first_name} {application.child_last_name}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Parent</p>
                <p className="font-medium text-gray-900">
                  {application.parent1_first_name} {application.parent1_last_name}
                </p>
                <p className="text-gray-600 text-xs">{application.parent1_email}</p>
              </div>
              <div>
                <p className="text-gray-600">Date souhaitée d'entrée</p>
                <p className="font-medium text-gray-900">{formatDate(application.desired_start_date)}</p>
              </div>
              {application.desired_contract_type && (
                <div>
                  <p className="text-gray-600">Type de contrat</p>
                  <p className="font-medium text-gray-900 capitalize">
                    {application.desired_contract_type === 'regular' ? 'Régulier' :
                     application.desired_contract_type === 'occasional' ? 'Occasionnel' :
                     application.desired_contract_type === 'emergency' ? 'Urgence' :
                     application.desired_contract_type}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Priorities */}
          {priorities.length > 0 && (
            <Card className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Priorités</h2>
              <div className="space-y-2">
                {priorities.map((priority) => (
                  <div key={priority.id} className="flex items-center justify-between p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <span className="text-sm text-gray-900">{getPriorityLabel(priority.priority_type)}</span>
                    <Badge className="bg-yellow-100 text-yellow-800">
                      +{priority.priority_score}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Special Needs Alert */}
          {application.special_needs && (
            <Card className="p-4 bg-yellow-50 border-yellow-200">
              <h3 className="font-medium text-yellow-900 mb-2">⚠️ Besoins spécifiques</h3>
              <p className="text-sm text-yellow-800">{application.special_needs}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
