'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PlusIcon, MagnifyingGlassIcon, UserGroupIcon, UsersIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { familyService } from '@/lib/services/family.service'

interface Family {
  id: string
  family_name: string
  caf_number?: string | null
  address?: string | null
  city?: string | null
  postal_code?: string | null
  phone_primary?: string | null
  phone_secondary?: string | null
  email?: string | null
  total_children?: number
  total_guardians?: number
  is_active: boolean
  created_at: string
}

export default function FamiliesPage() {
  const router = useRouter()
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery, isLoading: nurseryLoading } = useNursery()

  const [families, setFamilies] = useState<Family[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  useEffect(() => {
    if (authLoading || nurseryLoading || !selectedNursery?.id) return

    loadFamilies()
  }, [authLoading, nurseryLoading, selectedNursery?.id])

  async function loadFamilies() {
    if (!selectedNursery?.id) return

    try {
      setIsLoading(true)
      const data = await familyService.getAll(selectedNursery.id)

      // Enrichir avec stats (normalement fait côté service)
      const enrichedFamilies = await Promise.all(
        data.map(async (family) => {
          try {
            const stats = await familyService.getStats(family.id)
            return {
              ...family,
              total_children: stats?.totalChildren || 0,
              total_guardians: stats?.totalGuardians || 0
            }
          } catch (error) {
            return {
              ...family,
              total_children: 0,
              total_guardians: 0
            }
          }
        })
      )

      setFamilies(enrichedFamilies)
    } catch (error) {
      console.error('Error loading families:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Filtrage
  const filteredFamilies = families.filter(family => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch =
      family.family_name.toLowerCase().includes(searchLower) ||
      family.caf_number?.toLowerCase().includes(searchLower) ||
      family.city?.toLowerCase().includes(searchLower)

    const matchesActive = showInactive || family.is_active

    return matchesSearch && matchesActive
  })

  // Stats
  const stats = {
    total: families.length,
    active: families.filter(f => f.is_active).length,
    inactive: families.filter(f => !f.is_active).length,
    totalChildren: families.reduce((sum, f) => sum + (f.total_children || 0), 0)
  }

  if (authLoading || nurseryLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5a9dc9]"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100">
            <UserGroupIcon className="w-6 h-6 text-blue-600" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Familles</h1>
            <p className="text-sm text-muted-foreground">
              Gérez les dossiers famille
            </p>
          </div>
        </div>
        <Button onClick={() => router.push('/owner/families/new')}>
          <PlusIcon className="h-5 w-5 mr-2" />
          Nouvelle famille
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total familles</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <UserGroupIcon className="h-6 w-6 text-[#5a9dc9]" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Familles actives</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.active}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <UsersIcon className="h-6 w-6 text-[#b5ead7]" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Familles inactives</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.inactive}</p>
            </div>
            <div className="p-3 bg-gray-100 rounded-full">
              <UserGroupIcon className="h-6 w-6 text-gray-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total enfants</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalChildren}</p>
            </div>
            <div className="p-3 bg-pink-100 rounded-full">
              <UsersIcon className="h-6 w-6 text-[#f4c2c2]" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filtres et recherche */}
      <Card className="p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Rechercher par nom, numéro CAF, ville..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="showInactive"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300 text-[#5a9dc9] focus:ring-[#5a9dc9]"
            />
            <label htmlFor="showInactive" className="text-sm text-gray-700">
              Afficher inactifs
            </label>
          </div>
        </div>
      </Card>

      {/* Liste des familles */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5a9dc9]"></div>
        </div>
      ) : filteredFamilies.length === 0 ? (
        <Card className="p-12 text-center">
          <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'Aucune famille trouvée' : 'Aucune famille'}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchTerm
              ? 'Essayez de modifier vos critères de recherche'
              : 'Commencez par créer votre première famille'}
          </p>
          {!searchTerm && (
            <Button onClick={() => router.push('/owner/families/new')}>
              <PlusIcon className="h-5 w-5 mr-2" />
              Créer une famille
            </Button>
          )}
        </Card>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              {filteredFamilies.length} famille{filteredFamilies.length > 1 ? 's' : ''} trouvée{filteredFamilies.length > 1 ? 's' : ''}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFamilies.map((family) => (
              <Card
                key={family.id}
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(`/owner/families/${family.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-gradient-to-br from-[#5a9dc9] to-[#7db3d4] rounded-full">
                      <UserGroupIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {family.family_name}
                      </h3>
                      {family.caf_number && (
                        <p className="text-sm text-gray-500">CAF: {family.caf_number}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant={family.is_active ? 'success' : 'secondary'}>
                    {family.is_active ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>

                <div className="space-y-3">
                  {/* Adresse */}
                  {family.address && (
                    <div>
                      <p className="text-sm text-gray-600">{family.address}</p>
                      <p className="text-sm text-gray-600">
                        {family.postal_code} {family.city}
                      </p>
                    </div>
                  )}

                  {/* Contact */}
                  {family.phone_primary && (
                    <div>
                      <p className="text-sm text-gray-600">{family.phone_primary}</p>
                    </div>
                  )}
                  {family.email && (
                    <div>
                      <p className="text-sm text-gray-600">{family.email}</p>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center space-x-4 pt-4 border-t">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-[#f4c2c2] bg-opacity-20 rounded">
                        <UsersIcon className="h-4 w-4 text-[#f4c2c2]" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Enfants</p>
                        <p className="text-sm font-medium text-gray-900">{family.total_children || 0}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-[#5a9dc9] bg-opacity-20 rounded">
                        <UserGroupIcon className="h-4 w-4 text-[#5a9dc9]" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Tuteurs</p>
                        <p className="text-sm font-medium text-gray-900">{family.total_guardians || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-gray-400">
                    Créée le {new Date(family.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
