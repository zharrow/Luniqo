'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  DocumentTextIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ClockIcon,
  FolderIcon
} from '@heroicons/react/24/outline'

export default function DocumentsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [documents, setDocuments] = useState<any[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [guardianId, setGuardianId] = useState<string>('')

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadDocuments()
  }, [filter])

  async function loadDocuments() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/portal/login')
        return
      }

      // Get guardian_user
      const { data: guardianUser } = await supabase
        .from('guardian_user')
        .select('guardian_id')
        .eq('user_id', user.id)
        .single()

      if (!guardianUser) {
        router.push('/portal/login')
        return
      }

      setGuardianId((guardianUser as any).guardian_id)

      // Get guardian's children
      const { data: childrenData } = await supabase
        .from('guardian_child')
        .select('child_id')
        .eq('guardian_id', (guardianUser as any).guardian_id)

      const childIds = childrenData?.map((gc: any) => gc.child_id) || []

      // Load shared documents
      let query = supabase
        .from('parent_document_share')
        .select('*')
        .or(`scope.eq.all_families,specific_child_id.in.(${childIds.join(',')})`)
        .order('created_at', { ascending: false })

      // Filter by type
      if (filter !== 'all') {
        query = query.eq('document_type', filter)
      }

      const { data: documentsData } = await query

      if (documentsData) {
        // Check which documents have been acknowledged
        const { data: acknowledgments } = await supabase
          .from('document_acknowledgment')
          .select('document_id, acknowledged_at')
          .eq('guardian_id', (guardianUser as any).guardian_id)
          .in('document_id', documentsData.map((d: any) => d.id))

        const acknowledgedMap = new Map(
          acknowledgments?.map((a: any) => [a.document_id, a.acknowledged_at]) || []
        )

        const documentsWithAck = documentsData.map((doc: any) => ({
          ...(doc as any),
          acknowledged_at: acknowledgedMap.get(doc.id)
        }))

        setDocuments(documentsWithAck)
      }

      setIsLoading(false)
    } catch (error) {
      console.error('Failed to load documents:', error)
      setIsLoading(false)
    }
  }

  async function handleDownload(document: any) {
    try {
      // Record download
      await (supabase as any)
        .from('document_acknowledgment')
        .upsert({
          document_id: document.id,
          guardian_id: guardianId,
          acknowledged_at: new Date().toISOString(),
          download_count: 1
        })

      // Open document URL
      window.open(document.document_url, '_blank')

      // Refresh to update acknowledgment status
      loadDocuments()
    } catch (error) {
      console.error('Failed to download document:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#5a9dc9]/20 border-t-[#5a9dc9] mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
        <p className="text-gray-600 mt-1">
          Accédez aux documents partagés par la crèche
        </p>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Type de document
        </label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5a9dc9]/20 focus:border-[#5a9dc9]"
        >
          <option value="all">Tous les documents</option>
          <option value="menu">Menus</option>
          <option value="calendar">Calendriers</option>
          <option value="regulation">Règlements</option>
          <option value="report">Comptes-rendus</option>
          <option value="photo_album">Albums photos</option>
          <option value="announcement">Annonces</option>
          <option value="consent_form">Formulaires de consentement</option>
        </select>
      </div>

      {/* Documents List */}
      {documents.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
          <DocumentTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun document</h3>
          <p className="text-gray-600">
            {filter === 'all'
              ? 'Aucun document n\'a été partagé pour le moment'
              : 'Aucun document de ce type'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((document: any) => (
            <DocumentCard
              key={document.id}
              document={document}
              onDownload={() => handleDownload(document)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function DocumentCard({ document, onDownload }: any) {
  const uploadDate = new Date(document.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  const isAcknowledged = !!document.acknowledged_at
  const requiresAck = document.requires_acknowledgment

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-200 hover:border-[#5a9dc9] hover:shadow-md transition-all duration-300">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#d4a5f4] to-[#b88cd6] flex items-center justify-center flex-shrink-0">
          <DocumentTextIcon className="w-7 h-7 text-white" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">
                {document.title}
              </h3>
              {document.description && (
                <p className="text-sm text-gray-600 line-clamp-2">
                  {document.description}
                </p>
              )}
            </div>
            <button
              onClick={onDownload}
              className="p-2 bg-[#5a9dc9]/10 text-[#2c5f7f] rounded-xl hover:bg-[#5a9dc9]/20 transition-colors flex-shrink-0"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <ClockIcon className="w-3 h-3" />
              {uploadDate}
            </span>
            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
              {getDocumentTypeLabel(document.document_type)}
            </span>
            {requiresAck && (
              <span className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                isAcknowledged
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {isAcknowledged ? (
                  <>
                    <CheckCircleIcon className="w-3 h-3" />
                    Confirmé
                  </>
                ) : (
                  'Confirmation requise'
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function getDocumentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    menu: 'Menu',
    calendar: 'Calendrier',
    regulation: 'Règlement',
    invoice: 'Facture',
    certificate: 'Attestation',
    report: 'Compte-rendu',
    photo_album: 'Album photos',
    announcement: 'Annonce',
    consent_form: 'Formulaire'
  }
  return labels[type] || type
}
