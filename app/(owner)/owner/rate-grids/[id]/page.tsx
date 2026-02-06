'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import {
  rateGridService,
  type RateGrid,
  type RateIncomeBracket,
  type CreateIncomeBracketInput
} from '@/lib/services/rate-grid.service'
import {
  ArrowLeftIcon,
  CurrencyEuroIcon,
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'

export default function RateGridDetailPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const router = useRouter()
  const params = useParams()
  const rateGridId = params.id as string

  const [rateGrid, setRateGrid] = useState<RateGrid | null>(null)
  const [incomeBrackets, setIncomeBrackets] = useState<RateIncomeBracket[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [showAddForm, setShowAddForm] = useState(false)
  const [bracketForm, setBracketForm] = useState({
    income_min: '',
    income_max: '',
    hourly_rate: '',
    psu_coefficient: ''
  })

  useEffect(() => {
    if (rateGridId) {
      loadData()
    }
  }, [rateGridId])

  async function loadData() {
    try {
      setLoading(true)
      const [gridData, bracketsData] = await Promise.all([
        rateGridService.getById(rateGridId),
        rateGridService.getIncomeBrackets(rateGridId)
      ])
      setRateGrid(gridData)
      setIncomeBrackets(bracketsData)
    } catch (err) {
      console.error('Error loading rate grid:', err)
      setError('Erreur lors du chargement de la grille tarifaire.')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddBracket(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    setError(null)

    try {
      const input: CreateIncomeBracketInput = {
        income_min: parseFloat(bracketForm.income_min),
        income_max: bracketForm.income_max ? parseFloat(bracketForm.income_max) : undefined,
        hourly_rate: parseFloat(bracketForm.hourly_rate),
        psu_coefficient: bracketForm.psu_coefficient ? parseFloat(bracketForm.psu_coefficient) : undefined
      }

      await rateGridService.addIncomeBracket(rateGridId, input)

      // Reset form and reload
      setBracketForm({ income_min: '', income_max: '', hourly_rate: '', psu_coefficient: '' })
      setShowAddForm(false)
      await loadData()
    } catch (err) {
      console.error('Error adding income bracket:', err)
      setError('Erreur lors de l\'ajout de la tranche de revenus.')
    } finally {
      setAdding(false)
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
  }

  function getTypeBadge(type: string) {
    const typeConfig: Record<string, { label: string; color: string }> = {
      psu: { label: 'PSU', color: 'bg-blue-100 text-blue-800' },
      paje: { label: 'PAJE', color: 'bg-purple-100 text-purple-800' },
      private: { label: 'Privé', color: 'bg-pink-100 text-pink-800' },
      company: { label: 'Entreprise', color: 'bg-teal-100 text-teal-800' }
    }
    const config = typeConfig[type] || { label: type, color: 'bg-gray-100 text-gray-800' }
    return <Badge className={config.color}>{config.label}</Badge>
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#9fa8da] mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (error && !rateGrid) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erreur</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => router.push('/owner/rate-grids')}>
            Retour à la liste
          </Button>
        </div>
      </div>
    )
  }

  if (!rateGrid) return null

  const sortedBrackets = [...incomeBrackets].sort((a, b) => a.income_min - b.income_min)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <PageBreadcrumb
        items={[
          { label: 'Tableau de bord', href: '/owner/dashboard' },
          { label: 'Grilles Tarifaires', href: '/owner/rate-grids' },
          { label: rateGrid.grid_name, href: `/owner/rate-grids/${rateGrid.id}` }
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
              <h1 className="text-2xl font-bold text-gray-900">{rateGrid.grid_name}</h1>
              {getTypeBadge(rateGrid.grid_type)}
              {rateGrid.is_active && (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircleIcon className="h-4 w-4 inline mr-1" />
                  Active
                </Badge>
              )}
              {rateGrid.is_default && (
                <Badge className="bg-yellow-100 text-yellow-800">
                  Par défaut
                </Badge>
              )}
            </div>
            <p className="text-gray-600">
              Valide du {formatDate(rateGrid.valid_from)}
              {rateGrid.valid_until && ` au ${formatDate(rateGrid.valid_until)}`}
            </p>
          </div>
        </div>

        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-[#9fa8da] hover:bg-[#9fa8da]/90 text-white"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Ajouter une tranche
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <Card className="p-4 mb-6 bg-red-50 border-red-200">
          <p className="text-red-800">{error}</p>
        </Card>
      )}

      {/* Grid Info */}
      <Card className="p-6 mb-6 border-l-4 border-l-[#9fa8da]">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Informations Générales</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Type de grille</p>
            <p className="font-medium text-gray-900">
              {rateGrid.grid_type === 'psu' ? 'PSU' :
               rateGrid.grid_type === 'paje' ? 'PAJE' :
               rateGrid.grid_type === 'private' ? 'Privé' :
               rateGrid.grid_type === 'company' ? 'Entreprise' :
               rateGrid.grid_type}
            </p>
          </div>

          {rateGrid.psu_base_rate && (
            <div>
              <p className="text-gray-600">Taux de base PSU</p>
              <p className="font-medium text-gray-900">{rateGrid.psu_base_rate}€/h</p>
            </div>
          )}

          {rateGrid.paje_hourly_ceiling && (
            <div>
              <p className="text-gray-600">Plafond horaire PAJE</p>
              <p className="font-medium text-gray-900">{rateGrid.paje_hourly_ceiling}€/h</p>
            </div>
          )}

          {rateGrid.notes && (
            <div className="md:col-span-3">
              <p className="text-gray-600">Notes</p>
              <p className="font-medium text-gray-900">{rateGrid.notes}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Add Bracket Form */}
      {showAddForm && (
        <Card className="p-6 mb-6 bg-blue-50 border-blue-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Ajouter une Tranche de Revenus</h2>
          <form onSubmit={handleAddBracket} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Revenu minimum annuel (€) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={bracketForm.income_min}
                  onChange={(e) => setBracketForm(prev => ({ ...prev, income_min: e.target.value }))}
                  placeholder="Ex: 20000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Revenu maximum annuel (€)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={bracketForm.income_max}
                  onChange={(e) => setBracketForm(prev => ({ ...prev, income_max: e.target.value }))}
                  placeholder="Laisser vide si illimité"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tarif horaire (€) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={bracketForm.hourly_rate}
                  onChange={(e) => setBracketForm(prev => ({ ...prev, hourly_rate: e.target.value }))}
                  placeholder="Ex: 8.50"
                />
              </div>

              {rateGrid.grid_type === 'psu' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Coefficient PSU
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={bracketForm.psu_coefficient}
                    onChange={(e) => setBracketForm(prev => ({ ...prev, psu_coefficient: e.target.value }))}
                    placeholder="Ex: 0.06"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddForm(false)}
                disabled={adding}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={adding}
                className="bg-[#9fa8da] hover:bg-[#9fa8da]/90 text-white"
              >
                {adding ? 'Ajout...' : 'Ajouter la tranche'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Income Brackets Table */}
      <Card className="p-6 border-l-4 border-l-[#9fa8da]">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Tranches de Revenus ({incomeBrackets.length})
        </h2>

        {sortedBrackets.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <CurrencyEuroIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune tranche de revenus</h3>
            <p className="text-gray-600 mb-4">
              Commencez par ajouter des tranches de revenus pour définir votre barème tarifaire.
            </p>
            <Button
              onClick={() => setShowAddForm(true)}
              className="bg-[#9fa8da] hover:bg-[#9fa8da]/90 text-white"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Ajouter une tranche
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Revenus annuels
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                    Tarif horaire
                  </th>
                  {rateGrid.grid_type === 'psu' && (
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                      Coefficient PSU
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {sortedBrackets.map((bracket, index) => (
                  <tr
                    key={bracket.id}
                    className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                  >
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900">
                        {formatCurrency(bracket.income_min)}
                        {bracket.income_max ? ` - ${formatCurrency(bracket.income_max)}` : ' et plus'}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <p className="font-bold text-[#9fa8da]">{bracket.hourly_rate}€/h</p>
                    </td>
                    {rateGrid.grid_type === 'psu' && (
                      <td className="py-3 px-4 text-right">
                        <p className="text-gray-700">{bracket.psu_coefficient || '-'}</p>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
