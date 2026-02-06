'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/contexts/AuthContext'
import { NurseryInsert } from '@/types/database.types'
import { modulesService } from '@/lib/services/modules.service'
import { STARTER_PACKS } from '@/lib/constants/starter-templates'
import { starterTemplatesService } from '@/lib/services/starter-templates.service'

interface EnterpriseSetupFormProps {
  ownerId: string
}

export default function EnterpriseSetupForm({ ownerId }: EnterpriseSetupFormProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [enterpriseData, setEnterpriseData] = useState({
    name: '',
    legal_form: '',
    siret: ''
  })
  const [nurseryData, setNurseryData] = useState({
    name: '',
    address: '',
    city: '',
    postal_code: '',
    phone: '',
    email: '',
    capacity: ''
  })
  const [createdEnterpriseId, setCreatedEnterpriseId] = useState<string | null>(null)
  const [createdNurseryId, setCreatedNurseryId] = useState<string | null>(null)
  const [selectedPack, setSelectedPack] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingEnterprise, setIsCheckingEnterprise] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { refreshSession } = useAuth()

  // Check if enterprise already exists on mount (handles page refresh during step 2)
  useEffect(() => {
    async function checkExistingEnterprise() {
      try {
        const supabase = createClient()
        const { data: existingEnterprise } = await supabase
          .from('enterprise')
          .select('id, name')
          .eq('owner_id', ownerId)
          .single()

        if (existingEnterprise) {
          // Enterprise exists - check if it has a nursery
          const { data: existingNursery } = await supabase
            .from('nursery')
            .select('id')
            .eq('enterprise_id', (existingEnterprise as any).id)
            .limit(1)
            .maybeSingle()

          if (existingNursery) {
            // Both exist - redirect to dashboard
            router.push('/owner/dashboard')
          } else {
            // Enterprise exists but no nursery - go to step 2
            setCreatedEnterpriseId((existingEnterprise as any).id)
            setEnterpriseData(prev => ({ ...prev, name: (existingEnterprise as any).name }))
            setStep(2)
          }
        }
      } catch (err) {
        // No enterprise found - stay on step 1
        console.log('No existing enterprise found')
      } finally {
        setIsCheckingEnterprise(false)
      }
    }

    checkExistingEnterprise()
  }, [ownerId, router])

  const handleEnterpriseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const supabase = createClient()

      // Vérifier si une entreprise existe déjà pour cet owner
      const { data: existingEnterprise } = await supabase
        .from('enterprise')
        .select('id')
        .eq('owner_id', ownerId)
        .maybeSingle()

      if (existingEnterprise) {
        // Enterprise already exists - just go to step 2
        setCreatedEnterpriseId((existingEnterprise as any).id)
        setStep(2)
        setIsLoading(false)
        return
      }

      // Créer l'entreprise
      const { data: newEnterprise, error: createError } = await (supabase
        .from('enterprise')
        .insert({
          owner_id: ownerId,
          name: enterpriseData.name,
          legal_form: enterpriseData.legal_form || null,
          siret: enterpriseData.siret || null
        } as any)
        .select()
        .single() as any)

      if (createError) {
        console.error('Error creating enterprise:', createError)
        setError('Erreur lors de la création de l\'entreprise. Veuillez réessayer.')
        setIsLoading(false)
        return
      }

      // Sauvegarder l'ID de l'entreprise et passer à l'étape 2
      setCreatedEnterpriseId(newEnterprise.id)
      setStep(2)
      setIsLoading(false)
    } catch (err) {
      console.error('Setup error:', err)
      setError('Une erreur est survenue. Veuillez réessayer.')
      setIsLoading(false)
    }
  }

  const handleNurserySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const supabase = createClient()

      if (!createdEnterpriseId) {
        setError('Erreur: ID entreprise manquant.')
        setIsLoading(false)
        return
      }

      // Créer la crèche (première crèche = default)
      const nurseryInsert: NurseryInsert = {
        enterprise_id: createdEnterpriseId,
        name: nurseryData.name,
        address: nurseryData.address || null,
        city: nurseryData.city || null,
        postal_code: nurseryData.postal_code || null,
        phone: nurseryData.phone || null,
        email: nurseryData.email || null,
        capacity: nurseryData.capacity ? parseInt(nurseryData.capacity) : null,
        is_default: true,
        is_active: true
      }

      const { data: newNursery, error: nurseryError } = await supabase
        .from('nursery')
        .insert(nurseryInsert as any)
        .select('id')
        .single()

      if (nurseryError) {
        console.error('Error creating nursery:', nurseryError)
        setError('Erreur lors de la création de la crèche. Veuillez réessayer.')
        setIsLoading(false)
        return
      }

      // Activer le module de base pour la nouvelle crèche
      try {
        await modulesService.grantNurseryModuleAccess(
          (newNursery as any).id,
          'base',
          ownerId,
          'Module de base activé automatiquement à la création'
        )
      } catch (moduleError) {
        console.error('Error activating base module:', moduleError)
        // Ne pas bloquer si l'activation du module échoue
      }

      // Sauvegarder l'ID de la crèche et passer à l'étape 3
      setCreatedNurseryId((newNursery as any).id)
      setStep(3)
      setIsLoading(false)
    } catch (err) {
      console.error('Nursery creation error:', err)
      setError('Une erreur est survenue. Veuillez réessayer.')
      setIsLoading(false)
    }
  }

  const handlePackSelect = async (packId: string | null) => {
    setError(null)
    setIsLoading(true)
    setSelectedPack(packId)

    try {
      if (packId && createdNurseryId && createdEnterpriseId) {
        // Appliquer le pack sélectionné
        const result = await starterTemplatesService.applyStarterPack(
          packId,
          createdNurseryId,
          createdEnterpriseId
        )

        if (!result.success) {
          throw new Error(result.error || 'Erreur lors de l\'application du pack')
        }
      }

      // Rafraîchir la session pour inclure l'entreprise
      await refreshSession()

      // Rediriger vers le dashboard
      router.push('/owner/dashboard')
    } catch (err: any) {
      console.error('Error applying starter pack:', err)
      setError(err.message || 'Une erreur est survenue. Veuillez réessayer.')
      setIsLoading(false)
    }
  }

  // Show loading while checking for existing enterprise
  if (isCheckingEnterprise) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10 p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Vérification en cours...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10 p-4">
      <div className="card max-w-md w-full p-8">
        {/* Progress indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              step === 1 ? 'bg-primary text-white' : 'bg-green-500 text-white'
            }`}>
              {step > 1 ? '✓' : '1'}
            </div>
            <div className={`w-8 h-0.5 ${step > 1 ? 'bg-green-500' : 'bg-gray-300'}`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              step === 2 ? 'bg-primary text-white' : step > 2 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {step > 2 ? '✓' : '2'}
            </div>
            <div className={`w-8 h-0.5 ${step > 2 ? 'bg-green-500' : 'bg-gray-300'}`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              step === 3 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              3
            </div>
          </div>
        </div>

        {/* Step 1: Enterprise */}
        {step === 1 && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Bienvenue ! 🎉
              </h1>
              <p className="text-gray-600">
                Étape 1/3 : Créons votre entreprise
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleEnterpriseSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nom de l'entreprise <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={enterpriseData.name}
                  onChange={(e) => setEnterpriseData({ ...enterpriseData, name: e.target.value })}
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
                  value={enterpriseData.legal_form}
                  onChange={(e) => setEnterpriseData({ ...enterpriseData, legal_form: e.target.value })}
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
                  value={enterpriseData.siret}
                  onChange={(e) => setEnterpriseData({ ...enterpriseData, siret: e.target.value.replace(/\s/g, '') })}
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
                disabled={isLoading || !enterpriseData.name}
                className="w-full btn-primary py-3 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Création en cours...' : 'Continuer →'}
              </button>
            </form>
          </>
        )}

        {/* Step 2: Nursery */}
        {step === 2 && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Parfait ! 🏠
              </h1>
              <p className="text-gray-600">
                Étape 2/3 : Créons votre première crèche
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleNurserySubmit} className="space-y-6">
              <div>
                <label htmlFor="nursery_name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nom de la crèche <span className="text-red-500">*</span>
                </label>
                <input
                  id="nursery_name"
                  type="text"
                  required
                  value={nurseryData.name}
                  onChange={(e) => setNurseryData({ ...nurseryData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Ex: Site Centre-Ville"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                  Adresse
                </label>
                <input
                  id="address"
                  type="text"
                  value={nurseryData.address}
                  onChange={(e) => setNurseryData({ ...nurseryData, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Ex: 123 Rue de la République"
                  disabled={isLoading}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                    Ville
                  </label>
                  <input
                    id="city"
                    type="text"
                    value={nurseryData.city}
                    onChange={(e) => setNurseryData({ ...nurseryData, city: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Ex: Paris"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700 mb-2">
                    Code postal
                  </label>
                  <input
                    id="postal_code"
                    type="text"
                    value={nurseryData.postal_code}
                    onChange={(e) => setNurseryData({ ...nurseryData, postal_code: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="75001"
                    maxLength={5}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Téléphone
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={nurseryData.phone}
                    onChange={(e) => setNurseryData({ ...nurseryData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="01 23 45 67 89"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-2">
                    Capacité
                  </label>
                  <input
                    id="capacity"
                    type="number"
                    min={1}
                    value={nurseryData.capacity}
                    onChange={(e) => setNurseryData({ ...nurseryData, capacity: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="20"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={nurseryData.email}
                  onChange={(e) => setNurseryData({ ...nurseryData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="contact@creche.fr"
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !nurseryData.name}
                className="w-full btn-primary py-3 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Création en cours...' : 'Continuer →'}
              </button>
            </form>
          </>
        )}

        {/* Step 3: Starter Pack */}
        {step === 3 && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Dernière étape ! ✨
              </h1>
              <p className="text-gray-600">
                Étape 3/3 : Choisissez un pack de démarrage
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <p className="text-sm text-gray-600 text-center mb-4">
                Gagnez du temps avec des pièces et tâches pré-configurées
              </p>

              {STARTER_PACKS.map((pack) => (
                <button
                  key={pack.id}
                  onClick={() => handlePackSelect(pack.id)}
                  disabled={isLoading}
                  className={`w-full p-4 border-2 rounded-xl text-left transition-all hover:border-primary hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed ${
                    selectedPack === pack.id ? 'border-primary bg-primary/5' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{pack.icon}</span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">{pack.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{pack.description}</p>
                      {pack.rooms.length > 0 && (
                        <p className="text-xs text-primary mt-2">
                          {pack.rooms.length} pièces • {pack.tasks.length} tâches
                        </p>
                      )}
                      {pack.rooms.length === 0 && (
                        <p className="text-xs text-primary mt-2">
                          {pack.tasks.length} tâches (créez vos pièces manuellement)
                        </p>
                      )}
                    </div>
                    {isLoading && selectedPack === pack.id && (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
                    )}
                  </div>
                </button>
              ))}

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-sm text-gray-500">ou</span>
                </div>
              </div>

              <button
                onClick={() => handlePackSelect(null)}
                disabled={isLoading}
                className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl text-center text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading && selectedPack === null ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent" />
                    Finalisation...
                  </span>
                ) : (
                  'Commencer avec une configuration vide'
                )}
              </button>
            </div>
          </>
        )}

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            Vous pourrez modifier ces informations plus tard depuis votre profil.
          </p>
        </div>
      </div>
    </div>
  )
}
