'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import {
  admissionService,
  type AdmissionWithDetails
} from '@/lib/services/admission.service'
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'

export default function CompleteAdmissionPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const router = useRouter()
  const params = useParams()
  const admissionId = params.id as string

  const [admission, setAdmission] = useState<AdmissionWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    if (admissionId) {
      loadData()
    }
  }, [admissionId])

  async function loadData() {
    try {
      setLoading(true)
      const admissionData = await admissionService.getByIdWithDetails(admissionId)
      setAdmission(admissionData)

      // Check if already completed
      if (admissionData.child_id && admissionData.family_id) {
        setCompleted(true)
      }
    } catch (err) {
      console.error('Error loading admission:', err)
      setError('Erreur lors du chargement de l\'admission.')
    } finally {
      setLoading(false)
    }
  }

  async function handleComplete() {
    if (!admission) return

    // Validate
    if (!admission.section_id) {
      setError('Une section doit être assignée avant de finaliser l\'admission.')
      return
    }

    setCompleting(true)
    setError(null)

    try {
      // Create family and child from application
      const result = await admissionService.createFamilyAndChild(admissionId)

      // Complete the admission
      await admissionService.complete(admissionId)

      setCompleted(true)

      // Redirect after a short delay to show success
      setTimeout(() => {
        router.push(`/owner/children/${result.child_id}`)
      }, 2000)
    } catch (err) {
      console.error('Error completing admission:', err)
      setError('Erreur lors de la finalisation de l\'admission. Veuillez réessayer.')
    } finally {
      setCompleting(false)
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#64b5d1] mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (error && !admission) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erreur</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => router.push('/owner/admissions')}>
            Retour à la liste
          </Button>
        </div>
      </div>
    )
  }

  if (!admission) return null

  if (completed) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-12 text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircleIcon className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Admission Finalisée !</h2>
          <p className="text-gray-600 mb-6">
            Le dossier enfant et famille a été créé avec succès.
          </p>
          <p className="text-sm text-gray-500">
            Redirection en cours...
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <PageBreadcrumb
        items={[
          { label: 'Tableau de bord', href: '/owner/dashboard' },
          { label: 'Admissions', href: '/owner/admissions' },
          { label: `${admission.child_first_name} ${admission.child_last_name}`, href: `/owner/admissions/${admission.id}` },
          { label: 'Finaliser', href: `/owner/admissions/${admission.id}/complete` }
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
          <h1 className="text-3xl font-bold text-gray-900">Finaliser l'Admission</h1>
          <p className="text-gray-600 mt-1">
            {admission.child_first_name} {admission.child_last_name}
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
          <ExclamationTriangleIcon className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">Important</h3>
            <p className="text-sm text-blue-800">
              La finalisation de l'admission va créer automatiquement le dossier famille et le dossier enfant
              à partir des informations de la demande d'inscription. Cette action est irréversible.
            </p>
          </div>
        </div>
      </Card>

      {/* Summary */}
      <Card className="p-6 mb-6 border-l-4 border-l-[#64b5d1]">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Récapitulatif</h2>

        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Enfant</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Nom complet</p>
                <p className="font-medium text-gray-900">
                  {admission.child_first_name} {admission.child_last_name}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Date de naissance</p>
                <p className="font-medium text-gray-900">{formatDate(admission.child_birth_date)}</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h3 className="font-medium text-gray-900 mb-2">Parent 1</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Nom complet</p>
                <p className="font-medium text-gray-900">
                  {admission.parent1_first_name} {admission.parent1_last_name}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Email</p>
                <p className="font-medium text-gray-900">{admission.parent1_email}</p>
              </div>
              <div>
                <p className="text-gray-600">Téléphone</p>
                <p className="font-medium text-gray-900">{admission.parent1_phone}</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h3 className="font-medium text-gray-900 mb-2">Admission</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Date de début</p>
                <p className="font-medium text-gray-900">{formatDate(admission.start_date)}</p>
              </div>
              <div>
                <p className="text-gray-600">Section</p>
                <p className="font-medium text-gray-900">
                  {admission.section_name || 'Non assignée'}
                </p>
              </div>
              {admission.room_name && (
                <div>
                  <p className="text-gray-600">Salle</p>
                  <p className="font-medium text-gray-900">{admission.room_name}</p>
                </div>
              )}
              <div>
                <p className="text-gray-600">Période d'adaptation</p>
                <p className="font-medium text-gray-900">{admission.trial_period_weeks} semaines</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* What will be created */}
      <Card className="p-6 mb-6 bg-green-50 border-green-200">
        <h2 className="text-lg font-bold text-green-900 mb-4">
          <CheckCircleIcon className="h-6 w-6 inline mr-2" />
          Ce qui va être créé
        </h2>
        <ul className="space-y-2 text-sm text-green-800">
          <li className="flex items-start gap-2">
            <span className="text-green-600">•</span>
            <span><strong>Dossier Famille</strong> avec les informations des parents</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600">•</span>
            <span><strong>Dossier Enfant</strong> rattaché à la famille</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600">•</span>
            <span><strong>Affectation à la section</strong> {admission.section_name}</span>
          </li>
          {admission.room_name && (
            <li className="flex items-start gap-2">
              <span className="text-green-600">•</span>
              <span><strong>Affectation à la salle</strong> {admission.room_name}</span>
            </li>
          )}
          <li className="flex items-start gap-2">
            <span className="text-green-600">•</span>
            <span><strong>Mise à jour du statut</strong> de l'admission à "Complétée"</span>
          </li>
        </ul>
      </Card>

      {/* Validation */}
      {!admission.section_id && (
        <Card className="p-6 mb-6 bg-yellow-50 border-yellow-200">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-yellow-900 mb-2">Action requise</h3>
              <p className="text-sm text-yellow-800">
                Vous devez assigner une section avant de finaliser l'admission.
                Retournez à la page précédente pour compléter cette information.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={completing}
        >
          Retour
        </Button>
        <Button
          onClick={handleComplete}
          disabled={completing || !admission.section_id}
          className="bg-green-500 hover:bg-green-600 text-white"
        >
          <CheckCircleIcon className="h-5 w-5 mr-2" />
          {completing ? 'Finalisation...' : 'Confirmer et Finaliser'}
        </Button>
      </div>
    </div>
  )
}
