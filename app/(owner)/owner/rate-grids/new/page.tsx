'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import {
  rateGridService,
  type CreateRateGridInput
} from '@/lib/services/rate-grid.service'
import { ArrowLeftIcon, CurrencyEuroIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'

export default function NewRateGridPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery } = useNursery()
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    grid_name: '',
    grid_type: 'psu' as CreateRateGridInput['grid_type'],
    valid_from: '',
    valid_until: '',
    psu_base_rate: '',
    psu_caf_participation_rate: '',
    paje_hourly_ceiling: '',
    is_default: false,
    notes: ''
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedNursery?.id || !session?.user?.id) return

    setSaving(true)
    setError(null)

    try {
      const input: CreateRateGridInput = {
        nursery_id: selectedNursery.id,
        grid_name: formData.grid_name,
        grid_type: formData.grid_type,
        valid_from: formData.valid_from,
        valid_until: formData.valid_until || undefined,
        psu_base_rate: formData.psu_base_rate ? parseFloat(formData.psu_base_rate) : undefined,
        psu_caf_participation_rate: formData.psu_caf_participation_rate ? parseFloat(formData.psu_caf_participation_rate) : undefined,
        paje_hourly_ceiling: formData.paje_hourly_ceiling ? parseFloat(formData.paje_hourly_ceiling) : undefined,
        is_default: formData.is_default,
        notes: formData.notes || undefined,
        created_by_id: session.user.id
      }

      const rateGrid = await rateGridService.create(input)
      router.push(`/owner/rate-grids/${rateGrid.id}`)
    } catch (err) {
      console.error('Error creating rate grid:', err)
      setError('Erreur lors de la création de la grille tarifaire.')
    } finally {
      setSaving(false)
    }
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

  if (!selectedNursery) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <CurrencyEuroIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Aucune crèche sélectionnée</h2>
          <p className="text-gray-600">Veuillez sélectionner une crèche.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <PageBreadcrumb
        items={[
          { label: 'Tableau de bord', href: '/owner/dashboard' },
          { label: 'Grilles Tarifaires', href: '/owner/rate-grids' },
          { label: 'Nouvelle grille', href: '/owner/rate-grids/new' }
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
          <h1 className="text-2xl font-bold text-gray-900">Nouvelle Grille Tarifaire</h1>
          <p className="text-gray-600 mt-1">
            Créer une nouvelle grille pour {selectedNursery.name}
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
          <CurrencyEuroIcon className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">À propos des grilles tarifaires</h3>
            <p className="text-sm text-blue-800">
              Une grille tarifaire définit le barème de tarification pour un type de contrat (PSU, PAJE, privé, entreprise).
              Après création, vous pourrez ajouter des tranches de revenus pour calculer automatiquement les tarifs.
            </p>
          </div>
        </div>
      </Card>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card className="p-6 border-l-4 border-l-[#9fa8da]">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Informations Générales</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de la grille <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                required
                value={formData.grid_name}
                onChange={(e) => setFormData(prev => ({ ...prev, grid_name: e.target.value }))}
                placeholder="Ex: Grille PSU 2025, Tarifs Privés Standard, etc."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type de grille <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.grid_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, grid_type: e.target.value as CreateRateGridInput['grid_type'] }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="psu">PSU (Prestation de Service Unique)</option>
                  <option value="paje">PAJE</option>
                  <option value="private">Privé</option>
                  <option value="company">Entreprise</option>
                </select>
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_default}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_default: e.target.checked }))}
                    className="w-5 h-5 text-[#9fa8da] rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Grille par défaut
                  </span>
                </label>
              </div>
            </div>
          </div>
        </Card>

        {/* Validity Period */}
        <Card className="p-6 border-l-4 border-l-[#9fa8da]">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Période de Validité</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de début <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                required
                value={formData.valid_from}
                onChange={(e) => setFormData(prev => ({ ...prev, valid_from: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de fin (optionnel)
              </label>
              <Input
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
              />
              <p className="text-xs text-gray-600 mt-1">
                Laisser vide si la grille n'a pas de date de fin
              </p>
            </div>
          </div>
        </Card>

        {/* PSU Specific Fields */}
        {formData.grid_type === 'psu' && (
          <Card className="p-6 border-l-4 border-l-blue-500">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Paramètres PSU</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Taux de base PSU (€/h)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.psu_base_rate}
                  onChange={(e) => setFormData(prev => ({ ...prev, psu_base_rate: e.target.value }))}
                  placeholder="Ex: 11.50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Taux participation CAF
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.psu_caf_participation_rate}
                  onChange={(e) => setFormData(prev => ({ ...prev, psu_caf_participation_rate: e.target.value }))}
                  placeholder="Ex: 0.06"
                />
              </div>
            </div>
          </Card>
        )}

        {/* PAJE Specific Fields */}
        {formData.grid_type === 'paje' && (
          <Card className="p-6 border-l-4 border-l-purple-500">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Paramètres PAJE</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plafond horaire PAJE (€/h)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.paje_hourly_ceiling}
                onChange={(e) => setFormData(prev => ({ ...prev, paje_hourly_ceiling: e.target.value }))}
                placeholder="Ex: 6.00"
              />
            </div>
          </Card>
        )}

        {/* Notes */}
        <Card className="p-6 border-l-4 border-l-[#9fa8da]">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Notes</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes internes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Notes ou observations concernant cette grille..."
            />
          </div>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={saving}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="bg-[#9fa8da] hover:bg-[#9fa8da]/90 text-white"
          >
            {saving ? 'Création...' : 'Créer la grille'}
          </Button>
        </div>
      </form>
    </div>
  )
}
