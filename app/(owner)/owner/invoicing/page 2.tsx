'use client'

import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { useRouter } from 'next/navigation'
import {
  BanknotesIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  PlusIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ModuleCard } from '@/components/shared/ModuleCard'
import { invoicingService } from '@/lib/services/invoicing.service'
import { paymentService } from '@/lib/services/payment.service'

interface DashboardStats {
  total_invoices: number
  total_amount: number
  total_paid: number
  total_outstanding: number
  payment_rate: number
  overdue_count: number
  pending_payments: number
}

export default function InvoicingDashboardPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery, isLoading: nurseryLoading } = useNursery()
  const router = useRouter()

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(true)

  useEffect(() => {
    if (selectedNursery?.id) {
      loadStats()
    }
  }, [selectedNursery?.id])

  const loadStats = async () => {
    if (!selectedNursery?.id) return

    try {
      setIsLoadingStats(true)

      // Récupère les stats des factures et paiements
      const [invoiceStats, paymentStats] = await Promise.all([
        invoicingService.getStats(selectedNursery.id),
        paymentService.getStats(selectedNursery.id),
      ])

      // Récupère les factures impayées
      const overdueInvoices = await invoicingService.getOverdueInvoices(selectedNursery.id)

      // Calcule le taux de paiement
      const paymentRate = invoiceStats.total_amount > 0
        ? (invoiceStats.total_paid / invoiceStats.total_amount) * 100
        : 0

      setStats({
        total_invoices: invoiceStats.total_invoices,
        total_amount: invoiceStats.total_amount,
        total_paid: invoiceStats.total_paid,
        total_outstanding: invoiceStats.total_outstanding,
        payment_rate: Math.round(paymentRate * 10) / 10,
        overdue_count: overdueInvoices.length,
        pending_payments: paymentStats.pending_validation,
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setIsLoadingStats(false)
    }
  }

  if (authLoading || nurseryLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <h1 className="text-3xl font-bold mb-2">Facturation & Finances</h1>
        <p className="text-muted-foreground">
          Gestion complète de la facturation, paiements et exports comptables
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Chiffre d'affaires */}
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-white border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Chiffre d'affaires</h3>
            <ChartBarIcon className="w-5 h-5 text-blue-600" />
          </div>
          {isLoadingStats ? (
            <div className="h-8 w-24 bg-gray-200 animate-pulse rounded"></div>
          ) : (
            <>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.total_amount.toLocaleString('fr-FR', {
                  style: 'currency',
                  currency: 'EUR',
                })}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {stats?.total_invoices} factures
              </p>
            </>
          )}
        </Card>

        {/* Encaissements */}
        <Card className="p-6 bg-gradient-to-br from-green-50 to-white border-green-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Encaissé</h3>
            <CheckCircleIcon className="w-5 h-5 text-green-600" />
          </div>
          {isLoadingStats ? (
            <div className="h-8 w-24 bg-gray-200 animate-pulse rounded"></div>
          ) : (
            <>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.total_paid.toLocaleString('fr-FR', {
                  style: 'currency',
                  currency: 'EUR',
                })}
              </p>
              <p className="text-sm text-green-600 mt-1">
                {stats?.payment_rate}% de taux de paiement
              </p>
            </>
          )}
        </Card>

        {/* Impayés */}
        <Card className="p-6 bg-gradient-to-br from-orange-50 to-white border-orange-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Reste à payer</h3>
            <ClockIcon className="w-5 h-5 text-orange-600" />
          </div>
          {isLoadingStats ? (
            <div className="h-8 w-24 bg-gray-200 animate-pulse rounded"></div>
          ) : (
            <>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.total_outstanding.toLocaleString('fr-FR', {
                  style: 'currency',
                  currency: 'EUR',
                })}
              </p>
              <p className="text-sm text-orange-600 mt-1">
                {stats && stats.overdue_count > 0 ? (
                  <>{stats.overdue_count} factures en retard</>
                ) : (
                  <>Aucune facture en retard</>
                )}
              </p>
            </>
          )}
        </Card>

        {/* Paiements en attente */}
        <Card className="p-6 bg-gradient-to-br from-purple-50 to-white border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">À valider</h3>
            <BanknotesIcon className="w-5 h-5 text-purple-600" />
          </div>
          {isLoadingStats ? (
            <div className="h-8 w-24 bg-gray-200 animate-pulse rounded"></div>
          ) : (
            <>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.pending_payments || 0}
              </p>
              <p className="text-sm text-purple-600 mt-1">
                paiements en attente
              </p>
            </>
          )}
        </Card>
      </div>

      {/* Alertes */}
      {!isLoadingStats && stats && (stats.overdue_count > 0 || stats.pending_payments > 0) && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Alertes</h2>
          <div className="space-y-4">
            {/* Factures impayées */}
            {stats.overdue_count > 0 && (
              <Card className="p-4 bg-orange-50 border-orange-200">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <ExclamationTriangleIcon className="w-5 h-5 text-orange-600 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {stats.overdue_count} facture{stats.overdue_count > 1 ? 's' : ''} impayée{stats.overdue_count > 1 ? 's' : ''}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Des factures sont en retard de paiement
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/owner/invoicing/overdue')}
                  >
                    Voir les impayés
                  </Button>
                </div>
              </Card>
            )}

            {/* Paiements à valider */}
            {stats.pending_payments > 0 && (
              <Card className="p-4 bg-purple-50 border-purple-200">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <BanknotesIcon className="w-5 h-5 text-purple-600 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {stats.pending_payments} paiement{stats.pending_payments > 1 ? 's' : ''} à valider
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Des paiements sont en attente de validation
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/owner/invoicing/payments')}
                  >
                    Valider
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Actions rapides */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Actions rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Générer factures */}
          <ModuleCard
            module="analytics"
            href="/owner/invoicing/invoices/generate"
            icon={<PlusIcon className="w-5 h-5" strokeWidth={1.5} />}
            title="Générer factures"
            description="Génération mensuelle des factures"
          />

          {/* Enregistrer paiement */}
          <ModuleCard
            module="communication"
            href="/owner/invoicing/payments/new"
            icon={<BanknotesIcon className="w-5 h-5" strokeWidth={1.5} />}
            title="Enregistrer paiement"
            description="Saisir un nouveau paiement"
          />

          {/* Export comptable */}
          <ModuleCard
            module="settings"
            href="/owner/invoicing/exports/new"
            icon={<ArrowDownTrayIcon className="w-5 h-5" strokeWidth={1.5} />}
            title="Export comptable"
            description="Exporter au format FEC ou CSV"
          />
        </div>
      </div>

      {/* Navigation modules */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Factures */}
          <ModuleCard
            module="tasks"
            href="/owner/invoicing/invoices"
            icon={<DocumentTextIcon className="w-5 h-5" strokeWidth={1.5} />}
            title="Factures"
            description="Gérer toutes les factures"
          />

          {/* Paiements */}
          <ModuleCard
            module="users"
            href="/owner/invoicing/payments"
            icon={<BanknotesIcon className="w-5 h-5" strokeWidth={1.5} />}
            title="Paiements"
            description="Historique des paiements"
          />

          {/* Factures impayées */}
          <ModuleCard
            module="calendar"
            href="/owner/invoicing/overdue"
            icon={<ExclamationTriangleIcon className="w-5 h-5" strokeWidth={1.5} />}
            title="Impayés"
            description="Factures en retard"
          />

          {/* Avoirs */}
          <ModuleCard
            module="haccp"
            href="/owner/invoicing/credit-notes"
            icon={<DocumentTextIcon className="w-5 h-5" strokeWidth={1.5} />}
            title="Avoirs"
            description="Remboursements et corrections"
          />

          {/* Périodes */}
          <ModuleCard
            module="clean"
            href="/owner/invoicing/periods"
            icon={<ChartBarIcon className="w-5 h-5" strokeWidth={1.5} />}
            title="Périodes"
            description="Cycles de facturation"
          />

          {/* Exports */}
          <ModuleCard
            module="settings"
            href="/owner/invoicing/exports"
            icon={<ArrowDownTrayIcon className="w-5 h-5" strokeWidth={1.5} />}
            title="Exports"
            description="Exports comptables"
          />
        </div>
      </div>
    </div>
  )
}
