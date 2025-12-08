'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/contexts/AuthContext'

interface EnterpriseSetupFormProps {
  ownerId: string
}

export default function EnterpriseSetupForm({ ownerId }: EnterpriseSetupFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    legal_form: '',
    siret: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { refreshSession } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const supabase = createClient()

      // Vérifier qu'aucune entreprise n'existe déjà pour cet owner
      const { data: existingEnterprise } = await supabase
        .from('enterprise')
        .select('id')
        .eq('owner_id', ownerId)
        .single()

      if (existingEnterprise) {
        setError('Une entreprise existe déjà pour ce compte.')
        setIsLoading(false)
        return
      }

      // Créer l'entreprise
      const { data: newEnterprise, error: createError } = await (supabase
        .from('enterprise')
        .insert({
          owner_id: ownerId,
          name: formData.name,
          legal_form: formData.legal_form || null,
          siret: formData.siret || null
        } as any)
        .select()
        .single() as any)

      if (createError) {
        console.error('Error creating enterprise:', createError)
        setError('Erreur lors de la création de l\'entreprise. Veuillez réessayer.')
        setIsLoading(false)
        return
      }

      // Rafraîchir la session pour inclure l'entreprise
      await refreshSession()

      // Rediriger vers le dashboard
      router.push('/dashboard')
    } catch (err) {
      console.error('Setup error:', err)
      setError('Une erreur est survenue. Veuillez réessayer.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10 p-4">
      <div className="card max-w-md w-full p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Bienvenue ! 🎉
          </h1>
          <p className="text-gray-600">
            Avant de commencer, créons votre entreprise
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Nom de l'entreprise <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Ex: Crèche Les Petits Loups"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="legal_form" className="block text-sm font-medium text-gray-700 mb-2">
              Forme juridique
            </label>
            <select
              id="legal_form"
              value={formData.legal_form}
              onChange={(e) => setFormData({ ...formData, legal_form: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={isLoading}
            >
              <option value="">Sélectionnez (optionnel)</option>
              <option value="Auto-entrepreneur">Auto-entrepreneur</option>
              <option value="EURL">EURL</option>
              <option value="SARL">SARL</option>
              <option value="SAS">SAS</option>
              <option value="SASU">SASU</option>
              <option value="Association">Association</option>
              <option value="Autre">Autre</option>
            </select>
          </div>

          <div>
            <label htmlFor="siret" className="block text-sm font-medium text-gray-700 mb-2">
              Numéro SIRET
            </label>
            <input
              id="siret"
              type="text"
              value={formData.siret}
              onChange={(e) => setFormData({ ...formData, siret: e.target.value.replace(/\s/g, '') })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="14 chiffres (optionnel)"
              maxLength={14}
              pattern="[0-9]{14}"
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-gray-500">
              Optionnel - Format : 14 chiffres sans espaces
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading || !formData.name}
            className="w-full btn-primary py-3 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Création en cours...' : 'Créer mon entreprise'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            Vous pourrez modifier ces informations plus tard depuis votre profil.
          </p>
        </div>
      </div>
    </div>
  )
}
