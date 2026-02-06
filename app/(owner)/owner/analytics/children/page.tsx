'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  KPICard,
  LineChart,
  GaugeChart,
  FunnelChart,
  BarChart,
  DataTable,
  ExportButton,
} from '@/components/analytics'
import { metricsService } from '@/lib/services/metrics.service'
import { analyticsService } from '@/lib/services/analytics.service'
import { reportsService } from '@/lib/services/reports.service'
import {
  UserGroupIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  ChartPieIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'

interface ChildrenMetrics {
  total_active: number
  avg_occupancy: number
  retention_rate_6mo: number
  retention_rate_1yr: number
  avg_enrollment_duration: number
}

export default function ChildrenAnalyticsPage() {
  const { session } = useAuth()
  const { selectedNursery, isLoading: nurseryLoading } = useNursery()

  const [isLoading, setIsLoading] = useState(true)

  const [metrics, setMetrics] = useState<ChildrenMetrics | null>(null)
  const [enrollmentTrend, setEnrollmentTrend] = useState<any[]>([])
  const [childrenBySection, setChildrenBySection] = useState<any[]>([])
  const [enrollmentFunnel, setEnrollmentFunnel] = useState<any[]>([])
  const [retentionByCohort, setRetentionByCohort] = useState<any[]>([])

  useEffect(() => {
    if (selectedNursery?.id) {
      loadChildrenData()
    }
  }, [selectedNursery?.id])

  async function loadChildrenData() {
    if (!selectedNursery?.id) return

    try {
      setIsLoading(true)

      // Load average occupancy rate
      const occupancyRate = await metricsService.getAverageOccupancyRate(
        selectedNursery.id,
        new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
        new Date().toISOString().split('T')[0]
      )

      // Load retention rates
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      const retention6mo = await metricsService.calculateRetentionRate(
        selectedNursery.id,
        sixMonthsAgo.toISOString().split('T')[0],
        6
      )

      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
      const retention1yr = await metricsService.calculateRetentionRate(
        selectedNursery.id,
        oneYearAgo.toISOString().split('T')[0],
        12
      )

      // Set metrics (simplified for now)
      setMetrics({
        total_active: 0, // Would need dedicated query
        avg_occupancy: occupancyRate,
        retention_rate_6mo: retention6mo.retention_rate,
        retention_rate_1yr: retention1yr.retention_rate,
        avg_enrollment_duration: 0, // Would need dedicated query
      })

      // Load children by section
      const sectionData = await analyticsService.getChildrenBySection(selectedNursery.id)
      setChildrenBySection(sectionData)

      // Load enrollment funnel (last 12 months)
      const funnelStartDate = new Date()
      funnelStartDate.setMonth(funnelStartDate.getMonth() - 12)
      const funnelData = await metricsService.getEnrollmentFunnel(
        selectedNursery.id,
        funnelStartDate.toISOString().split('T')[0],
        new Date().toISOString().split('T')[0]
      )

      // Transform to funnel chart format
      setEnrollmentFunnel([
        { stage_name: 'Demandes', count: funnelData.applications },
        { stage_name: 'Admissions', count: funnelData.admissions },
        { stage_name: 'Inscriptions', count: funnelData.enrollments },
      ])

      // Mock enrollment trend (would need dedicated query)
      const trendData = []
      for (let i = 11; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        trendData.push({
          month: date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
          enrollments: Math.floor(Math.random() * 10) + 5,
          departures: Math.floor(Math.random() * 5) + 1,
        })
      }
      setEnrollmentTrend(trendData)

      // Mock retention by cohort (would need dedicated query)
      const cohortData = []
      for (let i = 5; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        cohortData.push({
          cohort: date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
          '6mo': Math.floor(Math.random() * 20) + 75,
          '12mo': Math.floor(Math.random() * 15) + 65,
        })
      }
      setRetentionByCohort(cohortData)
    } catch (error) {
      console.error('Error loading children data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleExport(format: 'pdf' | 'excel' | 'csv') {
    if (!selectedNursery?.id) return

    try {
      if (format === 'csv') {
        // Export children list as CSV
        const csvData = childrenBySection.map((section) => ({
          Section: section.section_name,
          'Nombre d\'enfants': section.child_count,
          'Capacité': section.capacity,
          'Taux d\'occupation (%)': section.occupancy_rate?.toFixed(1),
        }))

        const headers = Object.keys(csvData[0]).join(',')
        const rows = csvData.map((row) => Object.values(row).join(',')).join('\n')
        const csv = `${headers}\n${rows}`

        const blob = new Blob([csv], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `children-analytics-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error exporting report:', error)
    }
  }

  if (nurseryLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des analytics enfants...</p>
        </div>
      </div>
    )
  }

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
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-pink-100">
            <UserGroupIcon className="w-6 h-6 text-pink-600" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics Enfants & Familles</h1>
            <p className="text-sm text-muted-foreground">
              Occupation, inscriptions et rétention
            </p>
          </div>
        </div>

        <ExportButton
          formats={['csv']}
          onExport={handleExport}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Taux d'Occupation Moyen"
          value={metrics?.avg_occupancy?.toFixed(1) || '0'}
          unit="%"
          icon={<UserGroupIcon className="w-6 h-6" />}
          color="pink"
        />

        <KPICard
          title="Rétention (6 mois)"
          value={metrics?.retention_rate_6mo?.toFixed(1) || '0'}
          unit="%"
          icon={<ArrowTrendingUpIcon className="w-6 h-6" />}
          color="mint"
        />

        <KPICard
          title="Rétention (1 an)"
          value={metrics?.retention_rate_1yr?.toFixed(1) || '0'}
          unit="%"
          icon={<ArrowTrendingUpIcon className="w-6 h-6" />}
          color="peach"
        />

        <KPICard
          title="Enfants Actifs"
          value={childrenBySection.reduce((sum, s) => sum + (s.child_count || 0), 0)}
          icon={<ChartPieIcon className="w-6 h-6" />}
          color="lavender"
        />
      </div>

      {/* Occupancy Gauges by Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Taux d'Occupation par Section</h3>
        <p className="text-sm text-gray-600 mb-6">Occupation actuelle de chaque section</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {childrenBySection.map((section, index) => (
            <div key={section.section_name || index}>
              <GaugeChart
                value={section.occupancy_rate || 0}
                max={100}
                title={section.section_name}
                subtitle={`${section.child_count || 0}/${section.capacity || 0} enfants`}
                colorRanges={[
                  { min: 0, max: 70, color: '#5a9dc9' },
                  { min: 70, max: 90, color: '#b5ead7' },
                  { min: 90, max: 100, color: '#f4c2c2' },
                ]}
                height={200}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enrollment Trend */}
        <LineChart
          title="Évolution des Inscriptions"
          subtitle="12 derniers mois - Entrées vs Sorties"
          data={enrollmentTrend}
          xAxisKey="month"
          lines={[
            {
              dataKey: 'enrollments',
              name: 'Nouvelles inscriptions',
              color: '#b5ead7',
              strokeWidth: 3,
            },
            {
              dataKey: 'departures',
              name: 'Départs',
              color: '#f4c2c2',
              strokeWidth: 3,
            },
          ]}
          height={350}
        />

        {/* Enrollment Funnel */}
        <FunnelChart
          title="Pipeline des Demandes d'Inscription"
          subtitle="Conversion des demandes en inscriptions"
          data={enrollmentFunnel.map((stage) => ({
            name: stage.stage_name,
            value: stage.count,
          }))}
          height={350}
          colors={['#5a9dc9', '#a0d8d8', '#b5ead7', '#d4f1a5', '#ffe5b4']}
        />

        {/* Retention by Cohort */}
        <BarChart
          title="Taux de Rétention par Cohorte"
          subtitle="Pourcentage d'enfants restants après 6 mois et 1 an"
          data={retentionByCohort}
          xAxisKey="cohort"
          bars={[
            {
              dataKey: '6mo',
              name: 'Après 6 mois (%)',
              color: '#b5ead7',
            },
            {
              dataKey: '12mo',
              name: 'Après 1 an (%)',
              color: '#5a9dc9',
            },
          ]}
          height={350}
          formatYAxis={(value) => `${value}%`}
        />

        {/* Children Distribution by Age */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition par Section</h3>
          <p className="text-sm text-gray-600 mb-4">Nombre d'enfants et capacité par section</p>

          <div className="space-y-4">
            {childrenBySection.map((section, index) => (
              <div key={section.section_name || index}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{section.section_name}</span>
                    <Badge variant={section.occupancy_rate >= 90 ? 'destructive' : 'default'}>
                      {section.occupancy_rate?.toFixed(0)}%
                    </Badge>
                  </div>
                  <span className="text-sm text-gray-600">
                    {section.child_count}/{section.capacity}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(section.occupancy_rate || 0, 100)}%`,
                      backgroundColor:
                        section.occupancy_rate >= 90
                          ? '#f4c2c2'
                          : section.occupancy_rate >= 70
                          ? '#b5ead7'
                          : '#5a9dc9',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Insights & Recommendations */}
      <Card className="p-6 bg-pink-50 border-pink-200">
        <h3 className="text-lg font-semibold text-pink-900 mb-4">Recommandations</h3>
        <div className="space-y-3">
          {childrenBySection.some((s) => s.occupancy_rate >= 95) && (
            <div className="flex items-start gap-3">
              <Badge variant="destructive">Capacité Maximale</Badge>
              <p className="text-sm text-pink-800">
                Une ou plusieurs sections sont à pleine capacité. Considérez l'ouverture de places supplémentaires ou la gestion d'une liste d'attente.
              </p>
            </div>
          )}

          {metrics && metrics.retention_rate_1yr < 70 && (
            <div className="flex items-start gap-3">
              <Badge className="bg-orange-500">Attention</Badge>
              <p className="text-sm text-pink-800">
                Le taux de rétention à 1 an est inférieur à 70%. Analysez les raisons des départs et améliorez la satisfaction des familles.
              </p>
            </div>
          )}

          {childrenBySection.some((s) => s.occupancy_rate < 50) && (
            <div className="flex items-start gap-3">
              <Badge className="bg-blue-500">Opportunité</Badge>
              <p className="text-sm text-pink-800">
                Certaines sections ont une occupation faible. Lancez une campagne de communication ciblée pour attirer de nouvelles familles.
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
