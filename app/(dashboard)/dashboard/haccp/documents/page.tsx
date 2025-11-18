'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import { haccpService } from '@/lib/services/haccp.service'
import { storageService } from '@/lib/services/storage.service'

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

  const [formData, setFormData] = useState({
    title: '',
    category: 'Compliance' as DocumentCategory,
    file: null as File | null
  })

  const { session } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!session || !['Admin', 'Developer'].includes(session.role)) {
      router.push('/login')
      return
    }

    loadDocuments()
  }, [session])

  useEffect(() => {
    applyFilters()
  }, [documents, filterCategory])

  async function loadDocuments() {
    try {
      if (!session?.enterprise?.id) return

      const data = await haccpService.getDocuments(session.enterprise.id)
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
      if (!session?.enterprise?.id) return

      let fileUrl = null

      // Upload file if provided
      if (formData.file) {
        const result = await storageService.uploadFile(formData.file, {
          bucket: 'documents',
          path: `haccp/${session.enterprise.id}`,
          maxSizeMB: 10
        })

        if (!result.success) {
          throw new Error(result.error || 'Upload failed')
        }

        fileUrl = result.url
      }

      // Create document
      await haccpService.createDocument(session.enterprise.id, {
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

  async function handleDelete(doc: HaccpDocument) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return

    try {
      // Delete file from storage if exists
      if (doc.file_key) {
        const path = `haccp/${session?.enterprise?.id}/${doc.file_key}`
        await storageService.deleteFile('documents', path)
      }

      // Delete from database
      if (session?.enterprise?.id) {
        await haccpService.deleteDocument(doc.id, session.enterprise.id)
      }
      await loadDocuments()
    } catch (err: any) {
      console.error('Error deleting document:', err)
      setError('Erreur lors de la suppression')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-200 border-t-primary-500 mx-auto mb-4"></div>
          <p className="text-neutral-600">Chargement...</p>
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
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Documents HACCP</h1>
          <p className="text-neutral-600">Gestion des documents de conformité</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleAdd}
            className="btn btn-primary"
          >
            + Ajouter un document
          </button>
          <button
            onClick={() => router.push('/dashboard/haccp')}
            className="btn btn-secondary"
          >
            ← Retour
          </button>
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
            <p className="text-2xl font-bold text-neutral-900">{stats.total}</p>
            <p className="text-sm text-neutral-600">Total</p>
          </div>
        </div>
        {stats.byCategory.map(({ category, count }) => {
          const info = categories[category as DocumentCategory]
          return (
            <div key={category} className="card p-4">
              <div className="text-center">
                <p className="text-3xl mb-1">{info.icon}</p>
                <p className="text-2xl font-bold text-neutral-900">{count}</p>
                <p className="text-sm text-neutral-600">{info.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Filter */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-neutral-700">
            Catégorie :
          </label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
              <div key={doc.id} className="card p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-${categoryInfo.color}-100 flex items-center justify-center text-xl`}>
                      {categoryInfo.icon}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold bg-${categoryInfo.color}-100 text-${categoryInfo.color}-700`}>
                      {categoryInfo.label}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(doc)}
                    className="text-danger-500 hover:text-danger-700"
                    title="Supprimer"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                <h3 className="text-lg font-bold text-neutral-900 mb-2">{doc.title}</h3>

                <div className="flex items-center justify-between text-xs text-neutral-500 mb-4">
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
          <svg className="w-16 h-16 text-neutral-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-neutral-500 mb-4">Aucun document enregistré</p>
          <button onClick={handleAdd} className="btn btn-primary">
            + Ajouter le premier document
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-neutral-200">
              <h2 className="text-2xl font-bold text-neutral-900">Nouveau document</h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Titre <span className="text-danger-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Catégorie <span className="text-danger-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as DocumentCategory })}
                    className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {Object.entries(categories).map(([key, info]) => (
                      <option key={key} value={key}>
                        {info.icon} {info.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Fichier (optionnel)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,image/*"
                    onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                    className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-neutral-500 mt-1">PDF, Word, ou images (max 10MB)</p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={isUploading}
                  className="btn btn-primary flex-1 disabled:opacity-50"
                >
                  {isUploading ? 'Upload en cours...' : 'Créer'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={isUploading}
                  className="btn btn-secondary flex-1"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
