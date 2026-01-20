'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { parentDocumentsService, type ParentDocumentShare, type DocumentWithStats } from '@/lib/services/parent-documents.service'
import {
  DocumentTextIcon,
  PlusIcon,
  EyeIcon,
  TrashIcon,
  CheckCircleIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'

export default function PortalDocumentsPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery } = useNursery()
  const router = useRouter()

  const [documents, setDocuments] = useState<ParentDocumentShare[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (selectedNursery?.id) {
      loadDocuments()
    } else if (!authLoading && !selectedNursery) {
      setLoading(false)
    }
  }, [selectedNursery?.id, authLoading])

  async function loadDocuments() {
    if (!selectedNursery?.id) return

    try {
      setLoading(true)
      const documentsData = await parentDocumentsService.getDocumentsByNursery(selectedNursery.id)
      setDocuments(documentsData)
    } catch (error) {
      console.error('Error loading documents:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteDocument(documentId: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return

    try {
      await parentDocumentsService.deleteDocument(documentId)
      await loadDocuments()
    } catch (error) {
      console.error('Error deleting document:', error)
      alert('Erreur lors de la suppression')
    }
  }

  async function viewStats(documentId: string) {
    try {
      const stats = await parentDocumentsService.getDocumentStats(documentId)
      alert(`Statistiques:\n- Destinataires: ${stats.total_recipients}\n- Confirmés: ${stats.acknowledged_count}\n- Téléchargements: ${stats.downloaded_count}\n- Taux de confirmation: ${stats.acknowledgment_rate}%`)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  function getDocumentTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      menu: 'Menu',
      calendar: 'Calendrier',
      regulation: 'Règlement',
      invoice: 'Facture',
      certificate: 'Attestation',
      report: 'Rapport',
      photo_album: 'Album Photo',
      announcement: 'Annonce',
      consent_form: 'Formulaire de Consentement'
    }
    return labels[type] || type
  }

  function getDocumentTypeColor(type: string): string {
    const colors: Record<string, string> = {
      menu: 'bg-orange-100 text-orange-800 border-orange-300',
      calendar: 'bg-blue-100 text-blue-800 border-blue-300',
      regulation: 'bg-purple-100 text-purple-800 border-purple-300',
      invoice: 'bg-green-100 text-green-800 border-green-300',
      certificate: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      report: 'bg-teal-100 text-teal-800 border-teal-300',
      photo_album: 'bg-pink-100 text-pink-800 border-pink-300',
      announcement: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      consent_form: 'bg-red-100 text-red-800 border-red-300'
    }
    return colors[type] || 'bg-gray-100 text-gray-800 border-gray-300'
  }

  function getScopeLabel(scope: string): string {
    const labels: Record<string, string> = {
      all_families: 'Toutes les familles',
      specific_families: 'Familles spécifiques',
      specific_child: 'Enfant spécifique'
    }
    return labels[scope] || scope
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Chargement des documents...</p>
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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <PageBreadcrumb
          items={[
            { label: 'Accueil', href: '/owner/dashboard' },
            { label: 'Portail Parents', href: '/owner/portal' },
            { label: 'Documents' }
          ]}
        />
        <div className="mt-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Documents Partagés</h1>
            <p className="mt-2 text-gray-600">
              Partagez des documents avec les familles via le portail parents
            </p>
          </div>
          <Button
            onClick={() => router.push('/owner/portal/documents/share')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Nouveau Document
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Documents</p>
                <p className="text-2xl font-bold text-gray-900">{documents.length}</p>
              </div>
              <DocumentTextIcon className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Actifs</p>
                <p className="text-2xl font-bold text-green-900">
                  {documents.filter(d => d.is_active).length}
                </p>
              </div>
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avec Confirmation</p>
                <p className="text-2xl font-bold text-purple-900">
                  {documents.filter(d => d.requires_acknowledgment).length}
                </p>
              </div>
              <EyeIcon className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documents List */}
      {documents.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">Aucun document partagé</p>
            <Button
              onClick={() => router.push('/owner/portal/documents/share')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Partager un document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map(document => (
            <Card key={document.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Type Badge */}
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={getDocumentTypeColor(document.document_type)}>
                      {getDocumentTypeLabel(document.document_type)}
                    </Badge>
                    {document.is_active ? (
                      <Badge className="bg-green-600 text-white">Actif</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-100 text-gray-800">Inactif</Badge>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-lg text-gray-900 line-clamp-2">
                    {document.title}
                  </h3>

                  {/* Description */}
                  {document.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {document.description}
                    </p>
                  )}

                  {/* Scope */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>Portée:</span>
                    <Badge variant="outline">
                      {getScopeLabel(document.share_scope)}
                    </Badge>
                  </div>

                  {/* Acknowledgment */}
                  {document.requires_acknowledgment && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircleIcon className="h-4 w-4 text-purple-600" />
                      <span className="text-purple-900">Confirmation requise</span>
                    </div>
                  )}

                  {/* Date */}
                  <p className="text-xs text-gray-500">
                    Partagé le {formatDate(document.uploaded_at)}
                  </p>

                  {document.expires_at && (
                    <p className="text-xs text-red-600">
                      Expire le {formatDate(document.expires_at)}
                    </p>
                  )}

                  {/* Uploaded by */}
                  {(document as any).uploaded_by && (
                    <p className="text-xs text-gray-500">
                      Par {(document as any).uploaded_by.first_name} {(document as any).uploaded_by.last_name}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => viewStats(document.id)}
                      className="flex-1"
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      Stats
                    </Button>

                    {document.file_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(document.file_url, '_blank')}
                        className="flex-1"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                        Voir
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteDocument(document.id)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
