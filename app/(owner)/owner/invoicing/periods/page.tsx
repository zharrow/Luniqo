'use client'

import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { billingPeriodService, type BillingPeriod } from '@/lib/services/billing-period.service'

export default function BillingPeriodsPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery, isLoading: nurseryLoading } = useNursery()

  const [periods, setPeriods] = useState<BillingPeriod[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (selectedNursery?.id) {
      loadPeriods()
    }
  }, [selectedNursery?.id])

  const loadPeriods = async () => {
    if (!selectedNursery?.id) return

    try {
      setIsLoading(true)
      const data = await billingPeriodService.getByNursery(selectedNursery.id)
      setPeriods(data)
    } catch (error) {
      console.error('Error loading periods:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: BillingPeriod['status']) => {
    const config: Record<BillingPeriod['status'], { label: string; variant: any }> = {
      open: { label: 'Ouvert', variant: 'default' },
      closed: { label: 'Clôturé', variant: 'secondary' },
      invoiced: { label: 'Facturé', variant: 'success' },
      finalized: { label: 'Finalisé', variant: 'success' },
    }
    const { label, variant } = config[status]
    return <Badge variant={variant}>{label}</Badge>
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
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-violet-100">
            <CalendarIcon className="w-6 h-6 text-violet-600" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Périodes de facturation</h1>
            <p className="text-sm text-muted-foreground">
              Suivi des périodes mensuelles de facturation
            </p>
          </div>
        </div>
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : periods.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-600 mb-2">Aucune période trouvée</p>
          <p className="text-sm text-gray-500">
            Les périodes sont créées automatiquement lors de la génération des factures
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {periods.map((period) => (
            <Card key={period.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-bold text-lg">
                    {new Date(period.period_start).toLocaleDateString('fr-FR', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                  <p className="text-sm text-gray-500">
                    Du {new Date(period.period_start).toLocaleDateString('fr-FR')} au{' '}
                    {new Date(period.period_end).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                {getStatusBadge(period.status)}
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Factures</span>
                  <span className="font-medium">{period.total_invoices || 0}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Montant total</span>
                  <span className="font-bold">
                    {(period.total_amount || 0).toLocaleString('fr-FR', {
                      style: 'currency',
                      currency: 'EUR',
                    })}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Payé</span>
                  <span className="font-medium text-green-600">
                    {(period.total_paid || 0).toLocaleString('fr-FR', {
                      style: 'currency',
                      currency: 'EUR',
                    })}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Impayés</span>
                  <span className="font-medium text-orange-600">
                    {(period.total_outstanding || 0).toLocaleString('fr-FR', {
                      style: 'currency',
                      currency: 'EUR',
                    })}
                  </span>
                </div>
              </div>

              {period.invoice_generation_date && (
                <div className="mt-4 pt-4 border-t text-xs text-gray-500">
                  Généré le {new Date(period.invoice_generation_date).toLocaleDateString('fr-FR')}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
