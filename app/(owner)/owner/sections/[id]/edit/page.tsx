'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { sectionService, type Section } from '@/lib/services/section.service'

interface SectionFormData {
  section_name: string
  age_min_months?: number
  age_max_months?: number
  capacity?: number
  color_code?: string
  description?: string
}

const PRESET_COLORS = [
  { name: 'Rose pastel', value: '#f4c2c2' },
  { name: 'Pêche pastel', value: '#ffe5b4' },
  { name: 'Menthe pastel', value: '#b5ead7' },
  { name: 'Lavande pastel', value: '#e0d4f7' },
  { name: 'Bleu pastel', value: '#b3d9f2' },
  { name: 'Jaune pastel', value: '#fff9c4' },
  { name: 'Vert pastel', value: '#c8e6c9' },
  { name: 'Corail pastel', value: '#ffccbc' }
]

export default function EditSectionPage() {
  const router = useRouter()
  const params = useParams()
  const sectionId = params.id as string
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery, isLoading: nurseryLoading } = useNursery()

  const [section, setSection] = useState<Section | null>(null)
  const [formData, setFormData] = useState<SectionFormData>({
    section_name: '',
    age_min_months: undefined,
    age_max_months: undefined,
    capacity: undefined,
    color_code: PRESET_COLORS[0].value,
    description: ''
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)

  useEffect(() => {
    if (sectionId && selectedNursery?.id) {
      loadSection()
    }
  }, [sectionId, selectedNursery?.id])

  async function loadSection() {
    try {
      setIsLoadingData(true)
      const data = await sectionService.getById(sectionId)

      if (!data) {
        setError('Section introuvable')
        return
      }

      setSection(data)
      setFormData({
        section_name: data.name || '',
        age_min_months: data.age_min_months || undefined,
        age_max_months: data.age_max_months || undefined,
        capacity: data.capacity || undefined,
        color_code: data.color_hex || PRESET_COLORS[0].value,
        description: ''
      })
    } catch (err: any) {
      console.error('Error loading section:', err)
      setError(err.message || 'Erreur lors du chargement')
    } finally {
      setIsLoadingData(false)
    }
  }

  function handleChange(field: keyof SectionFormData, value: string | number | undefined) {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!selectedNursery?.id) {
      setError('Veuillez sélectionner une crèche')
      return
    }

    if (!formData.section_name.trim()) {
      setError('Le nom de la section est obligatoire')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      await sectionService.update(sectionId, {
        name: formData.section_name,
        age_min_months: formData.age_min_months || undefined,
        age_max_months: formData.age_max_months || undefined,
        capacity: formData.capacity || undefined,
        color_hex: formData.color_code || undefined
      })

      // Redirection vers la liste des sections
      router.push('/owner/sections')
    } catch (err: any) {
      console.error('Error updating section:', err)
      setError(err.message || 'Une erreur est survenue lors de la mise à jour')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (authLoading || nurseryLoading || isLoadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5a9dc9]"></div>
      </div>
    )
  }

  if (!section) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-6 bg-red-50 border-red-200">
          <p className="text-sm text-red-800">Section introuvable</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/owner/sections')}
          className="mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Retour à la liste
        </Button>

        <h1 className="text-3xl font-bold text-gray-900">Modifier la section</h1>
        <p className="text-gray-500 mt-2">Modifiez les informations de la section {section.name}</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Informations générales */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Informations générales</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de la section <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.section_name}
                  onChange={(e) => handleChange('section_name', e.target.value)}
                  placeholder="Bébés, Moyens, Grands..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Âge minimum (mois)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="36"
                    value={formData.age_min_months || ''}
                    onChange={(e) => handleChange('age_min_months', e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Âge maximum (mois)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="36"
                    value={formData.age_max_months || ''}
                    onChange={(e) => handleChange('age_max_months', e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="36"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capacité d'accueil
                </label>
                <Input
                  type="number"
                  min="1"
                  value={formData.capacity || ''}
                  onChange={(e) => handleChange('capacity', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="12"
                />
                <p className="text-xs text-gray-500 mt-1">Nombre maximum d'enfants</p>
              </div>
            </div>
          </Card>

          {/* Couleur de la section */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Couleur de la section</h3>
            <p className="text-sm text-gray-500 mb-4">
              Choisissez une couleur pour identifier facilement la section dans l'interface
            </p>
            <div className="grid grid-cols-4 gap-3">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => handleChange('color_code', color.value)}
                  className={`relative p-4 rounded-lg border-2 transition-all ${
                    formData.color_code === color.value
                      ? 'border-gray-900 ring-2 ring-gray-900 ring-offset-2'
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: color.value }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    {formData.color_code === color.value && (
                      <svg className="h-6 w-6 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <span className="sr-only">{color.name}</span>
                </button>
              ))}
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ou entrez un code couleur personnalisé
              </label>
              <div className="flex items-center space-x-3">
                <Input
                  type="text"
                  value={formData.color_code}
                  onChange={(e) => handleChange('color_code', e.target.value)}
                  placeholder="#f4c2c2"
                  className="flex-1"
                />
                <div
                  className="w-12 h-12 rounded-lg border-2 border-gray-300"
                  style={{ backgroundColor: formData.color_code }}
                />
              </div>
            </div>
          </Card>

          {/* Error Message */}
          {error && (
            <Card className="p-4 bg-red-50 border-red-200">
              <p className="text-sm text-red-800">{error}</p>
            </Card>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/owner/sections')}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#b5ead7] hover:bg-[#a0ddc7] text-gray-900"
            >
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
