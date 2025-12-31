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
  DocumentTextIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  CalendarIcon,
  ClockIcon,
  StarIcon,
  PencilIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'

export default function ApplicationDetailPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const router = useRouter()
  const params = useParams()
  const applicationId = params.id as string

  const [application, setApplication] = useState<Application | null>(null)
  const [priorities, setPriorities] = useState<ApplicationPriority[]>([])
  const [totalPriority, setTotalPriority] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
    } catch (err) {
      console.error('Error loading application:', err)
      setError('Erreur lors du chargement de la demande.')
    } finally {
      setLoading(false)
    }
  }

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

  function calculateAge(birthDate: string): string {
    const birth = new Date(birthDate)
    const today = new Date()
    const months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth())

    if (months < 12) {
      return `${months} mois`
    } else {
      const years = Math.floor(months / 12)
      const remainingMonths = months % 12
      return remainingMonths > 0 ? `${years} an${years > 1 ? 's' : ''} ${remainingMonths} mois` : `${years} an${years > 1 ? 's' : ''}`
    }
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

  if (error || !application) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Demande non trouvée</h2>
          <p className="text-gray-600 mb-4">{error || 'Cette demande n\'existe pas.'}</p>
          <Button onClick={() => router.push('/owner/applications')}>
            Retour à la liste
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
          { label: `${application.child_first_name} ${application.child_last_name}`, href: `/owner/applications/${application.id}` }
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
              <h1 className="text-3xl font-bold text-gray-900">
                {application.child_first_name} {application.child_last_name}
              </h1>
              {getStatusBadge(application.status)}
            </div>
            <p className="text-gray-600">
              Demande du {formatDate(application.application_date)}
            </p>
          </div>
        </div>

        {(application.status === 'received' || application.status === 'under_review') && (
          <Button
            onClick={() => router.push(`/owner/applications/${application.id}/review`)}
            className="bg-[#f4a5a5] hover:bg-[#f4a5a5]/90 text-gray-900"
          >
            <PencilIcon className="h-5 w-5 mr-2" />
            Examiner
          </Button>
        )}
      </div>

      {/* Priority Score */}
      {totalPriority > 0 && (
        <Card className="p-4 mb-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
          <div className="flex items-center gap-3">
            <StarIcon className="h-8 w-8 text-yellow-600" />
            <div>
              <p className="text-sm text-gray-600">Score de priorité total</p>
              <p className="text-2xl font-bold text-yellow-700">{totalPriority} points</p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Child Information */}
          <Card className="p-6 border-l-4 border-l-[#f4a5a5]">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Informations de l'Enfant</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Nom complet</p>
                <p className="font-medium text-gray-900">
                  {application.child_first_name} {application.child_last_name}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Sexe</p>
                <p className="font-medium text-gray-900">
                  {application.child_gender === 'M' ? 'Masculin' : application.child_gender === 'F' ? 'Féminin' : 'Non spécifié'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Date de naissance</p>
                <p className="font-medium text-gray-900">{formatDate(application.child_birth_date)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Âge actuel</p>
                <p className="font-medium text-gray-900">{calculateAge(application.child_birth_date)}</p>
              </div>
            </div>
          </Card>

          {/* Parent 1 */}
          <Card className="p-6 border-l-4 border-l-[#f4a5a5]">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Parent 1</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <UserIcon className="h-5 w-5 text-gray-400" />
                <span className="font-medium text-gray-900">
                  {application.parent1_first_name} {application.parent1_last_name}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                <a href={`mailto:${application.parent1_email}`} className="text-blue-600 hover:underline">
                  {application.parent1_email}
                </a>
              </div>
              <div className="flex items-center gap-3">
                <PhoneIcon className="h-5 w-5 text-gray-400" />
                <a href={`tel:${application.parent1_phone}`} className="text-blue-600 hover:underline">
                  {application.parent1_phone}
                </a>
              </div>
            </div>
          </Card>

          {/* Parent 2 */}
          {application.parent2_first_name && (
            <Card className="p-6 border-l-4 border-l-[#f4a5a5]">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Parent 2</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <UserIcon className="h-5 w-5 text-gray-400" />
                  <span className="font-medium text-gray-900">
                    {application.parent2_first_name} {application.parent2_last_name}
                  </span>
                </div>
                {application.parent2_email && (
                  <div className="flex items-center gap-3">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                    <a href={`mailto:${application.parent2_email}`} className="text-blue-600 hover:underline">
                      {application.parent2_email}
                    </a>
                  </div>
                )}
                {application.parent2_phone && (
                  <div className="flex items-center gap-3">
                    <PhoneIcon className="h-5 w-5 text-gray-400" />
                    <a href={`tel:${application.parent2_phone}`} className="text-blue-600 hover:underline">
                      {application.parent2_phone}
                    </a>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Address */}
          {application.address && (
            <Card className="p-6 border-l-4 border-l-[#f4a5a5]">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Adresse</h2>
              <div className="flex items-start gap-3">
                <MapPinIcon className="h-5 w-5 text-gray-400 mt-1" />
                <div>
                  <p className="text-gray-900">{application.address}</p>
                  <p className="text-gray-900">
                    {application.postal_code} {application.city}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Motivation & Special Needs */}
          {(application.motivation_letter || application.special_needs) && (
            <Card className="p-6 border-l-4 border-l-[#f4a5a5]">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Informations Complémentaires</h2>
              <div className="space-y-4">
                {application.motivation_letter && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Lettre de motivation</p>
                    <p className="text-gray-900 whitespace-pre-wrap">{application.motivation_letter}</p>
                  </div>
                )}
                {application.special_needs && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm font-medium text-yellow-900 mb-1">Besoins spécifiques</p>
                    <p className="text-yellow-800 whitespace-pre-wrap">{application.special_needs}</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Notes */}
          {application.notes && (
            <Card className="p-6 border-l-4 border-l-gray-400">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Notes Internes</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{application.notes}</p>
            </Card>
          )}

          {/* Rejection Reason */}
          {application.status === 'rejected' && application.rejection_reason && (
            <Card className="p-6 bg-red-50 border-red-200">
              <h2 className="text-xl font-bold text-red-900 mb-4">Motif de refus</h2>
              <p className="text-red-800 whitespace-pre-wrap">{application.rejection_reason}</p>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Request Details */}
          <Card className="p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Détails de la Demande</h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <CalendarIcon className="h-4 w-4" />
                  <span>Date souhaitée d'entrée</span>
                </div>
                <p className="font-medium text-gray-900">{formatDate(application.desired_start_date)}</p>
              </div>

              {application.desired_contract_type && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Type de contrat</p>
                  <p className="font-medium text-gray-900 capitalize">
                    {application.desired_contract_type === 'regular' ? 'Régulier' :
                     application.desired_contract_type === 'occasional' ? 'Occasionnel' :
                     application.desired_contract_type === 'emergency' ? 'Urgence' :
                     application.desired_contract_type}
                  </p>
                </div>
              )}

              {application.desired_schedule && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Horaires souhaités</p>
                  <p className="font-medium text-gray-900">{application.desired_schedule}</p>
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <ClockIcon className="h-4 w-4" />
                  <span>Date de demande</span>
                </div>
                <p className="font-medium text-gray-900">{formatDate(application.application_date)}</p>
              </div>

              {application.reviewed_at && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Date d'examen</p>
                  <p className="font-medium text-gray-900">{formatDate(application.reviewed_at)}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Priorities */}
          <Card className="p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Critères de Priorité</h2>
            {priorities.length === 0 ? (
              <p className="text-sm text-gray-600">Aucun critère de priorité ajouté.</p>
            ) : (
              <div className="space-y-3">
                {priorities.map((priority) => (
                  <div key={priority.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-gray-900">{getPriorityLabel(priority.priority_type)}</p>
                      <Badge className="bg-yellow-100 text-yellow-800">
                        +{priority.priority_score}
                      </Badge>
                    </div>
                    {priority.verified && (
                      <p className="text-xs text-green-600">✓ Vérifié</p>
                    )}
                    {priority.notes && (
                      <p className="text-sm text-gray-600 mt-2">{priority.notes}</p>
                    )}
                  </div>
                ))}
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900">Total</span>
                    <span className="text-xl font-bold text-yellow-700">{totalPriority} pts</span>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
