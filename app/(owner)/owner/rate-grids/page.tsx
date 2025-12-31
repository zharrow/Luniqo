'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import {
  rateGridService,
  type RateGrid
} from '@/lib/services/rate-grid.service'
import {
  DocumentTextIcon,
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  CurrencyEuroIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'

export default function RateGridsPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery } = useNursery()
  const router = useRouter()

  const [rateGrids, setRateGrids] = useState<RateGrid[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (selectedNursery?.id) {
      loadData()
    } else if (!authLoading && !selectedNursery) {
      setLoading(false)
    }
  }, [selectedNursery?.id, authLoading])

  async function loadData() {
    if (!selectedNursery?.id) return

    try {
      setLoading(true)
      const data = await rateGridService.getByNursery(selectedNursery.id)
      setRateGrids(data)
    } catch (error) {
      console.error('Error loading rate grids:', error)
    } finally {
      setLoading(false)
    }
  }

  function getTypeBadge(type: string) {
    const typeConfig: Record<string, { label: string; color: string }> = {
      psu: { label: 'PSU', color: 'bg-blue-100 text-blue-800' },
      paje: { label: 'PAJE', color: 'bg-purple-100 text-purple-800' },
      private: { label: 'Privé', color: 'bg-pink-100 text-pink-800' },
      company: { label: 'Entreprise', color: 'bg-teal-100 text-teal-800' }
    }
    const config = typeConfig[type] || { label: type, color: 'bg-gray-100 text-gray-800' }
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

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#9fa8da] mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des grilles tarifaires...</p>
        </div>
      </div>
    )
  }

  if (!selectedNursery) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Aucune crèche sélectionnée</h2>
          <p className="text-gray-600">Veuillez sélectionner une crèche pour voir les grilles tarifaires.</p>
        </div>
      </div>
    )
  }

  const activeGrids = rateGrids.filter(g => g.is_active)
  const inactiveGrids = rateGrids.filter(g => !g.is_active)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <PageBreadcrumb
        items={[
          { label: 'Tableau de bord', href: '/owner/dashboard' },
          { label: 'Grilles Tarifaires', href: '/owner/rate-grids' }
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 mt-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Grilles Tarifaires</h1>
          <p className="text-gray-600 mt-1">
            Gestion des barèmes de tarification pour {selectedNursery.name}
          </p>
        </div>
        <Button
          onClick={() => router.push('/owner/rate-grids/new')}
          className="bg-[#9fa8da] hover:bg-[#9fa8da]/90 text-white"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Nouvelle grille
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 bg-gradient-to-br from-green-50 to-white border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Actives</p>
              <p className="text-2xl font-bold text-green-700">{activeGrids.length}</p>
            </div>
            <CheckCircleIcon className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-blue-50 to-white border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">PSU</p>
              <p className="text-2xl font-bold text-blue-700">
                {rateGrids.filter(g => g.grid_type === 'psu').length}
              </p>
            </div>
            <CurrencyEuroIcon className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-50 to-white border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">PAJE</p>
              <p className="text-2xl font-bold text-purple-700">
                {rateGrids.filter(g => g.grid_type === 'paje').length}
              </p>
            </div>
            <CurrencyEuroIcon className="h-8 w-8 text-purple-500" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-gray-50 to-white border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-700">{rateGrids.length}</p>
            </div>
            <DocumentTextIcon className="h-8 w-8 text-gray-500" />
          </div>
        </Card>
      </div>

      {/* Rate Grids List */}
      {rateGrids.length === 0 ? (
        <Card className="p-12 text-center bg-gray-50">
          <CurrencyEuroIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune grille tarifaire</h3>
          <p className="text-gray-600 mb-4">
            Commencez par créer une grille tarifaire pour définir vos barèmes.
          </p>
          <Button
            onClick={() => router.push('/owner/rate-grids/new')}
            className="bg-[#9fa8da] hover:bg-[#9fa8da]/90 text-white"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Nouvelle grille
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Active Grids */}
          {activeGrids.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Grilles Actives ({activeGrids.length})</h2>
              <div className="space-y-3">
                {activeGrids.map((grid) => (
                  <Card
                    key={grid.id}
                    className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-[#9fa8da]"
                    onClick={() => router.push(`/owner/rate-grids/${grid.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-gray-900">
                            {grid.grid_name}
                          </h3>
                          {getTypeBadge(grid.grid_type)}
                          {grid.is_default && (
                            <Badge className="bg-yellow-100 text-yellow-800">
                              Par défaut
                            </Badge>
                          )}
                          <Badge className="bg-green-100 text-green-800">
                            Active
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-3 text-sm">
                          <div>
                            <p className="text-gray-600">Type</p>
                            <p className="font-medium text-gray-900 capitalize">
                              {grid.grid_type === 'psu' ? 'PSU' :
                               grid.grid_type === 'paje' ? 'PAJE' :
                               grid.grid_type === 'private' ? 'Privé' :
                               grid.grid_type === 'company' ? 'Entreprise' :
                               grid.grid_type}
                            </p>
                          </div>

                          <div>
                            <p className="text-gray-600">Période de validité</p>
                            <p className="font-medium text-gray-900">
                              {formatDate(grid.valid_from)}
                              {grid.valid_until && ` - ${formatDate(grid.valid_until)}`}
                            </p>
                          </div>

                          {grid.grid_type === 'psu' && grid.psu_base_rate && (
                            <div>
                              <p className="text-gray-600">Taux de base PSU</p>
                              <p className="font-medium text-gray-900">{grid.psu_base_rate}€/h</p>
                            </div>
                          )}

                          {grid.grid_type === 'paje' && grid.paje_hourly_ceiling && (
                            <div>
                              <p className="text-gray-600">Plafond horaire PAJE</p>
                              <p className="font-medium text-gray-900">{grid.paje_hourly_ceiling}€/h</p>
                            </div>
                          )}

                          {grid.notes && (
                            <div className="md:col-span-4">
                              <p className="text-gray-600">Notes</p>
                              <p className="font-medium text-gray-900">{grid.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Inactive Grids */}
          {inactiveGrids.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Grilles Inactives ({inactiveGrids.length})</h2>
              <div className="space-y-3">
                {inactiveGrids.map((grid) => (
                  <Card
                    key={grid.id}
                    className="p-4 bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/owner/rate-grids/${grid.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {grid.grid_name}
                            </span>
                            {getTypeBadge(grid.grid_type)}
                            <Badge className="bg-gray-100 text-gray-800">
                              <XCircleIcon className="h-4 w-4 inline mr-1" />
                              Inactive
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            {formatDate(grid.valid_from)}
                            {grid.valid_until && ` - ${formatDate(grid.valid_until)}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
