'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  DocumentTextIcon,
  ArrowDownTrayIcon,
  CreditCardIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

export default function InvoicesPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [invoices, setInvoices] = useState<any[]>([])
  const [filter, setFilter] = useState<string>('all')

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadInvoices()
  }, [filter])

  async function loadInvoices() {
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

      // Load invoices for family
      let query = supabase
        .from('invoice')
        .select('*')
        .eq('family_id', familyId)
        .order('issue_date', { ascending: false })

      // Filter by status
      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data: invoicesData } = await query

      if (invoicesData) {
        setInvoices(invoicesData)
      }

      setIsLoading(false)
    } catch (error) {
      console.error('Failed to load invoices:', error)
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
        <h1 className="text-2xl font-bold text-gray-900">Factures</h1>
        <p className="text-gray-600 mt-1">
          Consultez et téléchargez vos factures
        </p>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Statut
        </label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5a9dc9]/20 focus:border-[#5a9dc9]"
        >
          <option value="all">Toutes les factures</option>
          <option value="draft">Brouillon</option>
          <option value="sent">Envoyée</option>
          <option value="paid">Payée</option>
          <option value="partially_paid">Partiellement payée</option>
          <option value="overdue">En retard</option>
          <option value="cancelled">Annulée</option>
        </select>
      </div>

      {/* Invoices List */}
      {invoices.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
          <CreditCardIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune facture</h3>
          <p className="text-gray-600">
            {filter === 'all'
              ? 'Aucune facture disponible'
              : 'Aucune facture avec ce statut'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((invoice: any) => (
            <InvoiceCard key={invoice.id} invoice={invoice} />
          ))}
        </div>
      )}
    </div>
  )
}

function InvoiceCard({ invoice }: any) {
  const issueDate = new Date(invoice.issue_date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  const dueDate = new Date(invoice.due_date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  const statusConfig = getStatusConfig(invoice.status)

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-200 hover:border-[#5a9dc9] hover:shadow-md transition-all duration-300">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`w-14 h-14 rounded-2xl ${statusConfig.bg} flex items-center justify-center flex-shrink-0`}>
          {statusConfig.icon}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">
                Facture {invoice.invoice_number}
              </h3>
              <p className="text-sm text-gray-600">
                {invoice.period_start && invoice.period_end && (
                  <>
                    Période: {new Date(invoice.period_start).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                  </>
                )}
              </p>
            </div>
            {invoice.pdf_url && (
              <a
                href={invoice.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-[#5a9dc9]/10 text-[#2c5f7f] rounded-xl hover:bg-[#5a9dc9]/20 transition-colors"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
              </a>
            )}
          </div>

          {/* Amount */}
          <div className="mb-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">
                {formatCurrency(invoice.total_amount_with_tax)}
              </span>
              {invoice.amount_paid > 0 && (
                <span className="text-sm text-green-600 font-medium">
                  ({formatCurrency(invoice.amount_paid)} payé)
                </span>
              )}
            </div>
          </div>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <ClockIcon className="w-3 h-3" />
              Émise le {issueDate}
            </span>
            <span>
              Échéance: {dueDate}
            </span>
            <span className={`px-2 py-1 rounded-full ${statusConfig.badgeBg} ${statusConfig.badgeText} font-medium`}>
              {statusConfig.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function getStatusConfig(status: string) {
  const configs: Record<string, any> = {
    draft: {
      label: 'Brouillon',
      icon: <DocumentTextIcon className="w-7 h-7 text-gray-600" />,
      bg: 'bg-gray-100',
      badgeBg: 'bg-gray-100',
      badgeText: 'text-gray-700'
    },
    sent: {
      label: 'Envoyée',
      icon: <ClockIcon className="w-7 h-7 text-blue-600" />,
      bg: 'bg-blue-100',
      badgeBg: 'bg-blue-100',
      badgeText: 'text-blue-700'
    },
    paid: {
      label: 'Payée',
      icon: <CheckCircleIcon className="w-7 h-7 text-green-600" />,
      bg: 'bg-green-100',
      badgeBg: 'bg-green-100',
      badgeText: 'text-green-700'
    },
    partially_paid: {
      label: 'Partiellement payée',
      icon: <ClockIcon className="w-7 h-7 text-yellow-600" />,
      bg: 'bg-yellow-100',
      badgeBg: 'bg-yellow-100',
      badgeText: 'text-yellow-700'
    },
    overdue: {
      label: 'En retard',
      icon: <XCircleIcon className="w-7 h-7 text-red-600" />,
      bg: 'bg-red-100',
      badgeBg: 'bg-red-100',
      badgeText: 'text-red-700'
    },
    cancelled: {
      label: 'Annulée',
      icon: <XCircleIcon className="w-7 h-7 text-gray-600" />,
      bg: 'bg-gray-100',
      badgeBg: 'bg-gray-100',
      badgeText: 'text-gray-700'
    }
  }

  return configs[status] || configs.draft
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount)
}
