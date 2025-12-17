'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AvatarSelector } from '@/components/shared/AvatarSelector'
import {
  UserCircleIcon,
  KeyIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline'
import bcrypt from 'bcryptjs'

interface EmployeeData {
  id: string
  email: string
  first_name: string
  last_name: string
  avatar_url: string | null
  username: string
  enterprise_id: string
}

interface EnterpriseData {
  id: string
  name: string
}

export default function EmployeeProfilePage() {
  const { session, isLoading, role, refreshSession } = useAuth()
  const router = useRouter()
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null)
  const [enterpriseData, setEnterpriseData] = useState<EnterpriseData | null>(null)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isEditingPin, setIsEditingPin] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    avatar_url: ''
  })
  const [pinData, setPinData] = useState({
    currentPin: '',
    newPin: '',
    confirmPin: ''
  })

  useEffect(() => {
    if (!isLoading) {
      if (!session || role !== 'Employee') {
        router.push('/login')
        return
      }

      loadProfileData()
    }
  }, [session, isLoading, role, router])

  const loadProfileData = async () => {
    if (!session?.user?.id) return

    const supabase = createClient()

    // Charger les données de l'employé
    const { data: employee, error: employeeError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .eq('role', 'Employee')
      .single()

    if (employee && !employeeError) {
      setEmployeeData(employee as unknown as EmployeeData)
      setFormData({
        first_name: (employee as any).first_name || '',
        last_name: (employee as any).last_name || '',
        avatar_url: (employee as any).avatar_url || ''
      })

      // Charger les données entreprise
      if ((employee as any).enterprise_id) {
        const { data: enterprise } = await supabase
          .from('enterprise')
          .select('id, name')
          .eq('id', (employee as any).enterprise_id)
          .single()

        if (enterprise) {
          setEnterpriseData(enterprise as unknown as EnterpriseData)
        }
      }
    }
  }

  const handleSaveProfile = async () => {
    setError(null)
    setSuccess(null)
    setIsSaving(true)

    try {
      const supabase = createClient()

      const updateData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        avatar_url: formData.avatar_url || null
      }

      const { error: updateError } = await (supabase as any)
        .from('profiles')
        .update(updateData)
        .eq('id', session!.user.id)

      if (updateError) {
        throw new Error('Erreur lors de la mise à jour du profil')
      }

      await refreshSession()
      await loadProfileData()

      setSuccess('Profil mis à jour avec succès')
      setIsEditingProfile(false)
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSavePin = async () => {
    setError(null)
    setSuccess(null)

    // Validation
    if (!pinData.currentPin || !pinData.newPin || !pinData.confirmPin) {
      setError('Tous les champs sont obligatoires')
      return
    }

    if (pinData.newPin.length !== 4 || !/^\d{4}$/.test(pinData.newPin)) {
      setError('Le nouveau PIN doit contenir exactement 4 chiffres')
      return
    }

    if (pinData.newPin !== pinData.confirmPin) {
      setError('Les PINs ne correspondent pas')
      return
    }

    setIsSaving(true)

    try {
      const supabase = createClient()

      // Vérifier le PIN actuel
      const { data: employee } = await supabase
        .from('profiles')
        .select('pin_hash')
        .eq('id', session!.user.id)
        .single()

      const employeeData = employee as any
      if (!employeeData || !employeeData.pin_hash) {
        throw new Error('Impossible de vérifier le PIN actuel')
      }

      const isValidPin = await bcrypt.compare(pinData.currentPin, employeeData.pin_hash)
      if (!isValidPin) {
        throw new Error('PIN actuel incorrect')
      }

      // Hasher le nouveau PIN
      const newPinHash = await bcrypt.hash(pinData.newPin, 10)

      // Mettre à jour le PIN
      const updatePinData = { pin_hash: newPinHash }
      const { error: updateError } = await (supabase as any)
        .from('profiles')
        .update(updatePinData)
        .eq('id', session!.user.id)

      if (updateError) {
        throw new Error('Erreur lors de la mise à jour du PIN')
      }

      setSuccess('PIN modifié avec succès')
      setIsEditingPin(false)
      setPinData({ currentPin: '', newPin: '', confirmPin: '' })
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelProfile = () => {
    if (employeeData) {
      setFormData({
        first_name: employeeData.first_name || '',
        last_name: employeeData.last_name || '',
        avatar_url: employeeData.avatar_url || ''
      })
    }
    setIsEditingProfile(false)
    setError(null)
    setSuccess(null)
  }

  const handleCancelPin = () => {
    setPinData({ currentPin: '', newPin: '', confirmPin: '' })
    setIsEditingPin(false)
    setError(null)
    setSuccess(null)
  }

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'EM'
  }

  if (isLoading || !session) {
    return (
      <>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
            <p className="mt-4 text-muted-foreground">Chargement...</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* En-tête avec avatar - Style Violet Lavande (settings) - Adouci */}
        <div
          className="relative rounded-3xl p-8 bg-white overflow-hidden hover:-translate-y-1 transition-all duration-300"
          style={{
            border: '1px solid #b39ddb33',
            background: 'linear-gradient(135deg, #faf5ff 0%, #ffffff 100%)',
            boxShadow: '0 0 0 0 rgba(179,157,219,0.15)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 12px 40px -10px rgba(179,157,219,0.15)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 0 0 0 rgba(179,157,219,0.15)'
          }}
        >
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <Avatar className="h-24 w-24 border-4 border-white shadow-xl transition-transform duration-300 hover:scale-105">
              {employeeData?.avatar_url ? (
                <AvatarImage src={employeeData.avatar_url} alt="Avatar" />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-violet-400 to-purple-600 text-white text-2xl font-bold">
                {getInitials(employeeData?.first_name, employeeData?.last_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-700 bg-clip-text text-transparent mb-2">
                Mon Profil 👤
              </h1>
              <p className="text-gray-600 mb-3">
                Gérez vos informations personnelles et votre code PIN
              </p>
              <div className="flex flex-wrap justify-center md:justify-start gap-2">
                <Badge
                  variant="secondary"
                  className="gap-1 bg-violet-50 text-violet-700 border-violet-200 transition-all duration-300 hover:scale-105"
                >
                  <ShieldCheckIcon className="w-3 h-3" />
                  Employé
                </Badge>
                {enterpriseData && (
                  <Badge
                    variant="outline"
                    className="gap-1 border-violet-200 text-violet-700 transition-all duration-300 hover:scale-105"
                  >
                    <BuildingOfficeIcon className="w-3 h-3" />
                    {enterpriseData.name}
                  </Badge>
                )}
              </div>
            </div>
            {!isEditingProfile && !isEditingPin && (
              <Button
                onClick={() => setIsEditingProfile(true)}
                className="gap-2 bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-md hover:shadow-lg transition-all duration-300"
              >
                <PencilIcon className="w-4 h-4" />
                Modifier le profil
              </Button>
            )}
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div
            className="relative rounded-3xl p-6 bg-white overflow-hidden"
            style={{
              border: '1px solid #f4a5a533',
              background: 'linear-gradient(135deg, #fff5f7 0%, #ffffff 100%)'
            }}
          >
            <div className="flex items-start gap-3">
              <XCircleIcon className="w-6 h-6 text-rose-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-rose-900">Erreur</p>
                <p className="text-sm text-rose-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div
            className="relative rounded-3xl p-6 bg-white overflow-hidden"
            style={{
              border: '1px solid #81c99533',
              background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)'
            }}
          >
            <div className="flex items-start gap-3">
              <CheckCircleIcon className="w-6 h-6 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-emerald-900">Succès</p>
                <p className="text-sm text-emerald-700">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Section Informations personnelles - Style Users (Rose) - Adouci */}
        <div
          className="relative rounded-3xl p-6 bg-white overflow-hidden hover:-translate-y-1 transition-all duration-300"
          style={{
            border: '1px solid #f4a5a533',
            background: 'linear-gradient(135deg, #fff5f7 0%, #ffffff 100%)',
            boxShadow: '0 0 0 0 rgba(244,165,165,0.15)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 12px 40px -10px rgba(244,165,165,0.15)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 0 0 0 rgba(244,165,165,0.15)'
          }}
        >
          <CardHeader className="p-0 mb-6">
            <div className="flex items-center gap-3">
              <div
                className="rounded-2xl p-3 border transition-all duration-300 hover:scale-105 hover:rotate-2"
                style={{
                  background: 'linear-gradient(135deg, #fff5f7, #fce4ec)',
                  borderColor: '#f4a5a533'
                }}
              >
                <UserCircleIcon className="w-6 h-6 text-rose-600" strokeWidth={1.5} />
              </div>
              <div>
                <CardTitle className="text-rose-700">Informations personnelles</CardTitle>
                <CardDescription className="text-rose-600/70">
                  Vos informations d'identification et de contact
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-0">
            {/* Sélecteur d'avatar en mode édition */}
            {isEditingProfile && (
              <>
                <AvatarSelector
                  selectedAvatar={formData.avatar_url}
                  onSelect={(avatar) => setFormData({ ...formData, avatar_url: avatar })}
                />
                <Separator />
              </>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="first_name" className="text-sm font-medium">
                  Prénom
                </label>
                {isEditingProfile ? (
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="Votre prénom"
                    className="transition-all duration-300 focus:scale-[1.01]"
                  />
                ) : (
                  <p className="text-lg">{employeeData?.first_name || '-'}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="last_name" className="text-sm font-medium">
                  Nom
                </label>
                {isEditingProfile ? (
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="Votre nom"
                    className="transition-all duration-300 focus:scale-[1.01]"
                  />
                ) : (
                  <p className="text-lg">{employeeData?.last_name || '-'}</p>
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <div className="flex items-center gap-2">
                <p className="text-lg">{employeeData?.email || '-'}</p>
                <Badge variant="outline" className="text-xs">Non modifiable</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                L'email ne peut pas être modifié. Contactez votre responsable si nécessaire.
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <label className="text-sm font-medium">Nom d'utilisateur (Tablette)</label>
              <div className="flex items-center gap-2">
                <p className="text-lg font-mono bg-muted px-3 py-1 rounded">
                  {employeeData?.username || '-'}
                </p>
                <Badge variant="outline" className="text-xs">Auto-généré</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Utilisez ce nom d'utilisateur pour vous connecter sur la tablette
              </p>
            </div>
          </CardContent>
        </div>

        {/* Boutons d'action profil */}
        {isEditingProfile && (
          <div
            className="relative rounded-3xl p-6 bg-white overflow-hidden"
            style={{
              border: '1px solid #b39ddb33',
              background: 'linear-gradient(135deg, #faf5ff 0%, #ffffff 100%)'
            }}
          >
            <div className="flex gap-3">
              <Button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="flex-1 bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-md hover:shadow-lg transition-all duration-300"
              >
                {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </Button>
              <Button
                onClick={handleCancelProfile}
                disabled={isSaving}
                variant="outline"
                className="border-violet-200 text-violet-700 hover:bg-violet-50 transition-all duration-300"
              >
                Annuler
              </Button>
            </div>
          </div>
        )}

        {/* Section Code PIN - Style Clean (Bleu) - Adouci */}
        <div
          className="relative rounded-3xl p-6 bg-white overflow-hidden hover:-translate-y-1 transition-all duration-300"
          style={{
            border: '1px solid #5a9dc933',
            background: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%)',
            boxShadow: '0 0 0 0 rgba(90,157,201,0.15)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 12px 40px -10px rgba(90,157,201,0.15)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 0 0 0 rgba(90,157,201,0.15)'
          }}
        >
          <CardHeader className="p-0 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="rounded-2xl p-3 border transition-all duration-300 hover:scale-105 hover:rotate-2"
                  style={{
                    background: 'linear-gradient(135deg, #f0f9ff, #dbeafe)',
                    borderColor: '#5a9dc933'
                  }}
                >
                  <KeyIcon className="w-6 h-6 text-sky-600" strokeWidth={1.5} />
                </div>
                <div>
                  <CardTitle className="text-sky-700">Code PIN Tablette 🔐</CardTitle>
                  <CardDescription className="text-sky-600/70">
                    Gérez votre code PIN à 4 chiffres pour l'accès tablette
                  </CardDescription>
                </div>
              </div>
              {!isEditingPin && !isEditingProfile && (
                <Button
                  onClick={() => setIsEditingPin(true)}
                  variant="outline"
                  size="sm"
                  className="border-sky-200 text-sky-700 hover:bg-sky-50 transition-all duration-300"
                >
                  Modifier le PIN
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-0">
            {isEditingPin ? (
              <>
                <div className="space-y-2">
                  <label htmlFor="current_pin" className="text-sm font-medium">
                    PIN actuel *
                  </label>
                  <Input
                    id="current_pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={pinData.currentPin}
                    onChange={(e) => setPinData({ ...pinData, currentPin: e.target.value.replace(/\D/g, '') })}
                    placeholder="••••"
                    className="transition-all duration-300 focus:scale-[1.01]"
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <label htmlFor="new_pin" className="text-sm font-medium">
                    Nouveau PIN *
                  </label>
                  <Input
                    id="new_pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={pinData.newPin}
                    onChange={(e) => setPinData({ ...pinData, newPin: e.target.value.replace(/\D/g, '') })}
                    placeholder="••••"
                    className="transition-all duration-300 focus:scale-[1.01]"
                  />
                  <p className="text-xs text-muted-foreground">
                    4 chiffres uniquement
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirm_pin" className="text-sm font-medium">
                    Confirmer le nouveau PIN *
                  </label>
                  <Input
                    id="confirm_pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={pinData.confirmPin}
                    onChange={(e) => setPinData({ ...pinData, confirmPin: e.target.value.replace(/\D/g, '') })}
                    placeholder="••••"
                    className="transition-all duration-300 focus:scale-[1.01]"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleSavePin}
                    disabled={isSaving}
                    className="flex-1 bg-gradient-to-br from-sky-500 to-cyan-600 hover:from-sky-600 hover:to-cyan-700 shadow-md hover:shadow-lg transition-all duration-300"
                  >
                    {isSaving ? 'Enregistrement...' : 'Modifier le PIN'}
                  </Button>
                  <Button
                    onClick={handleCancelPin}
                    disabled={isSaving}
                    variant="outline"
                    className="border-sky-200 text-sky-700 hover:bg-sky-50 transition-all duration-300"
                  >
                    Annuler
                  </Button>
                </div>
              </>
            ) : (
              <div
                className="space-y-3 rounded-2xl p-4 border"
                style={{
                  background: 'linear-gradient(135deg, #f0f9ff, #ffffff)',
                  borderColor: '#5a9dc933'
                }}
              >
                <p className="text-sky-700">
                  Votre code PIN est utilisé pour vous connecter rapidement sur la tablette.
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
                  <span className="font-medium text-emerald-700">PIN configuré</span>
                </div>
              </div>
            )}
          </CardContent>
        </div>
      </div>
    </>
  )
}
