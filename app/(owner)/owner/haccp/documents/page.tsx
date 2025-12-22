'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { haccpService } from '@/lib/services/haccp.service'
import { storageService } from '@/lib/services/storage.service'
import { DeleteConfirmationDialog } from '@/components/shared/DeleteConfirmationDialog'
import { FormDialog } from '@/components/shared/FormDialog'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'

interface HaccpDocument {
  id: string
  enterprise_id: string
  title: string
  category: string
  file_key: string
  uploaded_by_id: string
  uploaded_at: string
  created_at: string
  updated_at: string
}

type DocumentCategory = 'Temperatures' | 'Cleaning' | 'Training' | 'Compliance' | 'Other'

export default function HaccpDocumentsPage() {
  const [documents, setDocuments] = useState<HaccpDocument[]>([])
  const [filteredDocuments, setFilteredDocuments] = useState<HaccpDocument[]>([])
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<HaccpDocument | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    category: 'Compliance' as DocumentCategory,
    file: null as File | null
  })

  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery } = useNursery()
  const router = useRouter()

  useEffect(() => {
    if (selectedNursery?.id) {
      loadDocuments()
    } else if (!authLoading && !selectedNursery) {
      setIsLoading(false)
    }
  }, [selectedNursery?.id, authLoading])

  useEffect(() => {
    applyFilters()
  }, [documents, filterCategory])

  async function loadDocuments() {
    try {
      if (!selectedNursery?.id) return

      const data = await haccpService.getDocuments(selectedNursery.id)
      setDocuments(data as unknown as HaccpDocument[])
    } catch (err: any) {
      console.error('Error loading documents:', err)
      setError('Erreur lors du chargement')
    } finally {
      setIsLoading(false)
    }
  }

  function applyFilters() {
    let filtered = [...documents]

    if (filterCategory !== 'all') {
      filtered = filtered.filter(d => d.category === filterCategory)
    }

    setFilteredDocuments(filtered)
  }

  function handleAdd() {
    setFormData({
      title: '',
      category: 'Compliance',
      file: null
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsUploading(true)

    try {
      if (!selectedNursery?.id || !session?.user?.id) return

      let fileUrl = null

      // Upload file if provided
      if (formData.file) {
        const result = await storageService.uploadFile(formData.file, {
          bucket: 'documents',
          path: `haccp/${selectedNursery.id}`,
          maxSizeMB: 10
        })

        if (!result.success) {
          throw new Error(result.error || 'Upload failed')
        }

        fileUrl = result.url
      }

      // Create document
      await haccpService.createDocument(selectedNursery.id, {
        title: formData.title,
        category: formData.category,
        file_key: formData.file?.name || '',
        uploaded_by_id: session.user.id
      })

      await loadDocuments()
      setShowModal(false)
    } catch (err: any) {
      console.error('Error saving document:', err)
      setError('Erreur lors de l\'enregistrement')
    } finally {
      setIsUploading(false)
    }
  }

  function openDeleteDialog(doc: HaccpDocument) {
    setDocumentToDelete(doc)
  }

  async function handleConfirmDelete() {
    if (!documentToDelete || !selectedNursery?.id) return

    try {
      setIsDeleting(true)
      // Delete file from storage if exists
      if (documentToDelete.file_key) {
        const path = `haccp/${selectedNursery.id}/${documentToDelete.file_key}`
        await storageService.deleteFile('documents', path)
      }

      // Delete from database
      await haccpService.deleteDocument(documentToDelete.id, selectedNursery.id)
      await loadDocuments()
    } catch (err: any) {
      console.error('Error deleting document:', err)
      setError('Erreur lors de la suppression')
    } finally {
      setIsDeleting(false)
      setDocumentToDelete(null)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-200 border-t-primary-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  const categories = {
    Temperatures: { label: 'Températures', icon: '🌡️', color: 'danger' },
    Cleaning: { label: 'Nettoyage', icon: '🧹', color: 'primary' },
    Training: { label: 'Formation', icon: '📚', color: 'info' },
    Compliance: { label: 'Conformité', icon: '✅', color: 'success' },
    Other: { label: 'Autre', icon: '📄', color: 'neutral' }
  }

  const stats = {
    total: documents.length,
    byCategory: Object.keys(categories).map(cat => ({
      category: cat,
      count: documents.filter(d => d.category === cat).length
    }))
  }

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <PageBreadcrumb
        items={[
          { label: 'Dashboard', href: '/owner/dashboard' },
          { label: 'HACCP', href: '/owner/haccp' },
          { label: 'Documents' }
        ]}
      />

      {/* Header with Gradient - Module Analytics (Indigo) */}
      <div className="relative mb-8 p-8 rounded-3xl bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 border border-indigo-200/50 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/patterns/dots.svg')] opacity-5"></div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <span className="text-3xl">📄</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-1 bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                Documents HACCP
              </h1>
              <p className="text-indigo-700/70">Gestion des documents de conformité</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleAdd}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-medium shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:scale-105 transition-all duration-200"
            >
              + Ajouter un document
            </button>
            <button
              onClick={() => router.push('/owner/haccp')}
              className="px-6 py-3 rounded-2xl bg-white/80 hover:bg-white border border-indigo-200 text-indigo-700 font-medium hover:scale-105 transition-all duration-200"
            >
              ← Retour
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="card p-4 mb-6 bg-danger-50 border border-danger-200">
          <p className="text-danger-700">{error}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
        <div className="card p-4">
          <div className="text-center">
            <p className="text-3xl mb-1">📁</p>
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </div>
        </div>
        {stats.byCategory.map(({ category, count }) => {
          const info = categories[category as DocumentCategory]
          return (
            <div key={category} className="card p-4">
              <div className="text-center">
                <p className="text-3xl mb-1">{info.icon}</p>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-sm text-muted-foreground">{info.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Filter */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">
            Catégorie :
          </label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary-500 bg-background"
          >
            <option value="all">Toutes les catégories</option>
            {Object.entries(categories).map(([key, info]) => (
              <option key={key} value={key}>
                {info.icon} {info.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Documents List */}
      {filteredDocuments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.map((doc) => {
            const categoryInfo = categories[doc.category as DocumentCategory]

            return (
              <div key={doc.id} className="group relative p-6 rounded-3xl bg-gradient-to-br from-indigo-50/80 to-blue-50/80 border border-indigo-200/50 hover:shadow-lg hover:shadow-indigo-500/20 transition-all duration-300 hover:scale-[1.02]">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center text-xl shadow-md shadow-indigo-500/30 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                      {categoryInfo.icon}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold bg-${categoryInfo.color}-100 text-${categoryInfo.color}-700`}>
                      {categoryInfo.label}
                    </span>
                  </div>
                  <button
                    onClick={() => openDeleteDialog(doc)}
                    className="text-danger-500 hover:text-danger-700"
                    title="Supprimer"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                <h3 className="text-lg font-bold mb-2">{doc.title}</h3>

                <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                  <span>Ajouté le {new Date(doc.created_at).toLocaleDateString('fr-FR')}</span>
                </div>

                {doc.file_key && (
                  <div className="btn btn-primary w-full text-sm">
                    <svg className="w-4 h-4 mr-2 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {doc.file_key}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <svg className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-muted-foreground mb-4">Aucun document enregistré</p>
          <button onClick={handleAdd} className="btn btn-primary">
            + Ajouter le premier document
          </button>
        </div>
      )}

      {/* Form Dialog */}
      <FormDialog
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
        title="Nouveau document"
        submitLabel="Créer"
        isSubmitting={isUploading}
        maxWidth="lg"
      >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Titre <span className="text-danger-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary-500 bg-background"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Catégorie <span className="text-danger-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as DocumentCategory })}
                    className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary-500 bg-background"
                  >
                    {Object.entries(categories).map(([key, info]) => (
                      <option key={key} value={key}>
                        {info.icon} {info.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Fichier (optionnel)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,image/*"
                    onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                    className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary-500 bg-background"
                  />
                  <p className="text-xs text-muted-foreground mt-1">PDF, Word, ou images (max 10MB)</p>
                </div>
              </div>
      </FormDialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={!!documentToDelete}
        onClose={() => setDocumentToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Confirmer la suppression"
        description="Êtes-vous sûr de vouloir supprimer le document"
        itemName={documentToDelete ? documentToDelete.title : ''}
        isDeleting={isDeleting}
      />
    </div>
  )
}
