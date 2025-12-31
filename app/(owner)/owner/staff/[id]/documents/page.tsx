'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { usersService, type ProfileWithRooms } from '@/lib/services/users.service'
import {
  StaffHRService,
  type StaffDocument,
  type CreateDocumentInput,
  type UpdateDocumentInput
} from '@/lib/services/staff-hr.service'
import {
  DocumentTextIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ShieldCheckIcon,
  ArrowLeftIcon,
  DocumentArrowUpIcon,
  EyeSlashIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { FormDialog } from '@/components/shared/FormDialog'
import { DeleteConfirmationDialog } from '@/components/shared/DeleteConfirmationDialog'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'

const staffHRService = new StaffHRService()

const DOCUMENT_TYPES = [
  { value: 'id_card', label: 'Pièce d\'identité' },
  { value: 'resume', label: 'CV' },
  { value: 'work_permit', label: 'Permis de travail' },
  { value: 'social_security', label: 'Carte vitale / Sécurité sociale' },
  { value: 'rib', label: 'RIB' },
  { value: 'criminal_record', label: 'Casier judiciaire (bulletin n°3)' },
  { value: 'medical_certificate', label: 'Certificat médical' },
  { value: 'contract', label: 'Contrat de travail' },
  { value: 'amendment', label: 'Avenant' },
  { value: 'diploma', label: 'Diplôme / Certification' },
  { value: 'insurance', label: 'Attestation d\'assurance RC' },
  { value: 'performance_review', label: 'Entretien annuel' },
  { value: 'warning_letter', label: 'Avertissement' },
  { value: 'termination_letter', label: 'Lettre de licenciement' }
]

export default function StaffDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const [employee, setEmployee] = useState<ProfileWithRooms | null>(null)
  const [documents, setDocuments] = useState<StaffDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingDocument, setEditingDocument] = useState<StaffDocument | null>(null)
  const [documentToDelete, setDocumentToDelete] = useState<StaffDocument | null>(null)
  const [documentToReject, setDocumentToReject] = useState<StaffDocument | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectionDialog, setShowRejectionDialog] = useState(false)
  const [formData, setFormData] = useState<Partial<CreateDocumentInput>>({
    document_type: 'id_card',
    file_url: '',
    file_name: '',
    issue_date: '',
    expiry_date: '',
    is_confidential: true
  })

  useEffect(() => {
    if (session?.enterprise?.id) {
      loadData()
    } else if (!authLoading) {
      setLoading(false)
    }
  }, [resolvedParams.id, session?.enterprise?.id, authLoading])

  async function loadData() {
    try {
      setLoading(true)

      // Load employee and documents
      const employeeData = await usersService.getEmployee(resolvedParams.id)
      const documentsData = await staffHRService.getDocuments(resolvedParams.id)

      setEmployee(employeeData)
      setDocuments(documentsData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    setEditingDocument(null)
    setFormData({
      document_type: 'id_card',
      file_url: '',
      file_name: '',
      issue_date: '',
      expiry_date: '',
      is_confidential: true
    })
    setShowModal(true)
  }

  function openEditModal(document: StaffDocument) {
    setEditingDocument(document)
    setFormData({
      document_type: document.document_type,
      file_url: document.file_url,
      file_name: document.file_name,
      issue_date: document.issue_date || '',
      expiry_date: document.expiry_date || '',
      is_confidential: document.is_confidential
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!session?.user?.id) return

    try {
      setIsSubmitting(true)

      if (editingDocument) {
        // Update existing document (metadata only)
        await staffHRService.updateDocument(
          editingDocument.id,
          {
            document_type: formData.document_type,
            issue_date: formData.issue_date || null,
            expiry_date: formData.expiry_date || null,
            is_confidential: formData.is_confidential
          } as UpdateDocumentInput
        )
      } else {
        // Create new document
        // TODO: Implement actual file upload to Supabase Storage
        // For now, use a placeholder URL
        await staffHRService.uploadDocument({
          employee_id: resolvedParams.id,
          document_type: formData.document_type!,
          file_url: formData.file_url || 'https://placeholder.com/document',
          file_name: formData.file_name || 'Document.pdf',
          file_size: 0,
          mime_type: 'application/pdf',
          issue_date: formData.issue_date || undefined,
          expiry_date: formData.expiry_date || undefined,
          is_confidential: formData.is_confidential !== false,
          uploaded_by_id: session.user.id
        })
      }

      await loadData()
      setShowModal(false)
    } catch (error) {
      console.error('Error saving document:', error)
      alert('Erreur lors de l\'enregistrement du document')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!documentToDelete) return

    try {
      setIsDeleting(true)
      await staffHRService.deleteDocument(documentToDelete.id)
      await loadData()
      setDocumentToDelete(null)
    } catch (error) {
      console.error('Error deleting document:', error)
      alert('Erreur lors de la suppression')
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleApprove(document: StaffDocument) {
    if (!session?.user?.id) return

    try {
      await staffHRService.approveDocument(document.id, session.user.id)
      await loadData()
    } catch (error) {
      console.error('Error approving document:', error)
      alert('Erreur lors de l\'approbation')
    }
  }

  function openRejectDialog(document: StaffDocument) {
    setDocumentToReject(document)
    setRejectionReason('')
    setShowRejectionDialog(true)
  }

  async function handleReject() {
    if (!documentToReject || !session?.user?.id) return

    try {
      setIsSubmitting(true)
      await staffHRService.rejectDocument(
        documentToReject.id,
        session.user.id,
        rejectionReason || 'Document non conforme'
      )
      await loadData()
      setShowRejectionDialog(false)
      setDocumentToReject(null)
      setRejectionReason('')
    } catch (error) {
      console.error('Error rejecting document:', error)
      alert('Erreur lors du rejet')
    } finally {
      setIsSubmitting(false)
    }
  }

  function getDaysUntilExpiry(expiryDate: string): number {
    return Math.ceil(
      (new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    )
  }

  function getStatusBadgeVariant(status: string): 'default' | 'warning' | 'destructive' | 'success' {
    switch (status) {
      case 'approved':
        return 'success'
      case 'rejected':
        return 'destructive'
      case 'expired':
        return 'destructive'
      case 'pending':
        return 'warning'
      default:
        return 'default'
    }
  }

  function getStatusLabel(status: string): string {
    switch (status) {
      case 'approved':
        return 'Approuvé'
      case 'rejected':
        return 'Rejeté'
      case 'expired':
        return 'Expiré'
      case 'pending':
        return 'En attente'
      default:
        return status
    }
  }

  function getInitials(employee: ProfileWithRooms | null): string {
    if (!employee) return ''
    const first = employee.first_name?.[0] || ''
    const last = employee.last_name?.[0] || ''
    return (first + last).toUpperCase()
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center max-w-md">
          <p className="text-lg font-medium mb-2">Employé introuvable</p>
          <Button onClick={() => router.push('/owner/staff')}>
            Retour au personnel
          </Button>
        </Card>
      </div>
    )
  }

  const pendingDocuments = documents.filter((d) => d.status === 'pending')
  const approvedDocuments = documents.filter((d) => d.status === 'approved')
  const rejectedDocuments = documents.filter((d) => d.status === 'rejected')
  const expiredDocuments = documents.filter((d) => d.status === 'expired')
  const expiringDocuments = approvedDocuments.filter((d) => {
    if (!d.expiry_date) return false
    const days = getDaysUntilExpiry(d.expiry_date)
    return days > 0 && days <= 90
  })

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Breadcrumb */}
      <PageBreadcrumb
        items={[
          { label: 'Accueil', href: '/owner/dashboard' },
          { label: 'Personnel', href: '/owner/staff' },
          { label: `${employee.first_name} ${employee.last_name}`, href: `/owner/staff/${employee.id}/qualifications` }
        ]}
      />

      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push('/owner/staff')}
        className="mb-4"
      >
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Retour au personnel
      </Button>

      {/* Employee Header */}
      <Card className="p-6 mb-6 bg-gradient-to-br from-blue-50 to-white border-blue-200">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 bg-blue-100">
            <AvatarImage src={employee.avatar_url || undefined} />
            <AvatarFallback className="text-2xl text-gray-700">
              {getInitials(employee)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {employee.first_name} {employee.last_name}
            </h1>
            <p className="text-gray-600 mb-2">{employee.email}</p>
            <div className="flex gap-2">
              {employee.is_active ? (
                <Badge variant="success">
                  <CheckCircleIcon className="h-3 w-3 mr-1" />
                  Actif
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <XCircleIcon className="h-3 w-3 mr-1" />
                  Inactif
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <p className="text-sm text-gray-600 mb-1">En attente</p>
          <p className="text-2xl font-bold text-yellow-600">{pendingDocuments.length}</p>
        </Card>
        <Card className="p-4 bg-green-50 border-green-200">
          <p className="text-sm text-gray-600 mb-1">Approuvés</p>
          <p className="text-2xl font-bold text-green-600">{approvedDocuments.length}</p>
        </Card>
        <Card className="p-4 bg-orange-50 border-orange-200">
          <p className="text-sm text-gray-600 mb-1">À expirer (90j)</p>
          <p className="text-2xl font-bold text-orange-600">{expiringDocuments.length}</p>
        </Card>
        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-sm text-gray-600 mb-1">Expirés</p>
          <p className="text-2xl font-bold text-red-600">{expiredDocuments.length}</p>
        </Card>
      </div>

      {/* Alerts */}
      {pendingDocuments.length > 0 && (
        <Card className="p-4 mb-6 bg-yellow-50 border-yellow-200">
          <div className="flex items-center gap-3">
            <ClockIcon className="h-6 w-6 text-yellow-600" />
            <div>
              <h3 className="font-semibold text-yellow-900">
                {pendingDocuments.length} document(s) en attente de validation
              </h3>
              <p className="text-sm text-yellow-700">
                Ces documents doivent être approuvés ou rejetés
              </p>
            </div>
          </div>
        </Card>
      )}

      {expiredDocuments.length > 0 && (
        <Card className="p-4 mb-6 bg-red-50 border-red-200">
          <div className="flex items-center gap-3">
            <XCircleIcon className="h-6 w-6 text-red-600" />
            <div>
              <h3 className="font-semibold text-red-900">
                {expiredDocuments.length} document(s) expiré(s)
              </h3>
              <p className="text-sm text-red-700">
                Ces documents doivent être renouvelés
              </p>
            </div>
          </div>
        </Card>
      )}

      {expiringDocuments.length > 0 && (
        <Card className="p-4 mb-6 bg-orange-50 border-orange-200">
          <div className="flex items-center gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-orange-600" />
            <div>
              <h3 className="font-semibold text-orange-900">
                {expiringDocuments.length} document(s) à renouveler
              </h3>
              <p className="text-sm text-orange-700">
                Ces documents expirent dans les 90 prochains jours
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Header with Add Button */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 rounded-xl">
            <DocumentTextIcon className="h-8 w-8 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Documents RH</h2>
            <p className="text-gray-600">Contrats, pièces d'identité, certificats</p>
          </div>
        </div>
        <Button onClick={openCreateModal}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Ajouter
        </Button>
      </div>

      {/* Documents List */}
      {documents.length === 0 ? (
        <Card className="p-12 text-center">
          <DocumentTextIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Aucun document</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Commencez par ajouter les documents administratifs de cet employé
          </p>
          <Button onClick={openCreateModal}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Ajouter un document
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {documents.map((document) => {
            const statusVariant = getStatusBadgeVariant(document.status)
            const daysUntilExpiry = document.expiry_date
              ? getDaysUntilExpiry(document.expiry_date)
              : null

            return (
              <Card
                key={document.id}
                className={`p-6 ${
                  document.status === 'rejected'
                    ? 'bg-red-50 border-red-200'
                    : document.status === 'expired'
                    ? 'bg-red-50 border-red-200'
                    : document.status === 'pending'
                    ? 'bg-yellow-50 border-yellow-200'
                    : daysUntilExpiry !== null && daysUntilExpiry <= 30
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {DOCUMENT_TYPES.find((t) => t.value === document.document_type)?.label || document.document_type}
                      </h3>
                      <Badge variant={statusVariant}>
                        {getStatusLabel(document.status)}
                      </Badge>
                      {document.is_confidential && (
                        <Badge variant="default">
                          <EyeSlashIcon className="h-3 w-3 mr-1" />
                          Confidentiel
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                      <div>
                        <p className="text-gray-600">Nom du fichier</p>
                        <p className="font-medium">{document.file_name}</p>
                      </div>
                      {document.issue_date && (
                        <div>
                          <p className="text-gray-600">Date d'émission</p>
                          <p className="font-medium">
                            {new Date(document.issue_date).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      )}
                      {document.expiry_date && (
                        <div>
                          <p className="text-gray-600">Date d'expiration</p>
                          <p className="font-medium">
                            {new Date(document.expiry_date).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-gray-600">Ajouté le</p>
                        <p className="font-medium">
                          {new Date(document.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>

                    {document.expiry_date && daysUntilExpiry !== null && (
                      <div className="flex items-center gap-2 mb-3">
                        <ClockIcon className="h-4 w-4 text-gray-500" />
                        {daysUntilExpiry < 0 ? (
                          <Badge variant="destructive">
                            Expiré depuis {Math.abs(daysUntilExpiry)}j
                          </Badge>
                        ) : daysUntilExpiry <= 30 ? (
                          <Badge variant="destructive">
                            {daysUntilExpiry}j restants
                          </Badge>
                        ) : daysUntilExpiry <= 90 ? (
                          <Badge variant="warning">
                            {daysUntilExpiry}j restants
                          </Badge>
                        ) : (
                          <span className="text-sm text-gray-600">
                            {daysUntilExpiry} jours restants
                          </span>
                        )}
                      </div>
                    )}

                    {document.status === 'rejected' && document.rejection_reason && (
                      <div className="flex items-start gap-2 p-3 bg-red-100 border border-red-200 rounded-md">
                        <XCircleIcon className="h-5 w-5 text-red-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-red-900">Raison du rejet:</p>
                          <p className="text-sm text-red-700">{document.rejection_reason}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {document.status === 'pending' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApprove(document)}
                          className="border-green-300 text-green-700 hover:bg-green-50"
                        >
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          Approuver
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openRejectDialog(document)}
                          className="border-red-300 text-red-700 hover:bg-red-50"
                        >
                          <XCircleIcon className="h-4 w-4 mr-1" />
                          Rejeter
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(document)}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDocumentToDelete(document)}
                    >
                      <TrashIcon className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <FormDialog
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingDocument ? 'Modifier le document' : 'Ajouter un document'}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Type de document *</label>
            <select
              className="w-full border rounded-md px-3 py-2"
              value={formData.document_type || ''}
              onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
              required
            >
              {DOCUMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {!editingDocument && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Nom du fichier *</label>
                <Input
                  value={formData.file_name || ''}
                  onChange={(e) => setFormData({ ...formData, file_name: e.target.value })}
                  placeholder="ex: Contrat_Marie_Dupont.pdf"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Note: L'upload de fichiers sera implémenté prochainement
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">URL du fichier (temporaire) *</label>
                <Input
                  value={formData.file_url || ''}
                  onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                  placeholder="https://..."
                  required
                />
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date d'émission</label>
              <Input
                type="date"
                value={formData.issue_date || ''}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Date d'expiration</label>
              <Input
                type="date"
                value={formData.expiry_date || ''}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_confidential"
              checked={formData.is_confidential !== false}
              onChange={(e) => setFormData({ ...formData, is_confidential: e.target.checked })}
              className="h-4 w-4"
            />
            <label htmlFor="is_confidential" className="text-sm">
              Document confidentiel (accessible uniquement à la direction)
            </label>
          </div>
        </div>
      </FormDialog>

      {/* Rejection Dialog */}
      <FormDialog
        isOpen={showRejectionDialog}
        onClose={() => setShowRejectionDialog(false)}
        title="Rejeter le document"
        onSubmit={(e) => {
          e.preventDefault()
          handleReject()
        }}
        isSubmitting={isSubmitting}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Êtes-vous sûr de vouloir rejeter ce document? Veuillez indiquer la raison du rejet.
          </p>
          <div>
            <label className="block text-sm font-medium mb-1">Raison du rejet *</label>
            <textarea
              className="w-full border rounded-md px-3 py-2 min-h-[100px]"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="ex: Document illisible, informations manquantes, document expiré..."
              required
            />
          </div>
        </div>
      </FormDialog>

      {/* Delete Confirmation */}
      <DeleteConfirmationDialog
        isOpen={documentToDelete !== null}
        onClose={() => setDocumentToDelete(null)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
        title="Supprimer le document"
        itemName={documentToDelete?.file_name}
      />
    </div>
  )
}
