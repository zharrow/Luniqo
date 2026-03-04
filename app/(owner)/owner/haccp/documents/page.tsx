'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { haccpService, type Temperature, type Meal, type NonCompliance, type Equipment, type HaccpDocument, type DocumentCategory } from '@/lib/services/haccp.service'
import { sessionsService, type SessionWithStats } from '@/lib/services/sessions.service'
import { pdfExportService } from '@/lib/services/pdf-export.service'
import { storageService } from '@/lib/services/storage.service'
import { formatDateLocal, getTodayLocal } from '@/lib/utils/date'
import { DeleteConfirmationDialog } from '@/components/shared/DeleteConfirmationDialog'
import { FormDialog } from '@/components/shared/FormDialog'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'
import { DatePicker } from '@/components/ui/date-picker'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DocumentTextIcon,
  ArrowDownTrayIcon,
  CalendarDaysIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  TrashIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'

// ============================================================================
// TYPES
// ============================================================================

interface RegisterData {
  temperatures: Temperature[]
  sessions: SessionWithStats[]
  meals: Meal[]
  nonCompliances: NonCompliance[]
  equipment: Equipment[]
}

type RegisterType = 'temperatures' | 'cleaning' | 'meals' | 'nonCompliances' | 'equipment'

const REGISTER_CONFIG = {
  temperatures: {
    label: 'Relevé de températures',
    icon: '🌡️',
    gradient: 'from-emerald-50/80 to-green-50/80',
    border: 'border-emerald-200/50',
    shadow: 'hover:shadow-emerald-500/20',
    badge: 'bg-emerald-100 text-emerald-700',
    headerBg: 'bg-emerald-50',
  },
  cleaning: {
    label: 'Nettoyage quotidien',
    icon: '🧹',
    gradient: 'from-blue-50/80 to-sky-50/80',
    border: 'border-blue-200/50',
    shadow: 'hover:shadow-blue-500/20',
    badge: 'bg-blue-100 text-blue-700',
    headerBg: 'bg-blue-50',
  },
  meals: {
    label: 'Traçabilité des repas',
    icon: '🍽️',
    gradient: 'from-orange-50/80 to-amber-50/80',
    border: 'border-orange-200/50',
    shadow: 'hover:shadow-orange-500/20',
    badge: 'bg-orange-100 text-orange-700',
    headerBg: 'bg-orange-50',
  },
  nonCompliances: {
    label: 'Non-conformités',
    icon: '⚠️',
    gradient: 'from-rose-50/80 to-pink-50/80',
    border: 'border-rose-200/50',
    shadow: 'hover:shadow-rose-500/20',
    badge: 'bg-rose-100 text-rose-700',
    headerBg: 'bg-rose-50',
  },
  equipment: {
    label: 'Équipements & Maintenance',
    icon: '🔧',
    gradient: 'from-violet-50/80 to-purple-50/80',
    border: 'border-violet-200/50',
    shadow: 'hover:shadow-violet-500/20',
    badge: 'bg-violet-100 text-violet-700',
    headerBg: 'bg-violet-50',
  },
} as const

// ============================================================================
// HELPERS
// ============================================================================

function getMonthRange(): { startDate: string; endDate: string } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    startDate: formatDateLocal(start),
    endDate: formatDateLocal(end),
  }
}

function getMealTypeLabel(type: string): string {
  switch (type) {
    case 'Breakfast': return 'Petit déj.'
    case 'Lunch': return 'Déjeuner'
    case 'Snack': return 'Goûter'
    default: return type
  }
}

function getCheckpointLabel(cp: string): string {
  switch (cp) {
    case 'Reception': return 'Réception'
    case 'Holding': return 'Maintien chaud'
    case 'Service': return 'Service'
    case 'Storage': return 'Stockage'
    default: return cp
  }
}

function getComplianceTypeLabel(type: string): string {
  switch (type) {
    case 'Product': return 'Produit'
    case 'Temperature': return 'Température'
    case 'Hygiene': return 'Hygiène'
    case 'Other': return 'Autre'
    default: return type
  }
}

