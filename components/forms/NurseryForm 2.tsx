'use client'

import { useState } from 'react'
import { Nursery } from '@/types/database.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface NurseryFormData {
  name: string
  address?: string
  city?: string
  postal_code?: string
  phone?: string
  email?: string
  capacity?: number
}

interface NurseryFormProps {
  nursery?: Nursery
  onSubmit: (data: NurseryFormData) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  submitLabel?: string
}

export default function NurseryForm({
  nursery,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel
}: NurseryFormProps) {
  const [formData, setFormData] = useState<NurseryFormData>({
    name: nursery?.name || '',
    address: nursery?.address || '',
    city: nursery?.city || '',
    postal_code: nursery?.postal_code || '',
    phone: nursery?.phone || '',
    email: nursery?.email || '',
    capacity: nursery?.capacity || undefined
  })
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      await onSubmit(formData)
    } catch (err: any) {
      console.error('Form submission error:', err)
      setError(err.message || 'Une erreur est survenue. Veuillez réessayer.')
    }
  }

  const handleChange = (field: keyof NurseryFormData, value: string | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Nom de la crèche */}
      <div>
        <Label htmlFor="name">
          Nom de la crèche <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          type="text"
          required
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Ex: Crèche Les Petits Loups - Site Centre"
          disabled={isLoading}
          className="mt-2"
        />
      </div>

      {/* Adresse */}
      <div>
        <Label htmlFor="address">Adresse</Label>
        <Input
          id="address"
          type="text"
          value={formData.address}
          onChange={(e) => handleChange('address', e.target.value)}
          placeholder="Ex: 123 Rue de la République"
          disabled={isLoading}
          className="mt-2"
        />
      </div>

      {/* Ville et Code postal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="city">Ville</Label>
          <Input
            id="city"
            type="text"
            value={formData.city}
            onChange={(e) => handleChange('city', e.target.value)}
            placeholder="Ex: Paris"
            disabled={isLoading}
            className="mt-2"
          />
        </div>
        <div>
          <Label htmlFor="postal_code">Code postal</Label>
          <Input
            id="postal_code"
            type="text"
            value={formData.postal_code}
            onChange={(e) => handleChange('postal_code', e.target.value)}
            placeholder="Ex: 75001"
            maxLength={5}
            pattern="[0-9]{5}"
            disabled={isLoading}
            className="mt-2"
          />
        </div>
      </div>

      {/* Téléphone et Email */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="phone">Téléphone</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="Ex: 01 23 45 67 89"
            disabled={isLoading}
            className="mt-2"
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="Ex: contact@creche.fr"
            disabled={isLoading}
            className="mt-2"
          />
        </div>
      </div>

      {/* Capacité d'accueil */}
      <div>
        <Label htmlFor="capacity">Capacité d'accueil (nombre d'enfants)</Label>
        <Input
          id="capacity"
          type="number"
          min={1}
          value={formData.capacity || ''}
          onChange={(e) => handleChange('capacity', e.target.value ? parseInt(e.target.value) : undefined)}
          placeholder="Ex: 20"
          disabled={isLoading}
          className="mt-2"
        />
        <p className="mt-1 text-xs text-gray-500">
          Nombre maximum d'enfants pouvant être accueillis simultanément
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1"
          >
            Annuler
          </Button>
        )}
        <Button
          type="submit"
          disabled={isLoading || !formData.name}
          className="flex-1"
        >
          {isLoading ? 'Enregistrement...' : submitLabel || (nursery ? 'Mettre à jour' : 'Créer la crèche')}
        </Button>
      </div>
    </form>
  )
}
