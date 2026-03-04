'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  LineChart,
  BarChart,
  AreaChart,
  AgingTable,
  RankingList,
  ExportButton,
  MetricComparison,
} from '@/components/analytics'
import { metricsService } from '@/lib/services/metrics.service'
import { analyticsService } from '@/lib/services/analytics.service'
import {
  CurrencyEuroIcon,
  ClockIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'

interface FinancialMetrics {
  mrr: number
  arr: number
  collection_rate: number
  outstanding_amount: number
}

export default function FinancialAnalyticsPage() {
  const { session } = useAuth()
  const { selectedNursery, isLoading: nurseryLoading } = useNursery()

  const [isLoading, setIsLoading] = useState(true)

  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null)
  const [revenueTrend, setRevenueTrend] = useState<any[]>([])
  const [revenueByType, setRevenueByType] = useState<any[]>([])
  const [predictions, setPredictions] = useState<any[]>([])
  const [agingData, setAgingData] = useState<any[]>([])
  const [topFamilies, setTopFamilies] = useState<any[]>([])
  const [lastMonthMRR, setLastMonthMRR] = useState<number>(0)

  useEffect(() => {
    if (selectedNursery?.id) {
      loadFinancialData()
    }
  }, [selectedNursery?.id])

  async function loadFinancialData() {
    if (!selectedNursery?.id) return

    try {
      setIsLoading(true)

      // Load financial metrics
      const startDate = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
      const endDate = new Date().toISOString().split('T')[0]
      const metricsData = await metricsService.getFinancialMetrics(
        selectedNursery.id,
        startDate,
        endDate
      )
      setMetrics(metricsData)

      // Load revenue trend (12 months)
      const trend = await analyticsService.getRevenueTrend(selectedNursery.id, 12)
      setRevenueTrend(trend)

      // Load last month MRR for comparison
      const today = new Date()
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const lastMonthMRRValue = await metricsService.calculateMRR(
        selectedNursery.id,
        lastMonth.toISOString().slice(0, 7)
      )
      setLastMonthMRR(lastMonthMRRValue)

      // Load revenue by contract type (current year)
      const yearStartDate = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
      const yearEndDate = new Date().toISOString().split('T')[0]
      const revenueData = await metricsService.getRevenueByContractType(
        selectedNursery.id,
        yearStartDate,
        yearEndDate
      )
      setRevenueByType(revenueData)

      // Load predictions (next 3 months)
      const pred = await analyticsService.getPrediction(selectedNursery.id, 'revenue', 3)
      setPredictions(pred)

      // Load aging receivables
      const aging = await analyticsService.getInvoiceAgingReport(selectedNursery.id)
      setAgingData(aging)

      // Load top 10 families by revenue (mock data - would need dedicated query)
      // For now, we'll use a simplified version
      setTopFamilies([])
    } catch (error) {
      console.error('Error loading financial data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleExport(format: 'pdf' | 'excel' | 'csv') {
    if (!selectedNursery?.id || !metrics) return

    try {
      // Create CSV data from current metrics
      const csvData = [
        ['Métrique', 'Valeur'],
        ['MRR', `${metrics.mrr} €`],
        ['ARR', `${metrics.arr} €`],
        ['Taux de Recouvrement', `${metrics.collection_rate}%`],
        ['Créances en Cours', `${metrics.outstanding_amount} €`],
      ]

      const csvString = csvData.map(row => row.join(',')).join('\n')
      const blob = new Blob([csvString], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `financial-analytics-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting report:', error)
    }
  }

  if (nurseryLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des analytics financières...</p>
        </div>
      </div>
    )
  }

  const mrrChange = lastMonthMRR > 0 ? ((metrics?.mrr || 0) - lastMonthMRR) / lastMonthMRR * 100 : 0

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/owner/analytics">
            <Button variant="ghost" size="icon">
              <ArrowLeftIcon className="w-5 h-5" />
            </Button>
          </Link>
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100">
            <CurrencyEuroIcon className="w-6 h-6 text-blue-600" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics Financières</h1>
            <p className="text-sm text-muted-foreground">
              Revenue, trésorerie et indicateurs financiers
            </p>
          </div>
        </div>

        <ExportButton
          formats={['pdf', 'excel', 'csv']}
          onExport={handleExport}
        />
      </div>

      {/* Outstanding Amount Alert */}
      {metrics && metrics.outstanding_amount > 0 && (
        <Card className="p-4 bg-pink-50 border-pink-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
                <ClockIcon className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <p className="font-semibold text-pink-900">
                  Créances en cours
                </p>
                <p className="text-sm text-pink-700">
                  Montant total: {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(metrics.outstanding_amount)}
                </p>
              </div>
            </div>
            <Link href="/owner/invoices">
              <Button variant="outline" size="sm">
                Voir les factures
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* MRR Comparison */}
      <MetricComparison
        title="Comparaison MRR"
        currentPeriod={{
          label: "Ce mois",
          value: metrics?.mrr || 0,
          unit: "€"
        }}
        previousPeriod={{
          label: "Mois dernier",
          value: lastMonthMRR,
          unit: "€"
        }}
        color="blue"
      />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <LineChart
          title="Évolution du Revenue Mensuel"
          subtitle="12 derniers mois"
          data={revenueTrend}
          xAxisKey="month"
          lines={[
            {
              dataKey: 'total',
              name: 'Revenue (€)',
              color: '#5a9dc9',
              strokeWidth: 3,
            },
          ]}
          height={350}
          formatYAxis={(value) => `${(value / 1000).toFixed(0)}k€`}
          formatTooltip={(value) => `${new Intl.NumberFormat('fr-FR').format(value)} €`}
        />

        {/* Revenue by Contract Type */}
        <BarChart
          title="Revenue par Type de Contrat"
          subtitle="Répartition du revenue annuel"
          data={revenueByType.map((item) => ({
            type: item.contract_type === 'PSU' ? 'PSU' : item.contract_type === 'PAJE' ? 'PAJE' : 'Privé',
            revenue: item.total_revenue,
            count: item.contract_count,
          }))}
          xAxisKey="type"
          bars={[
            {
              dataKey: 'revenue',
              name: 'Revenue (€)',
              color: '#5a9dc9',
            },
          ]}
          height={350}
          formatYAxis={(value) => `${(value / 1000).toFixed(0)}k€`}
        />

        {/* Revenue with Predictions */}
        <AreaChart
          title="Revenue et Prévisions"
          subtitle="3 prochains mois (prévisions basées sur historique)"
          data={[
            ...revenueTrend.slice(-3),
            ...predictions,
          ]}
          xAxisKey="period"
          areas={[
            {
              dataKey: 'actual',
              name: 'Revenue Réel',
              color: '#5a9dc9',
              fillOpacity: 0.6,
            },
            {
              dataKey: 'predicted',
              name: 'Prévision',
              color: '#e0b0ff',
              fillOpacity: 0.4,
            },
          ]}
          height={350}
          formatYAxis={(value) => `${(value / 1000).toFixed(0)}k€`}
        />

        {/* Aging Receivables */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Créances par Ancienneté</h3>
          <p className="text-sm text-gray-600 mb-4">Répartition des factures impayées</p>

          {agingData.length > 0 ? (
            <AgingTable
              buckets={agingData.map((bucket: any) => ({
                label: bucket.bucket,
                range: bucket.bucket,
                count: bucket.count || 0,
                amount: bucket.total_amount || 0,
                percentage: bucket.percentage || 0,
              }))}
            />
          ) : (
            <div className="text-center py-8 text-gray-500">
              Aucune créance en cours
            </div>
          )}
        </Card>
      </div>

      {/* Top Families by Revenue */}
      {topFamilies.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Familles par Revenue</h3>
          <p className="text-sm text-gray-600 mb-4">Classement des familles générant le plus de revenue</p>

          <RankingList
            items={topFamilies.map((family, index) => ({
              rank: index + 1,
              label: family.family_name,
              value: family.total_revenue,
              subLabel: `${family.children_count} enfant${family.children_count > 1 ? 's' : ''}`,
            }))}
            unit="€"
          />
        </Card>
      )}

      {/* Insights & Recommendations */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Recommandations Financières</h3>
        <div className="space-y-3">
          {metrics && metrics.collection_rate < 90 && (
            <div className="flex items-start gap-3">
              <Badge variant="destructive">Action Requise</Badge>
              <p className="text-sm text-blue-800">
                Votre taux de recouvrement est inférieur à 90%. Considérez l'automatisation des relances pour améliorer ce ratio.
              </p>
            </div>
          )}

          {metrics && metrics.outstanding_amount > 10000 && (
            <div className="flex items-start gap-3">
              <Badge className="bg-orange-500">Attention</Badge>
              <p className="text-sm text-blue-800">
                Montant important de créances en cours. Assurez-vous de suivre les paiements de près.
              </p>
            </div>
          )}

          {mrrChange > 10 && (
            <div className="flex items-start gap-3">
              <Badge className="bg-green-500">Positif</Badge>
              <p className="text-sm text-blue-800">
                Excellente croissance du MRR (+{mrrChange.toFixed(1)}%) ! Maintenez cette trajectoire.
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
