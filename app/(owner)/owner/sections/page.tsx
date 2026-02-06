'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PlusIcon, PencilIcon, TrashIcon, UsersIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { sectionService } from '@/lib/services/section.service'

interface Section {
  id: string
  section_name: string
  age_group?: string
  capacity?: number
  color_code?: string
  room_number?: string
  description?: string
  is_active: boolean
  created_at: string

  // Stats
  current_children?: number
  occupancy_rate?: number
}

export default function SectionsPage() {
  const router = useRouter()
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery, isLoading: nurseryLoading } = useNursery()

  const [sections, setSections] = useState<Section[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showInactive, setShowInactive] = useState(false)

  useEffect(() => {
    if (authLoading || nurseryLoading || !selectedNursery?.id) return

    loadSections()
  }, [authLoading, nurseryLoading, selectedNursery?.id])

  async function loadSections() {
    if (!selectedNursery?.id) return

    try {
      setIsLoading(true)
      const data = await sectionService.getWithStats(selectedNursery.id)

      // Enrichir avec taux d'occupation
      const enrichedSections = await Promise.all(
        data.map(async (section: any) => {
          try {
            const occupancy = await sectionService.getOccupancy(section.id)
            return {
              ...section,
              current_children: occupancy?.current || 0,
              occupancy_rate: occupancy?.rate || 0
            }
          } catch (error) {
            return {
              ...section,
              current_children: 0,
              occupancy_rate: 0
            }
          }
        })
      )

      setSections(enrichedSections)
    } catch (error) {
      console.error('Error loading sections:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDelete(sectionId: string, sectionName: string) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la section "${sectionName}" ? Cette action est irréversible.`)) {
      return
    }

    try {
      await sectionService.delete(sectionId)
      loadSections()
    } catch (error) {
      console.error('Error deleting section:', error)
      alert('Erreur lors de la suppression. La section contient peut-être encore des enfants.')
    }
  }

  // Filtrage
  const filteredSections = sections.filter(section => {
    return showInactive || section.is_active
  })

  // Stats globales
  const stats = {
    total: sections.length,
    active: sections.filter(s => s.is_active).length,
    totalCapacity: sections.reduce((sum, s) => sum + (s.capacity || 0), 0),
    totalChildren: sections.reduce((sum, s) => sum + (s.current_children || 0), 0)
  }

  const globalOccupancyRate = stats.totalCapacity > 0
    ? Math.round((stats.totalChildren / stats.totalCapacity) * 100)
    : 0

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
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-purple-100">
            <UsersIcon className="w-6 h-6 text-purple-600" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sections</h1>
            <p className="text-sm text-muted-foreground">
              Gérez les sections et groupes d'âge
            </p>
          </div>
        </div>
        <Button onClick={() => router.push('/owner/sections/new')}>
          <PlusIcon className="h-5 w-5 mr-2" />
          Nouvelle section
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total sections</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <UsersIcon className="h-6 w-6 text-[#5a9dc9]" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Sections actives</p>
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
              <p className="text-sm text-gray-500">Capacité totale</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalCapacity}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <UsersIcon className="h-6 w-6 text-purple-500" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Taux d'occupation</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{globalOccupancyRate}%</p>
              <p className="text-xs text-gray-500 mt-1">{stats.totalChildren} / {stats.totalCapacity} enfants</p>
            </div>
            <div className={`p-3 rounded-full ${
              globalOccupancyRate >= 90 ? 'bg-red-100' :
              globalOccupancyRate >= 75 ? 'bg-amber-100' : 'bg-green-100'
            }`}>
              <UsersIcon className={`h-6 w-6 ${
                globalOccupancyRate >= 90 ? 'text-red-500' :
                globalOccupancyRate >= 75 ? 'text-amber-500' : 'text-green-500'
              }`} />
            </div>
          </div>
        </Card>
      </div>

      {/* Filtres */}
      <Card className="p-6 mb-6">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="showInactive"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-gray-300 text-[#5a9dc9] focus:ring-[#5a9dc9]"
          />
          <label htmlFor="showInactive" className="text-sm text-gray-700">
            Afficher les sections inactives
          </label>
        </div>
      </Card>

      {/* Liste des sections */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5a9dc9]"></div>
        </div>
      ) : filteredSections.length === 0 ? (
        <Card className="p-12 text-center">
          <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune section</h3>
          <p className="text-gray-500 mb-6">
            Commencez par créer votre première section
          </p>
          <Button onClick={() => router.push('/owner/sections/new')}>
            <PlusIcon className="h-5 w-5 mr-2" />
            Créer une section
          </Button>
        </Card>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              {filteredSections.length} section{filteredSections.length > 1 ? 's' : ''}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSections.map((section) => (
              <Card
                key={section.id}
                className="p-6 hover:shadow-lg transition-shadow"
                style={{
                  borderLeft: `4px solid ${section.color_code || '#e5e7eb'}`
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <div
                        className="p-2 rounded-lg"
                        style={{
                          backgroundColor: section.color_code ? `${section.color_code}20` : '#f3f4f6'
                        }}
                      >
                        <UsersIcon
                          className="h-6 w-6"
                          style={{
                            color: section.color_code || '#6b7280'
                          }}
                        />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {section.section_name}
                      </h3>
                    </div>
                    {section.age_group && (
                      <p className="text-sm text-gray-600 mb-2">{section.age_group}</p>
                    )}
                    {section.room_number && (
                      <p className="text-sm text-gray-500">Salle: {section.room_number}</p>
                    )}
                  </div>
                  <Badge variant={section.is_active ? 'success' : 'secondary'}>
                    {section.is_active ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>

                {section.description && (
                  <p className="text-sm text-gray-600 mb-4">{section.description}</p>
                )}

                {/* Stats occupation */}
                <div className="space-y-3 mb-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-500">Occupation</span>
                      <span className="text-sm font-medium text-gray-900">
                        {section.current_children || 0} / {section.capacity || 0}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          (section.occupancy_rate || 0) >= 90 ? 'bg-red-500' :
                          (section.occupancy_rate || 0) >= 75 ? 'bg-amber-500' : 'bg-[#b5ead7]'
                        }`}
                        style={{
                          width: `${Math.min(section.occupancy_rate || 0, 100)}%`
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {section.occupancy_rate || 0}% de remplissage
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => router.push(`/owner/sections/${section.id}/edit`)}
                  >
                    <PencilIcon className="h-4 w-4 mr-2" />
                    Modifier
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(section.id, section.section_name)}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>

                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-gray-400">
                    Créée le {new Date(section.created_at).toLocaleDateString('fr-FR')}
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
