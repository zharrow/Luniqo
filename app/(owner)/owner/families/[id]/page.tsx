'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeftIcon, PencilIcon, TrashIcon, UserGroupIcon, EnvelopeIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { familyService } from '@/lib/services/family.service'
import { guardianService, type GuardianWithPortalStatus } from '@/lib/services/guardian.service'
import { inviteGuardianToPortal, repairGuardianChildLinks, debugGuardianChildData } from '@/lib/actions/invitation.actions'

interface FamilyDetail {
  id: string
  family_name: string
  caf_number?: string | null
  address?: string | null
  city?: string | null
  postal_code?: string | null
  phone_primary?: string | null
  phone_secondary?: string | null
  email?: string | null
  is_active: boolean
  created_at: string
}

export default function FamilyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const familyId = params.id as string

  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery, isLoading: nurseryLoading } = useNursery()

  const [family, setFamily] = useState<FamilyDetail | null>(null)
  const [guardians, setGuardians] = useState<GuardianWithPortalStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [invitingId, setInvitingId] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isRepairing, setIsRepairing] = useState(false)

  useEffect(() => {
    if (authLoading || nurseryLoading || !selectedNursery?.id) return
    loadFamilyData()
  }, [authLoading, nurseryLoading, selectedNursery?.id, familyId])

  async function loadFamilyData() {
    try {
      setIsLoading(true)
      const [familyData, guardiansData] = await Promise.all([
        familyService.getById(familyId),
        guardianService.getGuardiansWithPortalStatus(familyId),
      ])
      setFamily(familyData)
      setGuardians(guardiansData)
    } catch (error) {
      console.error('Error loading family:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleInvite(guardian: GuardianWithPortalStatus) {
    if (!session?.user?.id || !selectedNursery?.id) return

    setInvitingId(guardian.id)
    setSuccessMessage('')
    setErrorMessage('')

    try {
      const result = await inviteGuardianToPortal({
        guardianId: guardian.id,
        invitedById: session.user.id,
        nurseryId: selectedNursery.id,
      })

      if (result.success) {
        if (result.error) {
          // Success but with warning (e.g. email not sent)
          setSuccessMessage(`Invitation creee pour ${guardian.first_name}. ${result.error}`)
        } else {
          setSuccessMessage(`Invitation envoyee a ${guardian.email}`)
        }
      } else {
        setErrorMessage(result.error || 'Erreur lors de l\'envoi')
      }
    } catch (error) {
      console.error('Error inviting guardian:', error)
      setErrorMessage('Erreur inattendue')
    } finally {
      setInvitingId(null)
    }
  }

  async function handleDelete() {
    if (!confirm('Etes-vous sur de vouloir supprimer cette famille ? Cette action est irreversible.')) {
      return
    }

    try {
      await familyService.delete(familyId)
      router.push('/owner/families')
    } catch (error) {
      console.error('Error deleting family:', error)
      alert('Erreur lors de la suppression')
    }
  }

  async function handleRepairLinks() {
    if (!selectedNursery?.id) return

    setIsRepairing(true)
    setSuccessMessage('')
    setErrorMessage('')

    try {
      const result = await repairGuardianChildLinks(selectedNursery.id)

      if (result.success) {
        if (result.linksCreated > 0) {
          setSuccessMessage(`${result.linksCreated} lien(s) tuteur-enfant cree(s) avec succes`)
        } else {
          setSuccessMessage('Tous les liens sont deja en place')
        }
      } else {
        setErrorMessage(result.error || 'Erreur lors de la reparation')
      }
    } catch (error) {
      console.error('Error repairing links:', error)
      setErrorMessage('Erreur inattendue')
    } finally {
      setIsRepairing(false)
    }
  }

  async function handleDebugGuardian(guardianId: string) {
    try {
      const data = await debugGuardianChildData(guardianId)
      console.log('🔍 Debug Guardian Data:', data)
      alert(`Debug info (voir console):\n\nTuteur: ${data.guardian?.first_name} ${data.guardian?.last_name}\nFamille: ${data.family?.family_name || 'AUCUNE'}\nEnfants dans famille: ${data.childrenInFamily.length}\nLiens guardian_child: ${data.guardianChildLinks.length}\nCompte portail: ${data.guardianUser ? 'OUI' : 'NON'}`)
    } catch (error) {
      console.error('Debug error:', error)
    }
  }

  if (authLoading || nurseryLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5a9dc9]"></div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5a9dc9]"></div>
      </div>
    )
  }

  if (!family) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-8 text-center">
          <p className="text-gray-500">Famille introuvable</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/owner/families')}
          className="mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Retour a la liste
        </Button>

        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-4 bg-gradient-to-br from-[#ffe5b4] to-[#ffd89b] rounded-full">
              <UserGroupIcon className="h-10 w-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Famille {family.family_name}
              </h1>
              {family.caf_number && (
                <p className="text-gray-500 mt-1">CAF: {family.caf_number}</p>
              )}
              <div className="flex items-center space-x-3 mt-2">
                <Badge variant={family.is_active ? 'success' : 'secondary'}>
                  {family.is_active ? 'Actif' : 'Inactif'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={handleRepairLinks}
              disabled={isRepairing}
              className="text-[#5a9dc9] border-[#5a9dc9]/30"
            >
              {isRepairing ? 'Reparation...' : 'Reparer liens portail'}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/owner/families/${familyId}/edit`)}
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Modifier
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Supprimer
            </Button>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-[#b5ead7]/30 border border-[#b5ead7] text-green-800 text-sm flex items-center gap-2">
          <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200/50 text-red-700 text-sm">
          {errorMessage}
        </div>
      )}

      {/* Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Informations generales */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Informations generales</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Nom de famille</dt>
              <dd className="text-gray-900 font-medium">{family.family_name}</dd>
            </div>
            {family.caf_number && (
              <div>
                <dt className="text-sm text-gray-500">Numero CAF</dt>
                <dd className="text-gray-900 font-mono">{family.caf_number}</dd>
              </div>
            )}
          </dl>
        </Card>

        {/* Coordonnees */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Coordonnees</h3>
          <dl className="space-y-3">
            {family.address && (
              <div>
                <dt className="text-sm text-gray-500">Adresse</dt>
                <dd className="text-gray-900">
                  {family.address}
                  <br />
                  {family.postal_code} {family.city}
                </dd>
              </div>
            )}
            {family.phone_primary && (
              <div>
                <dt className="text-sm text-gray-500">Telephone principal</dt>
                <dd className="text-gray-900">{family.phone_primary}</dd>
              </div>
            )}
            {family.phone_secondary && (
              <div>
                <dt className="text-sm text-gray-500">Telephone secondaire</dt>
                <dd className="text-gray-900">{family.phone_secondary}</dd>
              </div>
            )}
            {family.email && (
              <div>
                <dt className="text-sm text-gray-500">Email</dt>
                <dd className="text-gray-900">{family.email}</dd>
              </div>
            )}
          </dl>
        </Card>
      </div>

      {/* Tuteurs */}
      <div className="mt-8">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Tuteurs</h3>
            <Badge variant="outline">{guardians.length} tuteur{guardians.length !== 1 ? 's' : ''}</Badge>
          </div>

          {guardians.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucun tuteur enregistre pour cette famille.</p>
          ) : (
            <div className="space-y-4">
              {guardians.map((guardian) => (
                <div
                  key={guardian.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-medium text-gray-900">
                        {guardian.first_name} {guardian.last_name}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {guardian.legal_responsibility === 'parent' ? 'Parent' :
                         guardian.legal_responsibility === 'legal_guardian' ? 'Tuteur legal' :
                         'Contact d\'urgence'}
                      </Badge>
                      {guardian.relationship_to_child && (
                        <span className="text-xs text-gray-500 capitalize">
                          ({guardian.relationship_to_child})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      {guardian.email && (
                        <span className="flex items-center gap-1">
                          <EnvelopeIcon className="w-3.5 h-3.5" />
                          {guardian.email}
                        </span>
                      )}
                      {guardian.phone_primary && (
                        <span>{guardian.phone_primary}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDebugGuardian(guardian.id)}
                      className="text-gray-400 hover:text-gray-600 text-xs"
                    >
                      Debug
                    </Button>
                    {guardian.has_portal_account ? (
                      <Badge className="bg-[#b5ead7]/30 text-green-800 border-[#b5ead7]">
                        <CheckCircleIcon className="w-3.5 h-3.5 mr-1" />
                        Portail actif
                      </Badge>
                    ) : guardian.email ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleInvite(guardian)}
                        disabled={invitingId === guardian.id}
                        className="text-[#5a9dc9] border-[#5a9dc9]/30 hover:bg-[#5a9dc9]/5"
                      >
                        {invitingId === guardian.id ? (
                          <span className="flex items-center gap-2">
                            <ClockIcon className="w-4 h-4 animate-spin" />
                            Envoi...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <EnvelopeIcon className="w-4 h-4" />
                            Inviter au portail
                          </span>
                        )}
                      </Button>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Pas d'email
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
