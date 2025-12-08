'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AvatarSelector } from '@/components/shared/AvatarSelector'
import {
  UserCircleIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon
} from '@heroicons/react/24/outline'

interface EnterpriseData {
  id: string
  name: string
  legal_form: string | null
  siret: string | null
  logo_url: string | null
}

interface OwnerData {
  id: string
  email: string
  first_name: string
  last_name: string
  avatar: string | null
}

export default function ProfilPage() {
  const { session, isLoading, role, refreshSession } = useAuth()
  const router = useRouter()
  const [ownerData, setOwnerData] = useState<OwnerData | null>(null)
  const [enterpriseData, setEnterpriseData] = useState<EnterpriseData | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    avatar: '',
    enterprise_name: '',
    legal_form: '',
    siret: ''
  })

  useEffect(() => {
    if (!isLoading) {
      if (!session || role !== 'Owner') {
        router.push('/login')
        return
      }

      loadProfileData()
    }
  }, [session, isLoading, role, router])

  const loadProfileData = async () => {
    if (!session?.user?.id) return

    const supabase = createClient()

    // Charger les données du propriétaire (owner)
    const { data: owner, error: ownerError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .eq('role', 'Owner')
      .single()

    if (owner && !ownerError) {
      setOwnerData(owner as unknown as OwnerData)
      setFormData(prev => ({
        ...prev,
        first_name: (owner as any).first_name || '',
        last_name: (owner as any).last_name || '',
        avatar: (owner as any).avatar || ''
      }))
    }

    // Charger les données entreprise
    const { data: enterprise, error: enterpriseError } = await supabase
      .from('enterprise')
      .select('*')
      .eq('owner_id', session.user.id)
      .single()

    if (enterprise && !enterpriseError) {
      setEnterpriseData(enterprise as unknown as EnterpriseData)
      setFormData(prev => ({
        ...prev,
        enterprise_name: (enterprise as any).name || '',
        legal_form: (enterprise as any).legal_form || '',
        siret: (enterprise as any).siret || ''
      }))
    }
  }

  const handleSave = async () => {
    setError(null)
    setSuccess(null)
    setIsSaving(true)

    try {
      const supabase = createClient()

      // Mettre à jour les données du propriétaire (owner)
      const { error: ownerError } = await (supabase as any)
        .from('profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          avatar_url: formData.avatar || null
        })
        .eq('id', session!.user.id)

      if (ownerError) {
        throw new Error('Erreur lors de la mise à jour du profil')
      }

      // Mettre à jour les données entreprise si elle existe
      if (enterpriseData) {
        const { error: enterpriseError } = await (supabase as any)
          .from('enterprise')
          .update({
            name: formData.enterprise_name,
            legal_form: formData.legal_form || null,
            siret: formData.siret || null
          })
          .eq('id', enterpriseData.id)

        if (enterpriseError) {
          throw new Error('Erreur lors de la mise à jour de l\'entreprise')
        }
      }

      // Rafraîchir la session
      await refreshSession()
      await loadProfileData()

      setSuccess('Profil mis à jour avec succès')
      setIsEditing(false)
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    // Réinitialiser le formulaire avec les données actuelles
    if (ownerData) {
      setFormData(prev => ({
        ...prev,
        first_name: ownerData.first_name || '',
        last_name: ownerData.last_name || '',
        avatar: ownerData.avatar || ''
      }))
    }
    if (enterpriseData) {
      setFormData(prev => ({
        ...prev,
        enterprise_name: enterpriseData.name || '',
        legal_form: enterpriseData.legal_form || '',
        siret: enterpriseData.siret || ''
      }))
    }
    setIsEditing(false)
    setError(null)
    setSuccess(null)
  }

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'OW'
  }

  if (isLoading || !session) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
            <p className="mt-4 text-muted-foreground">Chargement...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* En-tête avec avatar */}
        <div className="flex items-center gap-6">
          <Avatar className="h-24 w-24 border-4 border-primary-100">
            {ownerData?.avatar ? (
              <AvatarImage src={`/${ownerData.avatar}`} alt="Avatar" />
            ) : null}
            <AvatarFallback className="bg-gradient-to-br from-primary-400 to-primary-600 text-white text-2xl font-bold">
              {getInitials(ownerData?.first_name, ownerData?.last_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-500 to-primary-700 bg-clip-text text-transparent">
              Mon Profil
            </h1>
            <p className="text-muted-foreground mt-1">
              Gérez vos informations personnelles et celles de votre entreprise
            </p>
            <div className="flex gap-2 mt-3">
              <Badge variant="secondary" className="gap-1">
                <ShieldCheckIcon className="w-3 h-3" />
                Propriétaire
              </Badge>
              {enterpriseData && (
                <Badge variant="outline" className="gap-1">
                  <BuildingOfficeIcon className="w-3 h-3" />
                  {enterpriseData.name}
                </Badge>
              )}
            </div>
          </div>
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)} className="gap-2">
              <PencilIcon className="w-4 h-4" />
              Modifier
            </Button>
          )}
        </div>

        {/* Messages */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <XCircleIcon className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-red-900">Erreur</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {success && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <CheckCircleIcon className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-green-900">Succès</p>
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section Informations personnelles */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserCircleIcon className="w-5 h-5 text-primary-500" />
              <CardTitle>Informations personnelles</CardTitle>
            </div>
            <CardDescription>
              Vos informations d'identification et de contact
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Sélecteur d'avatar en mode édition */}
            {isEditing && (
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
                {isEditing ? (
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="Votre prénom"
                  />
                ) : (
                  <p className="text-lg">{ownerData?.first_name || '-'}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="last_name" className="text-sm font-medium">
                  Nom
                </label>
                {isEditing ? (
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="Votre nom"
                  />
                ) : (
                  <p className="text-lg">{ownerData?.last_name || '-'}</p>
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <div className="flex items-center gap-2">
                <p className="text-lg">{ownerData?.email || '-'}</p>
                <Badge variant="outline" className="text-xs">Non modifiable</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                L'email ne peut pas être modifié. Contactez le développeur si nécessaire.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section Entreprise */}
        {enterpriseData && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BuildingOfficeIcon className="w-5 h-5 text-primary-500" />
                <CardTitle>Mon Entreprise</CardTitle>
              </div>
              <CardDescription>
                Informations légales et administratives de votre structure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="enterprise_name" className="text-sm font-medium">
                  Nom de l'entreprise
                </label>
                {isEditing ? (
                  <Input
                    id="enterprise_name"
                    value={formData.enterprise_name}
                    onChange={(e) => setFormData({ ...formData, enterprise_name: e.target.value })}
                    placeholder="Nom de votre entreprise"
                  />
                ) : (
                  <p className="text-lg font-semibold">{enterpriseData.name || '-'}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="legal_form" className="text-sm font-medium">
                    Forme juridique
                  </label>
                  {isEditing ? (
                    <Select
                      value={formData.legal_form || 'none'}
                      onValueChange={(value) => setFormData({ ...formData, legal_form: value === 'none' ? '' : value })}
                    >
                      <SelectTrigger id="legal_form">
                        <SelectValue placeholder="Sélectionnez une forme juridique" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Non renseigné</SelectItem>
                        <SelectItem value="Auto-entrepreneur">Auto-entrepreneur</SelectItem>
                        <SelectItem value="EURL">EURL</SelectItem>
                        <SelectItem value="SARL">SARL</SelectItem>
                        <SelectItem value="SAS">SAS</SelectItem>
                        <SelectItem value="SASU">SASU</SelectItem>
                        <SelectItem value="Association">Association</SelectItem>
                        <SelectItem value="Autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-lg">{enterpriseData.legal_form || '-'}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="siret" className="text-sm font-medium">
                    SIRET
                  </label>
                  {isEditing ? (
                    <div className="space-y-1">
                      <Input
                        id="siret"
                        value={formData.siret}
                        onChange={(e) => setFormData({ ...formData, siret: e.target.value.replace(/\s/g, '') })}
                        placeholder="14 chiffres"
                        maxLength={14}
                        pattern="[0-9]{14}"
                      />
                      <p className="text-xs text-muted-foreground">
                        Format : 14 chiffres sans espaces
                      </p>
                    </div>
                  ) : (
                    <p className="text-lg font-mono">{enterpriseData.siret || '-'}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Boutons d'action */}
        {isEditing && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1"
                >
                  {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </Button>
                <Button
                  onClick={handleCancel}
                  disabled={isSaving}
                  variant="outline"
                >
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section Sécurité */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="w-5 h-5 text-primary-500" />
              <CardTitle>Sécurité</CardTitle>
            </div>
            <CardDescription>
              Gestion de votre mot de passe et paramètres de sécurité
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground">
              Pour modifier votre mot de passe, contactez le développeur.
            </p>
            <p className="text-sm text-muted-foreground">
              Une fonctionnalité de réinitialisation de mot de passe sera disponible prochainement.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
