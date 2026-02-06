'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AvatarSelector } from '@/components/shared/AvatarSelector'
import {
  UserCircleIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon,
  ExclamationTriangleIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { deleteOwnerAccount } from '@/lib/actions/account.actions'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'

interface EnterpriseData {
  id: string
  name: string
  legal_form: string | null
  siret: string | null
  logo_url: string | null
  address: string | null
  city: string | null
  postal_code: string | null
  phone: string | null
  email: string | null
}

interface OwnerData {
  id: string
  email: string
  first_name: string
  last_name: string
  avatar: string | null
}

export default function ProfilPage() {
  const { session, isLoading, role, refreshSession, logout } = useAuth()
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
    siret: '',
    address: '',
    city: '',
    postal_code: '',
    phone: '',
    email: ''
  })
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

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
        siret: (enterprise as any).siret || '',
        address: (enterprise as any).address || '',
        city: (enterprise as any).city || '',
        postal_code: (enterprise as any).postal_code || '',
        phone: (enterprise as any).phone || '',
        email: (enterprise as any).email || ''
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
            siret: formData.siret || null,
            address: formData.address || null,
            city: formData.city || null,
            postal_code: formData.postal_code || null,
            phone: formData.phone || null,
            email: formData.email || null
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
        siret: enterpriseData.siret || '',
        address: enterpriseData.address || '',
        city: enterpriseData.city || '',
        postal_code: enterpriseData.postal_code || '',
        phone: enterpriseData.phone || '',
        email: enterpriseData.email || ''
      }))
    }
    setIsEditing(false)
    setError(null)
    setSuccess(null)
  }

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'OW'
  }

  const handleDeleteAccount = async () => {
    if (!session?.user?.id) return

    setIsDeleting(true)
    setError(null)

    try {
      const result = await deleteOwnerAccount(session.user.id)

      if (!result.success) {
        setError(result.error || 'Erreur lors de la suppression du compte')
        setIsDeleting(false)
        setShowDeleteDialog(false)
        return
      }

      // Déconnecter et rediriger vers la page de connexion
      await logout()
      router.push('/login?deleted=true')
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue')
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const confirmationText = 'SUPPRIMER'
  const isDeleteConfirmed = deleteConfirmation === confirmationText

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
        {/* Breadcrumb */}
        <PageBreadcrumb
          items={[
            { label: 'Dashboard', href: '/owner/dashboard' },
            { label: 'Profil' }
          ]}
        />

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-purple-100">
              <UserCircleIcon className="w-6 h-6 text-purple-600" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Mon Profil</h1>
              <p className="text-sm text-muted-foreground">
                Gérez vos informations personnelles et celles de votre entreprise
              </p>
            </div>
          </div>
          {!isEditing && (
            <Button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white"
            >
              <PencilIcon className="w-4 h-4" />
              Modifier
            </Button>
          )}
        </div>

        {/* Messages - Style organique */}
        {error && (
          <div
            className="relative rounded-3xl p-6 bg-white overflow-hidden"
            style={{
              border: '1px solid #f8717133',
              background: 'linear-gradient(to bottom right, #fef2f2, white)'
            }}
          >
            <div className="flex items-start gap-3">
              <XCircleIcon className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-red-900">Erreur</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div
            className="relative rounded-3xl p-6 bg-white overflow-hidden"
            style={{
              border: '1px solid #b5ead733',
              background: 'linear-gradient(to bottom right, #f0fdf4, white)'
            }}
          >
            <div className="flex items-start gap-3">
              <CheckCircleIcon className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-green-900">Succès</p>
                <p className="text-sm text-green-700">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Section Informations personnelles - Style organique */}
        <div
          className="relative rounded-3xl p-6 bg-white overflow-hidden hover:shadow-lg transition-all duration-300"
          style={{
            border: '1px solid #f4c2c233',
            background: 'linear-gradient(to bottom right, #fef8f8, white)'
          }}
        >
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="inline-flex items-center justify-center w-10 h-10 rounded-2xl"
                style={{ background: 'linear-gradient(to bottom right, #f4c2c21A, #f4c2c20D)' }}
              >
                <UserCircleIcon className="w-5 h-5" style={{ color: '#e59ba1' }} strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Informations personnelles</h3>
            </div>
            <p className="text-sm text-muted-foreground ml-12">
              Vos informations d'identification et de contact
            </p>
          </div>

          <div className="space-y-4">
            {/* Sélecteur d'avatar en mode édition */}
            {isEditing && (
              <>
                <AvatarSelector
                  selectedAvatar={formData.avatar}
                  onSelect={(avatar) => setFormData({ ...formData, avatar })}
                />
                <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent my-4" />
              </>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="first_name" className="text-sm font-medium text-gray-700">
                  Prénom
                </label>
                {isEditing ? (
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="Votre prénom"
                    className="rounded-xl border-gray-200 focus:border-pink-300 focus:ring-pink-200"
                  />
                ) : (
                  <p className="text-lg font-medium text-gray-900">{ownerData?.first_name || '-'}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="last_name" className="text-sm font-medium text-gray-700">
                  Nom
                </label>
                {isEditing ? (
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="Votre nom"
                    className="rounded-xl border-gray-200 focus:border-pink-300 focus:ring-pink-200"
                  />
                ) : (
                  <p className="text-lg font-medium text-gray-900">{ownerData?.last_name || '-'}</p>
                )}
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent my-4" />

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <div className="flex items-center gap-2">
                <p className="text-lg font-medium text-gray-900">{ownerData?.email || '-'}</p>
                <Badge variant="outline" className="text-xs border-pink-200 text-pink-700">Non modifiable</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                L'email ne peut pas être modifié. Contactez le développeur si nécessaire.
              </p>
            </div>
          </div>
        </div>

        {/* Section Entreprise - Style organique */}
        {enterpriseData && (
          <div
            className="relative rounded-3xl p-6 bg-white overflow-hidden hover:shadow-lg transition-all duration-300"
            style={{
              border: '1px solid #c5b3d133',
              background: 'linear-gradient(to bottom right, #f5f3f8, white)'
            }}
          >
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="inline-flex items-center justify-center w-10 h-10 rounded-2xl"
                  style={{ background: 'linear-gradient(to bottom right, #c5b3d11A, #c5b3d10D)' }}
                >
                  <BuildingOfficeIcon className="w-5 h-5" style={{ color: '#9c89b8' }} strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Mon Entreprise</h3>
              </div>
              <p className="text-sm text-muted-foreground ml-12">
                Informations légales et administratives de votre structure
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="enterprise_name" className="text-sm font-medium text-gray-700">
                  Nom de l'entreprise
                </label>
                {isEditing ? (
                  <Input
                    id="enterprise_name"
                    value={formData.enterprise_name}
                    onChange={(e) => setFormData({ ...formData, enterprise_name: e.target.value })}
                    placeholder="Nom de votre entreprise"
                    className="rounded-xl border-gray-200 focus:border-purple-300 focus:ring-purple-200"
                  />
                ) : (
                  <p className="text-lg font-semibold text-gray-900">{enterpriseData.name || '-'}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="legal_form" className="text-sm font-medium text-gray-700">
                    Forme juridique
                  </label>
                  {isEditing ? (
                    <Select
                      value={formData.legal_form || 'none'}
                      onValueChange={(value) => setFormData({ ...formData, legal_form: value === 'none' ? '' : value })}
                    >
                      <SelectTrigger id="legal_form" className="rounded-xl border-gray-200 focus:border-purple-300 focus:ring-purple-200">
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
                    <p className="text-lg font-medium text-gray-900">{enterpriseData.legal_form || '-'}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="siret" className="text-sm font-medium text-gray-700">
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
                        className="rounded-xl border-gray-200 focus:border-purple-300 focus:ring-purple-200"
                      />
                      <p className="text-xs text-muted-foreground">
                        Format : 14 chiffres sans espaces
                      </p>
                    </div>
                  ) : (
                    <p className="text-lg font-mono font-medium text-gray-900">{enterpriseData.siret || '-'}</p>
                  )}
                </div>
              </div>

              {/* Séparateur */}
              <div className="h-px bg-gradient-to-r from-transparent via-purple-200 to-transparent my-4" />

              {/* Adresse du siège social */}
              <div className="space-y-2">
                <label htmlFor="address" className="text-sm font-medium text-gray-700">
                  Adresse du siège social
                </label>
                {isEditing ? (
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="ex: 123 Rue de la République"
                    className="rounded-xl border-gray-200 focus:border-purple-300 focus:ring-purple-200"
                  />
                ) : (
                  <p className="text-lg font-medium text-gray-900">{enterpriseData.address || '-'}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="city" className="text-sm font-medium text-gray-700">
                    Ville
                  </label>
                  {isEditing ? (
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="ex: Paris"
                      className="rounded-xl border-gray-200 focus:border-purple-300 focus:ring-purple-200"
                    />
                  ) : (
                    <p className="text-lg font-medium text-gray-900">{enterpriseData.city || '-'}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="postal_code" className="text-sm font-medium text-gray-700">
                    Code postal
                  </label>
                  {isEditing ? (
                    <Input
                      id="postal_code"
                      value={formData.postal_code}
                      onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                      placeholder="ex: 75001"
                      maxLength={5}
                      className="rounded-xl border-gray-200 focus:border-purple-300 focus:ring-purple-200"
                    />
                  ) : (
                    <p className="text-lg font-medium text-gray-900">{enterpriseData.postal_code || '-'}</p>
                  )}
                </div>
              </div>

              {/* Séparateur */}
              <div className="h-px bg-gradient-to-r from-transparent via-purple-200 to-transparent my-4" />

              {/* Contact */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="phone" className="text-sm font-medium text-gray-700">
                    Téléphone
                  </label>
                  {isEditing ? (
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="ex: 01 23 45 67 89"
                      className="rounded-xl border-gray-200 focus:border-purple-300 focus:ring-purple-200"
                    />
                  ) : (
                    <p className="text-lg font-medium text-gray-900">{enterpriseData.phone || '-'}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email de contact
                  </label>
                  {isEditing ? (
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="ex: contact@entreprise.fr"
                      className="rounded-xl border-gray-200 focus:border-purple-300 focus:ring-purple-200"
                    />
                  ) : (
                    <p className="text-lg font-medium text-gray-900">{enterpriseData.email || '-'}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Boutons d'action - Style organique */}
        {isEditing && (
          <div
            className="relative rounded-3xl p-6 bg-white overflow-hidden"
            style={{
              border: '1px solid #c5b3d133',
              background: 'linear-gradient(to bottom right, #f5f3f8, white)'
            }}
          >
            <div className="flex gap-3">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 rounded-xl"
              >
                {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </Button>
              <Button
                onClick={handleCancel}
                disabled={isSaving}
                variant="outline"
                className="border-purple-200 text-purple-700 hover:bg-purple-50 rounded-xl"
              >
                Annuler
              </Button>
            </div>
          </div>
        )}

        {/* Section Sécurité - Style organique */}
        <div
          className="relative rounded-3xl p-6 bg-white overflow-hidden hover:shadow-lg transition-all duration-300"
          style={{
            border: '1px solid #5a9dc933',
            background: 'linear-gradient(to bottom right, #f8fbfd, white)'
          }}
        >
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="inline-flex items-center justify-center w-10 h-10 rounded-2xl"
                style={{ background: 'linear-gradient(to bottom right, #5a9dc91A, #5a9dc90D)' }}
              >
                <ShieldCheckIcon className="w-5 h-5" style={{ color: '#2c5f7f' }} strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Sécurité</h3>
            </div>
            <p className="text-sm text-muted-foreground ml-12">
              Gestion de votre mot de passe et paramètres de sécurité
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-muted-foreground">
              Pour modifier votre mot de passe, contactez le développeur.
            </p>
            <p className="text-sm text-muted-foreground">
              Une fonctionnalité de réinitialisation de mot de passe sera disponible prochainement.
            </p>
          </div>
        </div>

        {/* Section Zone de danger - Style organique */}
        <div
          className="relative rounded-3xl p-6 bg-white overflow-hidden hover:shadow-lg transition-all duration-300"
          style={{
            border: '1px solid #f8717150',
            background: 'linear-gradient(to bottom right, #fef2f2, white)'
          }}
        >
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="inline-flex items-center justify-center w-10 h-10 rounded-2xl"
                style={{ background: 'linear-gradient(to bottom right, #f871711A, #f871710D)' }}
              >
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold text-red-900">Zone de danger</h3>
            </div>
            <p className="text-sm text-red-700/70 ml-12">
              Actions irréversibles sur votre compte
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-red-50/50 border border-red-100">
              <h4 className="font-semibold text-red-900 mb-2">Supprimer mon compte</h4>
              <p className="text-sm text-red-700/80 mb-4">
                Cette action est irréversible. Toutes vos données seront définitivement supprimées :
              </p>
              <ul className="text-sm text-red-700/80 space-y-1 mb-4 ml-4 list-disc">
                <li>Votre profil et informations personnelles</li>
                <li>Votre entreprise et toutes ses crèches</li>
                <li>Tous les employés, salles, sessions et données HACCP</li>
                <li>Tous les messages et notifications</li>
              </ul>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                className="gap-2 bg-red-600 hover:bg-red-700"
              >
                <TrashIcon className="w-4 h-4" />
                Supprimer mon compte
              </Button>
            </div>
          </div>
        </div>

        {/* Dialog de confirmation de suppression */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-900">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                Confirmer la suppression
              </DialogTitle>
              <DialogDescription className="text-left">
                Cette action est définitive et irréversible. Toutes vos données seront supprimées.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-3 rounded-xl bg-red-50 border border-red-100">
                <p className="text-sm text-red-800">
                  Pour confirmer, tapez <strong>{confirmationText}</strong> ci-dessous :
                </p>
              </div>
              <Input
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder={confirmationText}
                className="border-red-200 focus:border-red-300 focus:ring-red-200"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteDialog(false)
                  setDeleteConfirmation('')
                }}
                disabled={isDeleting}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={!isDeleteConfirmed || isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? 'Suppression...' : 'Supprimer définitivement'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