function getComplianceStatusLabel(status: string): string {
  switch (status) {
    case 'Open': return 'Ouvert'
    case 'Corrected': return 'Corrigé'
    case 'Closed': return 'Fermé'
    default: return status
  }
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function HaccpDocumentsPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery } = useNursery()
  const router = useRouter()

  // Date range for registers
  const defaultRange = getMonthRange()
  const [startDate, setStartDate] = useState(defaultRange.startDate)
  const [endDate, setEndDate] = useState(defaultRange.endDate)

  // Register data
  const [registerData, setRegisterData] = useState<RegisterData>({
    temperatures: [],
    sessions: [],
    meals: [],
    nonCompliances: [],
    equipment: [],
  })
  const [expandedRegister, setExpandedRegister] = useState<RegisterType | null>(null)
  const [isLoadingRegisters, setIsLoadingRegisters] = useState(true)

  // External documents
  const [documents, setDocuments] = useState<HaccpDocument[]>([])
  const [isLoadingDocs, setIsLoadingDocs] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<HaccpDocument | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [uploadForm, setUploadForm] = useState({
    name: '',
    category: 'Compliance' as DocumentCategory,
    file: null as File | null,
  })

  const [error, setError] = useState('')

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadRegisters = useCallback(async () => {
    if (!selectedNursery?.id) return
    setIsLoadingRegisters(true)
    setError('')

    try {
      const safe = async <T,>(fn: () => Promise<T[]>, label: string): Promise<T[]> => {
        try { return await fn() }
        catch (err) { console.warn(`[Registres] ${label}:`, err); return [] }
      }

      const [temperatures, sessions, meals, nonCompliances, equipment] = await Promise.all([
        safe(() => haccpService.getTemperaturesByDateRange(selectedNursery.id, startDate, endDate), 'Températures'),
        safe(() => sessionsService.getByDateRange(selectedNursery.id, startDate, endDate), 'Nettoyage'),
        safe(() => haccpService.getMealsByDateRange(selectedNursery.id, startDate, endDate), 'Repas'),
        safe(() => haccpService.getNonCompliancesByDateRange(selectedNursery.id, startDate, endDate), 'Non-conformités'),
        safe(() => haccpService.getEquipment(selectedNursery.id), 'Équipements'),
      ])

      setRegisterData({ temperatures, sessions, meals, nonCompliances, equipment })
    } catch (err: any) {
      console.error('Error loading registers:', err)
      setError('Erreur lors du chargement des registres')
    } finally {
      setIsLoadingRegisters(false)
    }
  }, [selectedNursery?.id, startDate, endDate])

  const loadDocuments = useCallback(async () => {
    if (!selectedNursery?.id) return
    setIsLoadingDocs(true)

    try {
      const data = await haccpService.getDocuments(selectedNursery.id)
      setDocuments(data)
    } catch (err: any) {
      console.error('Error loading documents:', err)
    } finally {
      setIsLoadingDocs(false)
    }
  }, [selectedNursery?.id])

  useEffect(() => {
    if (selectedNursery?.id) {
      loadRegisters()
      loadDocuments()
    } else if (!authLoading) {
      setIsLoadingRegisters(false)
      setIsLoadingDocs(false)
    }
  }, [selectedNursery?.id, authLoading, loadRegisters, loadDocuments])

  // ============================================================================
  // PDF EXPORT HANDLERS
  // ============================================================================

  function handleExportPDF(type: RegisterType) {
    const nurseryName = selectedNursery?.name || 'Crèche'

    switch (type) {
      case 'temperatures':
        pdfExportService.exportTemperatureRegister({
          nurseryName,
          startDate,
          endDate,
          temperatures: registerData.temperatures,
        })
        break
      case 'cleaning':
        pdfExportService.exportCleaningRegister({
          nurseryName,
          startDate,
          endDate,
          sessions: registerData.sessions,
        })
        break
      case 'meals':
        pdfExportService.exportMealRegister({
          nurseryName,
          startDate,
          endDate,
          meals: registerData.meals,
        })
        break
      case 'nonCompliances':
        pdfExportService.exportNonComplianceRegister({
          nurseryName,
          startDate,
          endDate,
          incidents: registerData.nonCompliances,
        })
        break
      case 'equipment':
        pdfExportService.exportEquipmentRegister({
          nurseryName,
          equipment: registerData.equipment,
        })
        break
    }
  }

  // ============================================================================
  // DOCUMENT UPLOAD/DELETE
  // ============================================================================

  async function handleUploadSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsUploading(true)

    try {
      if (!selectedNursery?.id || !session?.user?.id) return

      let filePath = ''

      if (uploadForm.file) {
        const result = await storageService.uploadFile(uploadForm.file, {
          bucket: 'documents',
          path: `haccp/${selectedNursery.id}`,
          maxSizeMB: 10,
        })
        if (!result.success) throw new Error(result.error || 'Upload failed')
        filePath = result.path || uploadForm.file.name
      }

      await haccpService.createDocument(selectedNursery.id, {
        name: uploadForm.name,
        category: uploadForm.category,
        file_path: filePath,
        creation_date: getTodayLocal(),
        responsible_id: session.user.id,
      })

      await loadDocuments()
      setShowUploadModal(false)
      setUploadForm({ name: '', category: 'Compliance', file: null })
    } catch (err: any) {
      console.error('Error uploading document:', err)
      setError("Erreur lors de l'enregistrement")
    } finally {
      setIsUploading(false)
    }
  }

  async function handleDeleteDocument() {
    if (!documentToDelete || !selectedNursery?.id) return

    try {
      setIsDeleting(true)
      if (documentToDelete.file_path) {
        await storageService.deleteFile('documents', documentToDelete.file_path)
      }
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

  // ============================================================================
  // REGISTER STATS
  // ============================================================================

  function getRegisterStats(type: RegisterType): { count: number; detail: string } {
    switch (type) {
      case 'temperatures': {
        const total = registerData.temperatures.length
        const compliant = registerData.temperatures.filter(t => t.is_compliant).length
        return { count: total, detail: total > 0 ? `${Math.round(compliant / total * 100)}% conforme` : 'Aucun relevé' }
      }
      case 'cleaning': {
        const total = registerData.sessions.length
        const completed = registerData.sessions.filter((s: any) => s.status === 'COMPLETEE').length
        return { count: total, detail: total > 0 ? `${completed} complétée(s)` : 'Aucune session' }
      }
      case 'meals': {
        const total = registerData.meals.length
        const validated = registerData.meals.filter(m => m.is_validated).length
        return { count: total, detail: total > 0 ? `${validated} validé(s)` : 'Aucun repas' }
      }
      case 'nonCompliances': {
        const total = registerData.nonCompliances.length
        const open = registerData.nonCompliances.filter(n => n.status === 'Open').length
        return { count: total, detail: total > 0 ? `${open} ouvert(s)` : 'Aucun incident' }
      }
      case 'equipment': {
        const total = registerData.equipment.length
        const active = registerData.equipment.filter(e => e.is_active).length
        return { count: total, detail: `${active} actif(s)` }
      }
    }
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  if (authLoading || (isLoadingRegisters && isLoadingDocs)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-200 border-t-primary-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  const documentCategories = {
    Training: { label: 'Formation', icon: '📚' },
    Compliance: { label: 'Conformité', icon: '✅' },
    Other: { label: 'Autre', icon: '📄' },
  }

  return (
    <div className="p-8">
      <PageBreadcrumb
        items={[
          { label: 'Dashboard', href: '/owner/dashboard' },
          { label: 'HACCP', href: '/owner/haccp' },
          { label: 'Documents' },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-100">
            <DocumentTextIcon className="w-6 h-6 text-indigo-600" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Documents HACCP</h1>
            <p className="text-sm text-muted-foreground">Registres auto-générés et documents de conformité</p>
          </div>
        </div>
        <button
          onClick={() => router.push('/owner/haccp')}
          className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium transition-colors"
        >
          ← Retour
        </button>
      </div>

      {error && (
        <div className="card p-4 mb-6 bg-danger-50 border border-danger-200">
          <p className="text-danger-700">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="registers" className="space-y-6">
        <TabsList className="h-10">
          <TabsTrigger value="registers" className="px-4">
            Registres HACCP
          </TabsTrigger>
          <TabsTrigger value="documents" className="px-4">
            Documents externes
          </TabsTrigger>
        </TabsList>

        {/* ================================================================ */}
        {/* TAB 1: REGISTRES HACCP */}
        {/* ================================================================ */}
        <TabsContent value="registers">
          {/* Date Range Picker */}
          <div className="card p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <CalendarDaysIcon className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
              <label className="text-sm font-medium">Période :</label>
              <DatePicker
                value={startDate}
                onChange={(date) => date && setStartDate(formatDateLocal(date))}
                placeholder="Date de début"
                className="w-[180px]"
              />
              <span className="text-sm text-muted-foreground">au</span>
              <DatePicker
                value={endDate}
                onChange={(date) => date && setEndDate(formatDateLocal(date))}
                placeholder="Date de fin"
                className="w-[180px]"
              />
              <button
                onClick={loadRegisters}
                disabled={isLoadingRegisters}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                <ArrowPathIcon className={`w-4 h-4 ${isLoadingRegisters ? 'animate-spin' : ''}`} strokeWidth={2} />
                Actualiser
              </button>
            </div>
          </div>

          {/* Register Cards */}
          {isLoadingRegisters ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-200 border-t-primary-500 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Chargement des registres...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(Object.keys(REGISTER_CONFIG) as RegisterType[]).map((type) => {
                const config = REGISTER_CONFIG[type]
                const stats = getRegisterStats(type)
                const isExpanded = expandedRegister === type

                return (
                  <div
                    key={type}
                    className={`rounded-2xl bg-gradient-to-br ${config.gradient} border ${config.border} ${config.shadow} hover:shadow-lg transition-all duration-300 overflow-hidden`}
                  >
                    {/* Register Header */}
                    <button
                      onClick={() => setExpandedRegister(isExpanded ? null : type)}
                      className="w-full flex items-center justify-between p-5 text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-3xl">{config.icon}</span>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{config.label}</h3>
                          <p className="text-sm text-muted-foreground">
                            {stats.count} entrée(s) — {stats.detail}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${config.badge}`}>
                          {stats.count}
                        </span>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); handleExportPDF(type) }}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); handleExportPDF(type) } }}
                          className="p-2 rounded-lg hover:bg-white/60 transition-colors cursor-pointer"
                          title="Exporter PDF"
                        >
                          <ArrowDownTrayIcon className="w-5 h-5 text-gray-600" strokeWidth={1.5} />
                        </span>
                        {isExpanded
                          ? <ChevronUpIcon className="w-5 h-5 text-gray-400" strokeWidth={2} />
                          : <ChevronDownIcon className="w-5 h-5 text-gray-400" strokeWidth={2} />
                        }
                      </div>
                    </button>

                    {/* Register Content (expanded) */}
                    {isExpanded && (
                      <div className="px-5 pb-5">
                        <div className="bg-white/70 rounded-xl border border-white/50 overflow-hidden">
                          <RegisterTable type={type} data={registerData} />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ================================================================ */}
        {/* TAB 2: DOCUMENTS EXTERNES */}
        {/* ================================================================ */}
        <TabsContent value="documents">
          <div className="flex justify-end mb-6">
            <button
              onClick={() => {
                setUploadForm({ name: '', category: 'Compliance', file: null })
                setShowUploadModal(true)
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-medium transition-colors"
            >
              + Ajouter un document
            </button>
          </div>

          {isLoadingDocs ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-200 border-t-primary-500 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Chargement...</p>
            </div>
          ) : documents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {documents.map((doc) => {
                const catInfo = documentCategories[doc.category as keyof typeof documentCategories] || documentCategories.Other
                return (
                  <div
                    key={doc.id}
                    className="group relative p-6 rounded-3xl bg-gradient-to-br from-indigo-50/80 to-blue-50/80 border border-indigo-200/50 hover:shadow-lg hover:shadow-indigo-500/20 transition-all duration-300 hover:scale-[1.02]"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{catInfo.icon}</span>
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                          {catInfo.label}
                        </span>
                      </div>
                      <button
                        onClick={() => setDocumentToDelete(doc)}
                        className="text-danger-500 hover:text-danger-700 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Supprimer"
                      >
                        <TrashIcon className="w-5 h-5" strokeWidth={1.5} />
                      </button>
                    </div>
                    <h3 className="text-lg font-bold mb-2">{doc.name}</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      Ajouté le {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                      {doc.retention_period && ` — Conservation: ${doc.retention_period}`}
                    </p>
                    {doc.file_path && (
                      <div className="text-sm text-indigo-600 font-medium truncate">
                        {doc.file_path.split('/').pop()}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="card p-12 text-center">
              <DocumentTextIcon className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" strokeWidth={1} />
              <p className="text-muted-foreground mb-4">Aucun document externe enregistré</p>
              <p className="text-sm text-muted-foreground mb-6">
                Ajoutez ici vos certificats de formation, rapports d'audit, attestations, etc.
              </p>
              <button
                onClick={() => {
                  setUploadForm({ name: '', category: 'Compliance', file: null })
                  setShowUploadModal(true)
                }}
                className="btn btn-primary"
              >
                + Ajouter le premier document
              </button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Upload Modal */}
      <FormDialog
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSubmit={handleUploadSubmit}
        title="Nouveau document externe"
        submitLabel="Ajouter"
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
              value={uploadForm.name}
              onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary-500 bg-background"
              placeholder="Ex: Certificat de formation HACCP"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Catégorie</label>
            <select
              value={uploadForm.category}
              onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value as DocumentCategory })}
              className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary-500 bg-background"
            >
              {Object.entries(documentCategories).map(([key, info]) => (
                <option key={key} value={key}>
                  {info.icon} {info.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fichier</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,image/*"
              onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
              className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary-500 bg-background"
            />
            <p className="text-xs text-muted-foreground mt-1">PDF, Word, ou images (max 10MB)</p>
          </div>
        </div>
      </FormDialog>

      {/* Delete Confirmation */}
      <DeleteConfirmationDialog
        isOpen={!!documentToDelete}
        onClose={() => setDocumentToDelete(null)}
        onConfirm={handleDeleteDocument}
        title="Confirmer la suppression"
        description="Êtes-vous sûr de vouloir supprimer le document"
        itemName={documentToDelete?.name || ''}
        isDeleting={isDeleting}
      />
    </div>
  )
}

// ============================================================================
// REGISTER TABLE COMPONENT
// ============================================================================

function RegisterTable({ type, data }: { type: RegisterType; data: RegisterData }) {
  switch (type) {
    case 'temperatures':
      return data.temperatures.length > 0 ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-emerald-50/50 border-b border-emerald-100">
              <th className="text-left p-3 font-semibold text-gray-700">Date & Heure</th>
              <th className="text-left p-3 font-semibold text-gray-700">Point de contrôle</th>
              <th className="text-left p-3 font-semibold text-gray-700">Température</th>
              <th className="text-left p-3 font-semibold text-gray-700">Conformité</th>
              <th className="text-left p-3 font-semibold text-gray-700">Notes</th>
            </tr>
          </thead>
          <tbody>
            {data.temperatures.map((t, i) => (
              <tr key={t.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                <td className="p-3">{new Date(t.measured_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                <td className="p-3">{getCheckpointLabel(t.checkpoint_type)}</td>
                <td className="p-3 font-mono font-semibold">{t.temperature_value}°C</td>
                <td className="p-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${t.is_compliant ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {t.is_compliant ? 'Conforme' : 'Non conforme'}
                  </span>
                </td>
                <td className="p-3 text-muted-foreground">{t.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <EmptyRegister />

    case 'cleaning':
      return data.sessions.length > 0 ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-blue-50/50 border-b border-blue-100">
              <th className="text-left p-3 font-semibold text-gray-700">Date</th>
              <th className="text-left p-3 font-semibold text-gray-700">Statut</th>
              <th className="text-left p-3 font-semibold text-gray-700">Tâches</th>
              <th className="text-left p-3 font-semibold text-gray-700">Complétion</th>
            </tr>
          </thead>
          <tbody>
            {data.sessions.map((s: any, i: number) => (
              <tr key={s.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                <td className="p-3">{new Date(s.date).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</td>
                <td className="p-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${s.status === 'COMPLETEE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {s.status === 'COMPLETEE' ? 'Complétée' : 'En cours'}
                  </span>
                </td>
                <td className="p-3">{s.completed_tasks} / {s.total_tasks}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${s.completion_percentage === 100 ? 'bg-emerald-400' : 'bg-blue-400'}`}
                        style={{ width: `${s.completion_percentage}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold w-10 text-right">{s.completion_percentage}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <EmptyRegister />

    case 'meals':
      return data.meals.length > 0 ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-orange-50/50 border-b border-orange-100">
              <th className="text-left p-3 font-semibold text-gray-700">Date</th>
              <th className="text-left p-3 font-semibold text-gray-700">Type</th>
              <th className="text-left p-3 font-semibold text-gray-700">Menu</th>
              <th className="text-left p-3 font-semibold text-gray-700">Allergènes</th>
              <th className="text-left p-3 font-semibold text-gray-700">Validé</th>
            </tr>
          </thead>
          <tbody>
            {data.meals.map((m, i) => (
              <tr key={m.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                <td className="p-3">{new Date(m.date).toLocaleDateString('fr-FR')}</td>
                <td className="p-3">{getMealTypeLabel(m.type)}</td>
                <td className="p-3 max-w-[200px] truncate">{m.menu || '-'}</td>
                <td className="p-3 text-muted-foreground">{m.allergens_present || 'Aucun'}</td>
                <td className="p-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${m.is_validated ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                    {m.is_validated ? 'Oui' : 'Non'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <EmptyRegister />

    case 'nonCompliances':
      return data.nonCompliances.length > 0 ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-rose-50/50 border-b border-rose-100">
              <th className="text-left p-3 font-semibold text-gray-700">Date</th>
              <th className="text-left p-3 font-semibold text-gray-700">Type</th>
              <th className="text-left p-3 font-semibold text-gray-700">Description</th>
              <th className="text-left p-3 font-semibold text-gray-700">Statut</th>
              <th className="text-left p-3 font-semibold text-gray-700">Action corrective</th>
            </tr>
          </thead>
          <tbody>
            {data.nonCompliances.map((nc, i) => (
              <tr key={nc.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                <td className="p-3">{new Date(nc.discovered_at).toLocaleDateString('fr-FR')}</td>
                <td className="p-3">{getComplianceTypeLabel(nc.type)}</td>
                <td className="p-3 max-w-[200px] truncate">{nc.description}</td>
                <td className="p-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                    nc.status === 'Closed' ? 'bg-emerald-100 text-emerald-700'
                      : nc.status === 'Corrected' ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {getComplianceStatusLabel(nc.status)}
                  </span>
                </td>
                <td className="p-3 text-muted-foreground max-w-[200px] truncate">{nc.corrective_action || 'En attente'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <EmptyRegister />

    case 'equipment':
      return data.equipment.length > 0 ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-violet-50/50 border-b border-violet-100">
              <th className="text-left p-3 font-semibold text-gray-700">Équipement</th>
              <th className="text-left p-3 font-semibold text-gray-700">Catégorie</th>
              <th className="text-left p-3 font-semibold text-gray-700">Dernière maintenance</th>
              <th className="text-left p-3 font-semibold text-gray-700">Prochaine</th>
              <th className="text-left p-3 font-semibold text-gray-700">Actif</th>
            </tr>
          </thead>
          <tbody>
            {data.equipment.map((e, i) => (
              <tr key={e.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                <td className="p-3 font-medium">{e.name}</td>
                <td className="p-3 text-muted-foreground">{e.category || '-'}</td>
                <td className="p-3">{e.last_maintenance_date ? new Date(e.last_maintenance_date).toLocaleDateString('fr-FR') : '-'}</td>
                <td className="p-3">{e.next_maintenance_date ? new Date(e.next_maintenance_date).toLocaleDateString('fr-FR') : '-'}</td>
                <td className="p-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${e.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                    {e.is_active ? 'Oui' : 'Non'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <EmptyRegister />
  }
}

function EmptyRegister() {
  return (
    <div className="p-8 text-center">
      <p className="text-sm text-muted-foreground">Aucune donnée pour cette période</p>
    </div>
  )
}
