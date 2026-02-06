'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { LockClosedIcon, CheckIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/contexts/AuthContext'
import { modulesService } from '@/lib/services/modules.service'
import type { Module, ModuleAccessRequest } from '@/types/database.types'

// Feature lists for each module
const MODULE_FEATURES: Record<string, string[]> = {
  cleaning: [
    'Gestion complète des pièces et zones',
    'Tâches personnalisées par pièce',
    'Sessions quotidiennes avec suivi temps réel',
    'Historique complet avec recherche',
    'Photos avant/après',
    'Exports PDF et ZIP'
  ],
  haccp: [
    'Suivi des enfants et régimes alimentaires',
    'Gestion des repas et traçabilité',
    'Contrôles de températures automatisés',
    'Gestion produits et fournisseurs',
    'Équipements et maintenance',
    'Documents et non-conformités',
    'Rapports HACCP réglementaires'
  ],
  children: [
    'Dossier complet par enfant',
    'Gestion des familles et contacts',
    'Organisation par sections',
    'Suivi des autorisations',
    'Informations de santé',
    'Documents administratifs'
  ],
  attendance: [
    'Pointages arrivée/départ',
    'Journal des activités',
    'Suivi des observations',
    'Rapports quotidiens automatiques',
    'Notifications parents'
  ],
  staff: [
    'Gestion des qualifications',
    'Planning du personnel',
    'Suivi des absences',
    'Conformité réglementaire (ratios)',
    'Documents RH',
    'Disponibilités et affectations'
  ],
  enrollment: [
    'Pré-inscriptions en ligne',
    'Liste d\'attente avec priorisation',
    'Processus d\'admission',
    'Contrats d\'accueil personnalisés',
    'Grilles tarifaires (PSU, PAJE, privé)',
    'Avenants et résiliations'
  ],
  billing: [
    'Facturation automatique',
    'Suivi des paiements',
    'Relances automatiques',
    'Comptabilité intégrée',
    'Exports comptables',
    'Rapports financiers'
  ],
  parent_portal: [
    'Application mobile parents',
    'Suivi en temps réel',
    'Photos et activités quotidiennes',
    'Messagerie instantanée',
    'Documents partagés',
    'Notifications push'
  ]
}

export default function LockedModulePage() {
  const params = useParams()
  const router = useRouter()
  const { session } = useAuth()
  const moduleId = params.moduleId as string

  const [module, setModule] = useState<Module | null>(null)
  const [pendingRequest, setPendingRequest] = useState<ModuleAccessRequest | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      if (!session?.enterprise?.id) {
        router.push('/owner/dashboard')
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        // Fetch module details
        const moduleData = await modulesService.getModuleById(moduleId)
        if (!moduleData) {
          setError('Module introuvable')
          return
        }
        setModule(moduleData)

        // Check for pending request
        const hasPending = await modulesService.hasPendingRequest(
          session.enterprise.id,
          moduleId
        )

        if (hasPending) {
          // Fetch the full request details
          const requests = await modulesService.getEnterpriseRequests(session.enterprise.id)
          const pending = requests.find(
            (r) => r.module_id === moduleId && r.status === 'pending'
          )
          setPendingRequest(pending || null)
        }
      } catch (err) {
        console.error('Error loading module data:', err)
        setError('Erreur lors du chargement des données')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [moduleId, session?.enterprise?.id, router])

  async function handleRequestAccess() {
    if (!session?.enterprise?.id || !session?.user?.id || !module) return

    try {
      setIsSubmitting(true)
      setError(null)
      setSuccess(null)

      await modulesService.requestModuleAccess(
        session.enterprise.id,
        moduleId,
        session.user.id,
        message || undefined
      )

      setSuccess('Demande envoyée avec succès!')
      setMessage('')

      // Reload to show pending state
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (err: any) {
      console.error('Error requesting access:', err)
      setError(err.message || 'Erreur lors de l\'envoi de la demande')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (error && !module) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Erreur</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{error}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push('/owner/dashboard')} variant="outline">
              Retour au tableau de bord
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (!module) return null

  const features = MODULE_FEATURES[moduleId] || []

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header with Lock Icon */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 mb-4">
          <LockClosedIcon className="w-10 h-10 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{module.name}</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">{module.description}</p>
      </div>

      {/* Pricing Badge */}
      <div className="flex justify-center mb-8">
        <Badge variant="secondary" className="text-lg px-6 py-2">
          {module.is_free ? (
            'Gratuit'
          ) : (
            <>
              {module.price_monthly}€ <span className="text-sm font-normal ml-1">/ mois</span>
            </>
          )}
        </Badge>
      </div>

      {/* Features List */}
      {features.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Fonctionnalités incluses</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {features.map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <CheckIcon className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Request Access Form or Pending Status */}
      {pendingRequest ? (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardHeader>
            <CardTitle className="text-yellow-800">Demande en attente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-yellow-700">
              Votre demande d'accès à ce module a été envoyée le{' '}
              {new Date(pendingRequest.created_at).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
              . Vous serez notifié dès qu'elle sera traitée.
            </p>
            {pendingRequest.message && (
              <div className="mt-4 p-3 bg-white rounded border border-yellow-200">
                <p className="text-sm font-medium text-gray-700 mb-1">Votre message:</p>
                <p className="text-sm text-gray-600">{pendingRequest.message}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Demander l'accès</CardTitle>
            <CardDescription>
              Envoyez une demande pour accéder à ce module. L'équipe de développement examinera votre
              demande et vous répondra rapidement.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
                {success}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="message">Message (optionnel)</Label>
              <Textarea
                id="message"
                placeholder="Expliquez pourquoi vous souhaitez accéder à ce module..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                disabled={isSubmitting}
              />
            </div>
          </CardContent>
          <CardFooter className="flex gap-3">
            <Button
              onClick={handleRequestAccess}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Envoi en cours...' : 'Demander l\'accès'}
            </Button>
            <Button
              onClick={() => router.push('/owner/dashboard')}
              variant="outline"
              disabled={isSubmitting}
            >
              Retour
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Additional Info */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>
          Une fois votre demande approuvée, vous aurez immédiatement accès à toutes les
          fonctionnalités de ce module.
        </p>
      </div>
    </div>
  )
}
