'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  DocumentCheckIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline'

export default function CertificatesPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [taxCertificates, setTaxCertificates] = useState<any[]>([])
  const [cafDocuments, setCafDocuments] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'tax' | 'caf'>('tax')

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadCertificates()
  }, [])

  async function loadCertificates() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/portal/login')
        return
      }

      // Get guardian_user
      const { data: guardianUserData } = await supabase
        .from('guardian_user')
        .select('guardian_id')
        .eq('user_id', user.id)
        .single()

      if (!guardianUserData) {
        router.push('/portal/login')
        return
      }

      // Get guardian's family
      const { data: guardianData } = await supabase
        .from('guardian')
        .select('family_id')
        .eq('id', (guardianUserData as any).guardian_id)
        .single()

      if (!guardianData) {
        router.push('/portal/login')
        return
      }

      const familyId = (guardianData as any).family_id

      // Load tax certificates
      const { data: taxCertsData } = await supabase
        .from('tax_certificate')
        .select('*')
        .eq('family_id', familyId)
        .order('year', { ascending: false })

      if (taxCertsData) {
        setTaxCertificates(taxCertsData)
      }

      // Load CAF documents
      const { data: cafDocsData } = await supabase
        .from('caf_document')
        .select('*')
        .eq('family_id', familyId)
        .order('period_start', { ascending: false })

      if (cafDocsData) {
        setCafDocuments(cafDocsData)
      }

      setIsLoading(false)
    } catch (error) {
      console.error('Failed to load certificates:', error)
      setIsLoading(false)
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
        <h1 className="text-2xl font-bold text-gray-900">Attestations</h1>
        <p className="text-gray-600 mt-1">
          Attestations fiscales et documents CAF
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white rounded-2xl p-1 border border-gray-200">
        <button
          onClick={() => setActiveTab('tax')}
          className={`flex-1 px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
            activeTab === 'tax'
              ? 'bg-gradient-to-r from-[#5a9dc9] to-[#2c5f7f] text-white shadow-md'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Attestations fiscales
        </button>
        <button
          onClick={() => setActiveTab('caf')}
          className={`flex-1 px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
            activeTab === 'caf'
              ? 'bg-gradient-to-r from-[#5a9dc9] to-[#2c5f7f] text-white shadow-md'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Documents CAF
        </button>
      </div>

      {/* Content */}
      {activeTab === 'tax' ? (
        <TaxCertificatesTab certificates={taxCertificates} />
      ) : (
        <CAFDocumentsTab documents={cafDocuments} />
      )}
    </div>
  )
}

function TaxCertificatesTab({ certificates }: { certificates: any[] }) {
  if (certificates.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
        <DocumentCheckIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune attestation</h3>
        <p className="text-gray-600">
          Les attestations fiscales seront disponibles en début d'année
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {certificates.map((certificate: any) => (
        <TaxCertificateCard key={certificate.id} certificate={certificate} />
      ))}
    </div>
  )
}

function TaxCertificateCard({ certificate }: any) {
  const generatedDate = new Date(certificate.generated_at).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-200 hover:border-[#5a9dc9] hover:shadow-md transition-all duration-300">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#b5e7a0] to-[#81c995] flex items-center justify-center flex-shrink-0">
          <DocumentCheckIcon className="w-7 h-7 text-white" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">
                Attestation fiscale {certificate.year}
              </h3>
              <p className="text-sm text-gray-600">
                Numéro: {certificate.certificate_number}
              </p>
            </div>
            {certificate.pdf_url && (
              <a
                href={certificate.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-[#5a9dc9]/10 text-[#2c5f7f] rounded-xl hover:bg-[#5a9dc9]/20 transition-colors"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
              </a>
            )}
          </div>

          {/* Amounts */}
          <div className="mb-3 space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-gray-600">Montant déductible:</span>
              <span className="text-lg font-bold text-gray-900">
                {formatCurrency(certificate.deductible_amount)}
              </span>
            </div>
            {certificate.tax_credit_amount && (
              <div className="flex items-baseline gap-2">
                <span className="text-sm text-gray-600">Crédit d'impôt (50%):</span>
                <span className="text-lg font-semibold text-green-600">
                  {formatCurrency(certificate.tax_credit_amount)}
                </span>
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <CalendarIcon className="w-3 h-3" />
              Généré le {generatedDate}
            </span>
            {certificate.sent_at && (
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                Envoyée
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function CAFDocumentsTab({ documents }: { documents: any[] }) {
  if (documents.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
        <BanknotesIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun document CAF</h3>
        <p className="text-gray-600">
          Les attestations CAF sont générées mensuellement
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {documents.map((document: any) => (
        <CAFDocumentCard key={document.id} document={document} />
      ))}
    </div>
  )
}

function CAFDocumentCard({ document }: any) {
  const periodStart = new Date(document.period_start)
  const periodLabel = periodStart.toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric'
  })

  const generatedDate = new Date(document.generated_at).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-200 hover:border-[#5a9dc9] hover:shadow-md transition-all duration-300">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#ffe5b4] to-[#ffd580] flex items-center justify-center flex-shrink-0">
          <BanknotesIcon className="w-7 h-7 text-gray-800" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">
                {getDocumentTypeLabel(document.document_type)} - {periodLabel}
              </h3>
              <p className="text-sm text-gray-600">
                Numéro: {document.document_number}
              </p>
            </div>
            {document.pdf_url && (
              <a
                href={document.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-[#5a9dc9]/10 text-[#2c5f7f] rounded-xl hover:bg-[#5a9dc9]/20 transition-colors"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
              </a>
            )}
          </div>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <CalendarIcon className="w-3 h-3" />
              Généré le {generatedDate}
            </span>
            {document.sent_at && (
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                Envoyée
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
    monthly_attendance_certificate: 'Attestation de présence',
    payment_proof: 'Justificatif de paiement'
  }
  return labels[type] || type
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount)
}
