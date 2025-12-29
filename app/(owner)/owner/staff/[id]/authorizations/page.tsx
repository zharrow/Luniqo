'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { usersService, type ProfileWithRooms } from '@/lib/services/users.service'
import {
  StaffHRService,
  type StaffAuthorization,
  type CreateAuthorizationInput
} from '@/lib/services/staff-hr.service'
import {
  ShieldCheckIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowLeftIcon,
  ShieldExclamationIcon
} from '@heroicons/react/24/outline'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { FormDialog } from '@/components/shared/FormDialog'
import { DeleteConfirmationDialog } from '@/components/shared/DeleteConfirmationDialog'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'

const staffHRService = new StaffHRService()

const AUTHORIZATION_TYPES = [
  { value: 'administer_medication', label: 'Administrer des médicaments' },
  { value: 'first_aid', label: 'Premiers secours' },
  { value: 'emergency_response', label: 'Réponse d\'urgence' },
  { value: 'open_facility', label: 'Ouverture de l\'établissement' },
  { value: 'close_facility', label: 'Fermeture de l\'établissement' },
  { value: 'handle_cash', label: 'Manipulation d\'argent' },
  { value: 'supervise_outings', label: 'Supervision des sorties' },
  { value: 'manage_meals', label: 'Gestion des repas' },
  { value: 'access_confidential', label: 'Accès aux documents confidentiels' },
  { value: 'approve_documents', label: 'Approbation de documents' },
  { value: 'manage_children', label: 'Gestion des dossiers enfants' },
  { value: 'temporary_director', label: 'Direction temporaire' }
]

