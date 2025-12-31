'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeftIcon, PencilIcon, TrashIcon, UserGroupIcon, UserCircleIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { familyService } from '@/lib/services/family.service'

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
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (authLoading || nurseryLoading || !selectedNursery?.id) return
    loadFamilyData()
  }, [authLoading, nurseryLoading, selectedNursery?.id, familyId])

  async function loadFamilyData() {
    try {
      setIsLoading(true)
      const data = await familyService.getById(familyId)
      setFamily(data)
    } catch (error) {
      console.error('Error loading family:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette famille ? Cette action est irréversible.')) {
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
          Retour à la liste
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

      {/* Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Informations générales */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Informations générales</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Nom de famille</dt>
              <dd className="text-gray-900 font-medium">{family.family_name}</dd>
            </div>
            {family.caf_number && (
              <div>
                <dt className="text-sm text-gray-500">Numéro CAF</dt>
                <dd className="text-gray-900 font-mono">{family.caf_number}</dd>
              </div>
            )}
          </dl>
        </Card>

        {/* Coordonnées */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Coordonnées</h3>
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
                <dt className="text-sm text-gray-500">Téléphone principal</dt>
                <dd className="text-gray-900">{family.phone_primary}</dd>
              </div>
            )}
            {family.phone_secondary && (
              <div>
                <dt className="text-sm text-gray-500">Téléphone secondaire</dt>
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

      {/* Tuteurs et enfants sections à venir */}
      <div className="mt-8">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Tuteurs et enfants</h3>
          <p className="text-gray-500">
            Cette fonctionnalité sera disponible prochainement.
            Vous pouvez consulter les tuteurs et enfants depuis leurs pages respectives.
          </p>
        </Card>
      </div>
    </div>
  )
}
