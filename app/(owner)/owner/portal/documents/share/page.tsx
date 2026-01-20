'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { parentDocumentsService, type ShareDocumentInput } from '@/lib/services/parent-documents.service'
import { familyService } from '@/lib/services/family.service'
import {
  DocumentTextIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'

export default function ShareDocumentPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery } = useNursery()
  const router = useRouter()

  const [families, setFamilies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [documentType, setDocumentType] = useState<string>('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [shareScope, setShareScope] = useState<string>('all_families')
  const [selectedFamilies, setSelectedFamilies] = useState<string[]>([])
  const [requiresAcknowledgment, setRequiresAcknowledgment] = useState(false)
  const [expiresAt, setExpiresAt] = useState('')

  useEffect(() => {
    if (selectedNursery?.id) {
      loadFamilies()
    } else if (!authLoading && !selectedNursery) {
      setLoading(false)
    }
  }, [selectedNursery?.id, authLoading])

  async function loadFamilies() {
    if (!selectedNursery?.id) return

    try {
      setLoading(true)
      const familiesData = await familyService.getActive(selectedNursery.id)
      setFamilies(familiesData)
    } catch (error) {
      console.error('Error loading families:', error)
    } finally {
      setLoading(false)
    }
  }

  function toggleFamily(familyId: string) {
    if (selectedFamilies.includes(familyId)) {
      setSelectedFamilies(selectedFamilies.filter(id => id !== familyId))
    } else {
      setSelectedFamilies([...selectedFamilies, familyId])
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!selectedNursery?.id || !session?.user?.id) {
      alert('Session invalide')
      return
    }

    if (!documentType || !title || !fileUrl) {
      alert('Veuillez remplir tous les champs requis')
      return
    }

    if (shareScope === 'specific_families' && selectedFamilies.length === 0) {
      alert('Veuillez sélectionner au moins une famille')
      return
    }

    try {
      setSubmitting(true)

      const input: ShareDocumentInput = {
        nursery_id: selectedNursery.id,
        document_type: documentType as any,
        title,
        description: description || undefined,
        file_url: fileUrl,
        share_scope: shareScope as any,
        target_family_ids: shareScope === 'specific_families' ? selectedFamilies : undefined,
        requires_acknowledgment: requiresAcknowledgment,
        uploaded_by_id: session.user.id,
        expires_at: expiresAt || undefined
      }

      await parentDocumentsService.shareDocument(input)

      alert('Document partagé avec succès !')
      router.push('/owner/portal/documents')
    } catch (error) {
      console.error('Error sharing document:', error)
      alert('Erreur lors du partage du document')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!selectedNursery) {
    return (
      <div className="p-6">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <p className="text-yellow-800">Veuillez sélectionner une crèche.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <PageBreadcrumb
          items={[
            { label: 'Accueil', href: '/owner/dashboard' },
            { label: 'Portail Parents', href: '/owner/portal' },
            { label: 'Documents', href: '/owner/portal/documents' },
            { label: 'Partager Document' }
          ]}
        />
        <div className="mt-4 flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Partager un Document</h1>
            <p className="mt-2 text-gray-600">
              Partagez un document avec les familles via le portail parents
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DocumentTextIcon className="h-5 w-5 text-blue-600" />
              Informations du Document
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Document Type */}
            <div className="space-y-2">
              <Label htmlFor="documentType">Type de Document *</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger id="documentType">
                  <SelectValue placeholder="Sélectionnez un type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="menu">Menu</SelectItem>
                  <SelectItem value="calendar">Calendrier</SelectItem>
                  <SelectItem value="regulation">Règlement</SelectItem>
                  <SelectItem value="report">Rapport</SelectItem>
                  <SelectItem value="photo_album">Album Photo</SelectItem>
                  <SelectItem value="announcement">Annonce</SelectItem>
                  <SelectItem value="consent_form">Formulaire de Consentement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Titre *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Menu de la semaine"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description du document..."
                rows={3}
              />
            </div>

            {/* File URL */}
            <div className="space-y-2">
              <Label htmlFor="fileUrl">URL du Fichier *</Label>
              <Input
                id="fileUrl"
                type="url"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                placeholder="https://..."
                required
              />
              <p className="text-xs text-gray-500">
                URL du fichier stocké sur Supabase Storage ou autre service
              </p>
            </div>

            {/* Share Scope */}
            <div className="space-y-2">
              <Label htmlFor="shareScope">Portée du Partage *</Label>
              <Select value={shareScope} onValueChange={setShareScope}>
                <SelectTrigger id="shareScope">
                  <SelectValue placeholder="Sélectionnez une portée" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_families">Toutes les familles</SelectItem>
                  <SelectItem value="specific_families">Familles spécifiques</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Family Selection */}
            {shareScope === 'specific_families' && (
              <div className="space-y-2">
                <Label>Sélectionner les Familles *</Label>
                <Card className="max-h-60 overflow-y-auto">
                  <CardContent className="pt-4 space-y-2">
                    {families.length === 0 ? (
                      <p className="text-sm text-gray-600">Aucune famille disponible</p>
                    ) : (
                      families.map(family => (
                        <div key={family.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`family-${family.id}`}
                            checked={selectedFamilies.includes(family.id)}
                            onCheckedChange={() => toggleFamily(family.id)}
                          />
                          <label
                            htmlFor={`family-${family.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {family.name}
                          </label>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
                <p className="text-xs text-gray-500">
                  {selectedFamilies.length} famille(s) sélectionnée(s)
                </p>
              </div>
            )}

            {/* Requires Acknowledgment */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="requiresAcknowledgment"
                checked={requiresAcknowledgment}
                onCheckedChange={(checked) => setRequiresAcknowledgment(checked as boolean)}
              />
              <label
                htmlFor="requiresAcknowledgment"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Confirmation de lecture requise
              </label>
            </div>

            {/* Expires At */}
            <div className="space-y-2">
              <Label htmlFor="expiresAt">Date d'Expiration (optionnel)</Label>
              <Input
                id="expiresAt"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Le document ne sera plus visible après cette date
              </p>
            </div>

            {/* Submit */}
            <div className="flex gap-4 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {submitting ? 'Partage en cours...' : 'Partager le Document'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