export default function StaffAuthorizationsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery, isLoading: nurseryLoading } = useNursery()
  const [employee, setEmployee] = useState<ProfileWithRooms | null>(null)
  const [authorizations, setAuthorizations] = useState<StaffAuthorization[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [authorizationToRevoke, setAuthorizationToRevoke] = useState<StaffAuthorization | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRevoking, setIsRevoking] = useState(false)
  const [revocationReason, setRevocationReason] = useState('')
  const [showRevocationDialog, setShowRevocationDialog] = useState(false)
  const [formData, setFormData] = useState<Partial<CreateAuthorizationInput>>({
    authorization_type: 'first_aid',
    granted_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    notes: ''
  })

  useEffect(() => {
    if (session?.user?.id && selectedNursery?.id) {
      loadData()
    } else if (!authLoading && !nurseryLoading) {
      setLoading(false)
    }
  }, [resolvedParams.id, session?.user?.id, selectedNursery?.id, authLoading, nurseryLoading])

  async function loadData() {
    if (!selectedNursery?.id) return

    try {
      setLoading(true)

      // Load employee and authorizations
      const employeeData = await usersService.getEmployee(resolvedParams.id)
      const authorizationsData = await staffHRService.getAuthorizations(
        resolvedParams.id,
        selectedNursery.id
      )

      setEmployee(employeeData)
      setAuthorizations(authorizationsData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    setFormData({
      authorization_type: 'first_aid',
      granted_date: new Date().toISOString().split('T')[0],
      expiry_date: '',
      notes: ''
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!session?.user?.id || !selectedNursery?.id) return

    try {
      setIsSubmitting(true)

      // Create new authorization
      await staffHRService.grantAuthorization({
        employee_id: resolvedParams.id,
        nursery_id: selectedNursery.id,
        authorization_type: formData.authorization_type!,
        granted_date: formData.granted_date!,
        expiry_date: formData.expiry_date || undefined,
        granted_by_id: session.user.id,
        notes: formData.notes || undefined
      })

      await loadData()
      setShowModal(false)
    } catch (error) {
      console.error('Error saving authorization:', error)
      alert('Erreur lors de l\'enregistrement de l\'autorisation')
    } finally {
      setIsSubmitting(false)
    }
  }

  function openRevocationDialog(authorization: StaffAuthorization) {
    setAuthorizationToRevoke(authorization)
    setRevocationReason('')
    setShowRevocationDialog(true)
  }

  async function handleRevoke() {
    if (!authorizationToRevoke || !session?.user?.id) return

    try {
      setIsRevoking(true)
      await staffHRService.revokeAuthorization(
        authorizationToRevoke.id,
        session.user.id,
        revocationReason || 'Révoqué par la direction'
      )
      await loadData()
      setShowRevocationDialog(false)
      setAuthorizationToRevoke(null)
      setRevocationReason('')
    } catch (error) {
      console.error('Error revoking authorization:', error)
      alert('Erreur lors de la révocation')
    } finally {
      setIsRevoking(false)
    }
  }

  function getDaysUntilExpiry(expiryDate: string): number {
    return Math.ceil(
      (new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    )
  }

  function getInitials(employee: ProfileWithRooms | null): string {
    if (!employee) return ''
    const first = employee.first_name?.[0] || ''
    const last = employee.last_name?.[0] || ''
    return (first + last).toUpperCase()
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

  if (!employee) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center max-w-md">
          <p className="text-lg font-medium mb-2">Employé introuvable</p>
          <Button onClick={() => router.push('/owner/staff')}>
            Retour au personnel
          </Button>
        </Card>
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

  const activeAuthorizations = authorizations.filter((a) => !a.revoked)
  const revokedAuthorizations = authorizations.filter((a) => a.revoked)
  const expiringAuthorizations = activeAuthorizations.filter((a) => {
    if (!a.expiry_date) return false
    const days = getDaysUntilExpiry(a.expiry_date)
    return days > 0 && days <= 90
  })
  const expiredAuthorizations = activeAuthorizations.filter((a) => {
    if (!a.expiry_date) return false
    return getDaysUntilExpiry(a.expiry_date) < 0
  })

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Breadcrumb */}
      <PageBreadcrumb
        items={[
          { label: 'Accueil', href: '/owner/dashboard' },
          { label: 'Personnel', href: '/owner/staff' },
          { label: `${employee.first_name} ${employee.last_name}`, href: `/owner/staff/${employee.id}/qualifications` }
        ]}
      />

      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push('/owner/staff')}
        className="mb-4"
      >
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Retour au personnel
      </Button>

      {/* Employee Header */}
      <Card className="p-6 mb-6 bg-gradient-to-br from-blue-50 to-white border-blue-200">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 bg-blue-100">
            <AvatarImage src={employee.avatar_url || undefined} />
            <AvatarFallback className="text-2xl text-gray-700">
              {getInitials(employee)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {employee.first_name} {employee.last_name}
            </h1>
            <p className="text-gray-600 mb-2">{employee.email}</p>
            <div className="flex gap-2">
              {employee.is_active ? (
                <Badge variant="success">
                  <CheckCircleIcon className="h-3 w-3 mr-1" />
                  Actif
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <XCircleIcon className="h-3 w-3 mr-1" />
                  Inactif
                </Badge>
              )}
              <Badge variant="default">
                {selectedNursery.name}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 bg-green-50 border-green-200">
          <p className="text-sm text-gray-600 mb-1">Actives</p>
          <p className="text-2xl font-bold text-green-600">{activeAuthorizations.length}</p>
        </Card>
        <Card className="p-4 bg-orange-50 border-orange-200">
          <p className="text-sm text-gray-600 mb-1">À expirer (90j)</p>
          <p className="text-2xl font-bold text-orange-600">{expiringAuthorizations.length}</p>
        </Card>
        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-sm text-gray-600 mb-1">Expirées</p>
          <p className="text-2xl font-bold text-red-600">{expiredAuthorizations.length}</p>
        </Card>
        <Card className="p-4 bg-gray-50 border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Révoquées</p>
          <p className="text-2xl font-bold text-gray-600">{revokedAuthorizations.length}</p>
        </Card>
      </div>

      {/* Alerts */}
      {expiredAuthorizations.length > 0 && (
        <Card className="p-4 mb-6 bg-red-50 border-red-200">
          <div className="flex items-center gap-3">
            <XCircleIcon className="h-6 w-6 text-red-600" />
            <div>
              <h3 className="font-semibold text-red-900">
                {expiredAuthorizations.length} autorisation(s) expirée(s)
              </h3>
              <p className="text-sm text-red-700">
                Ces autorisations doivent être renouvelées ou révoquées
              </p>
            </div>
          </div>
        </Card>
      )}

      {expiringAuthorizations.length > 0 && (
        <Card className="p-4 mb-6 bg-orange-50 border-orange-200">
          <div className="flex items-center gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-orange-600" />
            <div>
              <h3 className="font-semibold text-orange-900">
                {expiringAuthorizations.length} autorisation(s) à renouveler
              </h3>
              <p className="text-sm text-orange-700">
                Ces autorisations expirent dans les 90 prochains jours
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Header with Add Button */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 rounded-xl">
            <ShieldCheckIcon className="h-8 w-8 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Autorisations professionnelles</h2>
            <p className="text-gray-600">Permissions et habilitations spéciales</p>
          </div>
        </div>
        <Button onClick={openCreateModal}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Accorder
        </Button>
      </div>

      {/* Authorizations List */}
      {authorizations.length === 0 ? (
        <Card className="p-12 text-center">
          <ShieldCheckIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Aucune autorisation</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Commencez par accorder des autorisations professionnelles à cet employé
          </p>
          <Button onClick={openCreateModal}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Accorder une autorisation
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {authorizations.map((authorization) => {
            const daysUntilExpiry = authorization.expiry_date
              ? getDaysUntilExpiry(authorization.expiry_date)
              : null

            return (
              <Card
                key={authorization.id}
                className={`p-6 ${
                  authorization.revoked
                    ? 'bg-gray-50 border-gray-200'
                    : daysUntilExpiry !== null && daysUntilExpiry < 0
                    ? 'bg-red-50 border-red-200'
                    : daysUntilExpiry !== null && daysUntilExpiry <= 30
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {AUTHORIZATION_TYPES.find((t) => t.value === authorization.authorization_type)?.label || authorization.authorization_type}
                      </h3>
                      {authorization.revoked ? (
                        <Badge variant="destructive">
                          <XCircleIcon className="h-3 w-3 mr-1" />
                          Révoquée
                        </Badge>
                      ) : (
                        <Badge variant="success">
                          <ShieldCheckIcon className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-3">
                      <div>
                        <p className="text-gray-600">Accordée le</p>
                        <p className="font-medium">
                          {new Date(authorization.granted_date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      {authorization.expiry_date && (
                        <div>
                          <p className="text-gray-600">Expire le</p>
                          <p className="font-medium">
                            {new Date(authorization.expiry_date).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      )}
                      {authorization.revoked_date && (
                        <div>
                          <p className="text-gray-600">Révoquée le</p>
                          <p className="font-medium">
                            {new Date(authorization.revoked_date).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      )}
                    </div>

                    {!authorization.revoked && authorization.expiry_date && daysUntilExpiry !== null && (
                      <div className="flex items-center gap-2 mb-3">
                        <ClockIcon className="h-4 w-4 text-gray-500" />
                        {daysUntilExpiry < 0 ? (
                          <Badge variant="destructive">
                            Expirée depuis {Math.abs(daysUntilExpiry)}j
                          </Badge>
                        ) : daysUntilExpiry <= 30 ? (
                          <Badge variant="destructive">
                            {daysUntilExpiry}j restants
                          </Badge>
                        ) : daysUntilExpiry <= 90 ? (
                          <Badge variant="warning">
                            {daysUntilExpiry}j restants
                          </Badge>
                        ) : (
                          <span className="text-sm text-gray-600">
                            {daysUntilExpiry} jours restants
                          </span>
                        )}
                      </div>
                    )}

                    {!authorization.revoked && !authorization.expiry_date && (
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircleIcon className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-700 font-medium">
                          Autorisation permanente
                        </span>
                      </div>
                    )}

                    {authorization.notes && (
                      <p className="text-sm text-gray-600 italic mb-3">
                        {authorization.notes}
                      </p>
                    )}

                    {authorization.revoked && authorization.revocation_reason && (
                      <div className="flex items-start gap-2 p-3 bg-red-100 border border-red-200 rounded-md">
                        <ShieldExclamationIcon className="h-5 w-5 text-red-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-red-900">Raison de la révocation:</p>
                          <p className="text-sm text-red-700">{authorization.revocation_reason}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {!authorization.revoked && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openRevocationDialog(authorization)}
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        <XCircleIcon className="h-4 w-4 mr-1" />
                        Révoquer
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      <FormDialog
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Accorder une autorisation"
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Type d'autorisation *</label>
            <select
              className="w-full border rounded-md px-3 py-2"
              value={formData.authorization_type || ''}
              onChange={(e) => setFormData({ ...formData, authorization_type: e.target.value })}
              required
            >
              {AUTHORIZATION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date d'accord *</label>
              <Input
                type="date"
                value={formData.granted_date || ''}
                onChange={(e) => setFormData({ ...formData, granted_date: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Date d'expiration</label>
              <Input
                type="date"
                value={formData.expiry_date || ''}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Laisser vide pour une autorisation permanente
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              className="w-full border rounded-md px-3 py-2 min-h-[80px]"
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Conditions particulières, restrictions, etc."
            />
          </div>
        </div>
      </FormDialog>

      {/* Revocation Dialog */}
      <FormDialog
        isOpen={showRevocationDialog}
        onClose={() => setShowRevocationDialog(false)}
        title="Révoquer l'autorisation"
        onSubmit={(e) => {
          e.preventDefault()
          handleRevoke()
        }}
        isSubmitting={isRevoking}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-md">
            <ExclamationTriangleIcon className="h-6 w-6 text-orange-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-orange-900 mb-1">Attention</p>
              <p className="text-sm text-orange-700">
                Cette action révoquera définitivement l'autorisation. L'employé ne pourra plus exercer les permissions associées.
              </p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Raison de la révocation *</label>
            <textarea
              className="w-full border rounded-md px-3 py-2 min-h-[100px]"
              value={revocationReason}
              onChange={(e) => setRevocationReason(e.target.value)}
              placeholder="ex: Changement de poste, non-respect des procédures, expiration de formation..."
              required
            />
          </div>
        </div>
      </FormDialog>
    </div>
  )
}
