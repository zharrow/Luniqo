'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  avatar: string | null
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
    avatar: ''
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
        avatar: (employee as any).avatar || ''
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
        avatar_url: formData.avatar || null
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
        avatar: employeeData.avatar || ''
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
        {/* En-tête avec avatar - Style Violet Lavande (settings) */}
        <div className="rounded-3xl bg-gradient-to-br from-violet-100 via-purple-50 to-indigo-100 p-8 border border-violet-200/50 shadow-lg">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <Avatar className="h-24 w-24 border-4 border-white shadow-xl">
              {employeeData?.avatar ? (
                <AvatarImage src={`/${employeeData.avatar}`} alt="Avatar" />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-violet-400 to-purple-600 text-white text-2xl font-bold">
                {getInitials(employeeData?.first_name, employeeData?.last_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-700 bg-clip-text text-transparent">
                Mon Profil 👤
              </h1>
              <p className="text-gray-600 mt-2">
                Gérez vos informations personnelles et votre code PIN
              </p>
              <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-3">
                <Badge variant="secondary" className="gap-1 bg-violet-100 text-violet-700 border-violet-200">
                  <ShieldCheckIcon className="w-3 h-3" />
                  Employé
                </Badge>
                {enterpriseData && (
                  <Badge variant="outline" className="gap-1 border-violet-200 text-violet-700">
                    <BuildingOfficeIcon className="w-3 h-3" />
                    {enterpriseData.name}
                  </Badge>
                )}
              </div>
            </div>
            {!isEditingProfile && !isEditingPin && (
              <Button
                onClick={() => setIsEditingProfile(true)}
                className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-lg shadow-violet-200 transition-all duration-300 hover:scale-105"
              >
                <PencilIcon className="w-4 h-4" />
                Modifier le profil
              </Button>
            )}
          </div>
        </div>

        {/* Messages */}
        {error && (
          <Card className="rounded-3xl border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50 shadow-lg shadow-rose-100">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <XCircleIcon className="w-6 h-6 text-rose-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-rose-900">Erreur</p>
                  <p className="text-sm text-rose-700">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {success && (
          <Card className="rounded-3xl border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-lg shadow-emerald-100">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <CheckCircleIcon className="w-6 h-6 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-emerald-900">Succès</p>
                  <p className="text-sm text-emerald-700">{success}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section Informations personnelles - Style Users (Rose) */}
        <Card className="rounded-3xl border-rose-200/50 bg-gradient-to-br from-rose-50 to-pink-50 shadow-lg hover:shadow-xl hover:shadow-rose-100 transition-all duration-300">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-2xl bg-gradient-to-br from-rose-100 to-pink-100 p-2 border border-rose-200">
                <UserCircleIcon className="w-5 h-5 text-rose-600" strokeWidth={1.5} />
              </div>
              <div>
                <CardTitle className="text-rose-700">Informations personnelles</CardTitle>
                <CardDescription className="text-rose-600/70">
                  Vos informations d'identification et de contact
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Sélecteur d'avatar en mode édition */}
            {isEditingProfile && (
              <>
                <AvatarSelector
                  selectedAvatar={formData.avatar}
                  onSelect={(avatar) => setFormData({ ...formData, avatar })}
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
        </Card>

        {/* Boutons d'action profil */}
        {isEditingProfile && (
          <Card className="rounded-3xl border-violet-200/50 bg-gradient-to-br from-violet-50 to-purple-50 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <Button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="flex-1 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-lg shadow-violet-200 transition-all duration-300 hover:scale-105"
                >
                  {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </Button>
                <Button
                  onClick={handleCancelProfile}
                  disabled={isSaving}
                  variant="outline"
                  className="border-violet-200 text-violet-700 hover:bg-violet-50"
                >
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section Code PIN - Style Clean (Bleu) */}
        <Card className="rounded-3xl border-sky-200/50 bg-gradient-to-br from-sky-50 to-cyan-50 shadow-lg hover:shadow-xl hover:shadow-sky-100 transition-all duration-300">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-2xl bg-gradient-to-br from-sky-100 to-cyan-100 p-2 border border-sky-200">
                  <KeyIcon className="w-5 h-5 text-sky-600" strokeWidth={1.5} />
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
                  className="border-sky-200 text-sky-700 hover:bg-sky-50 transition-all duration-300 hover:scale-105"
                >
                  Modifier le PIN
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
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
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleSavePin}
                    disabled={isSaving}
                    className="flex-1 bg-gradient-to-r from-sky-500 to-cyan-600 hover:from-sky-600 hover:to-cyan-700 shadow-lg shadow-sky-200 transition-all duration-300 hover:scale-105"
                  >
                    {isSaving ? 'Enregistrement...' : 'Modifier le PIN'}
                  </Button>
                  <Button
                    onClick={handleCancelPin}
                    disabled={isSaving}
                    variant="outline"
                    className="border-sky-200 text-sky-700 hover:bg-sky-50"
                  >
                    Annuler
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-3 bg-sky-50/50 rounded-2xl p-4 border border-sky-100">
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
        </Card>
      </div>
    </>
  )
}
