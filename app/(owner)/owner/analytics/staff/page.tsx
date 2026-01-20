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
  BarChart,
  PieChart,
  GaugeChart,
  DataTable,
  ExportButton,
} from '@/components/analytics'
import { metricsService } from '@/lib/services/metrics.service'
import { analyticsService } from '@/lib/services/analytics.service'
import {
  UsersIcon,
  ClockIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'

interface StaffMetrics {
  total_active: number
  absenteeism_rate: number
  current_ratio: number
  avg_overtime_hours: number
  turnover_rate: number
}

export default function StaffAnalyticsPage() {
  const { session } = useAuth()
  const { selectedNursery, isLoading: nurseryLoading } = useNursery()

  const [isLoading, setIsLoading] = useState(true)
  const [metrics, setMetrics] = useState<StaffMetrics | null>(null)
  const [absenteeismTrend, setAbsenteeismTrend] = useState<any[]>([])
  const [absencesByType, setAbsencesByType] = useState<any[]>([])
  const [staffHours, setStaffHours] = useState<any[]>([])
  const [ratioCompliance, setRatioCompliance] = useState<any[]>([])

  useEffect(() => {
    if (selectedNursery?.id) {
      loadStaffData()
    }
  }, [selectedNursery?.id])

  async function loadStaffData() {
    if (!selectedNursery?.id) return

    try {
      setIsLoading(true)

      // Load staff metrics
      const today = new Date().toISOString().split('T')[0]
      const startDate = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
      const endDate = today
      const metricsData = await metricsService.getStaffMetrics(
        selectedNursery.id,
        today,
        startDate,
        endDate
      )

      // Combine with mock data for missing fields
      setMetrics({
        total_active: 15, // Mock
        absenteeism_rate: metricsData.absenteeism_rate,
        current_ratio: metricsData.current_ratio,
        avg_overtime_hours: 2.5, // Mock
        turnover_rate: 8.3, // Mock
      })

      // Load current staff ratio
      const currentRatio = await metricsService.calculateStaffRatio(selectedNursery.id, today)

      // Mock data for demonstration
      const mockAbsenteeismTrend = []
      for (let i = 11; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        mockAbsenteeismTrend.push({
          month: date.toLocaleDateString('fr-FR', { month: 'short' }),
          rate: Math.random() * 10 + 3,
        })
      }
      setAbsenteeismTrend(mockAbsenteeismTrend)

      setAbsencesByType([
        { type: 'Maladie', count: 45, percentage: 45 },
        { type: 'Congés', count: 30, percentage: 30 },
        { type: 'Formation', count: 15, percentage: 15 },
        { type: 'Autres', count: 10, percentage: 10 },
      ])

      setStaffHours([
        { employee: 'Marie D', regular: 152, overtime: 8 },
        { employee: 'Sophie L', regular: 152, overtime: 12 },
        { employee: 'Julie M', regular: 152, overtime: 5 },
        { employee: 'Emma R', regular: 152, overtime: 0 },
      ])

      setRatioCompliance([
        { section: 'Bébés', actual: 4.2, required: 5.0, compliant: true },
        { section: 'Moyens', actual: 7.8, required: 8.0, compliant: true },
        { section: 'Grands', actual: 8.5, required: 8.0, compliant: false },
      ])
    } catch (error) {
      console.error('Error loading staff data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (nurseryLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des analytics personnel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/owner/analytics">
            <Button variant="ghost" size="icon">
              <ArrowLeftIcon className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Personnel</h1>
            <p className="text-gray-600">Absentéisme, ratios et heures supplémentaires</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Taux d'Absentéisme"
          value={metrics?.absenteeism_rate?.toFixed(1) || '0'}
          unit="%"
          icon={<ExclamationTriangleIcon className="w-6 h-6" />}
          color="pink"
          reverseColors={true}
        />

        <KPICard
          title="Ratio Encadrement Actuel"
          value={metrics?.current_ratio?.toFixed(2) || '0'}
          unit=":1"
          icon={<UsersIcon className="w-6 h-6" />}
          color="lavender"
        />

        <KPICard
          title="Heures Sup. Moyennes"
          value={metrics?.avg_overtime_hours?.toFixed(0) || '0'}
          unit="h/mois"
          icon={<ClockIcon className="w-6 h-6" />}
          color="peach"
        />

        <KPICard
          title="Employés Actifs"
          value={metrics?.total_active || 0}
          icon={<ChartBarIcon className="w-6 h-6" />}
          color="mint"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LineChart
          title="Évolution du Taux d'Absentéisme"
          subtitle="12 derniers mois"
          data={absenteeismTrend}
          xAxisKey="month"
          lines={[
            {
              dataKey: 'rate',
              name: 'Taux d\'absentéisme (%)',
              color: '#f4c2c2',
              strokeWidth: 3,
            },
          ]}
          height={350}
          formatYAxis={(value) => `${value.toFixed(1)}%`}
        />

        <PieChart
          title="Absences par Type"
          subtitle="Répartition des absences"
          data={absencesByType.map((item) => ({
            name: item.type,
            value: item.count,
          }))}
          height={350}
          colors={['#f4c2c2', '#ffe5b4', '#b5ead7', '#e0b0ff']}
        />

        <BarChart
          title="Heures Travaillées par Employé"
          subtitle="Heures normales vs heures supplémentaires"
          data={staffHours}
          xAxisKey="employee"
          bars={[
            {
              dataKey: 'regular',
              name: 'Heures normales',
              color: '#5a9dc9',
            },
            {
              dataKey: 'overtime',
              name: 'Heures sup.',
              color: '#ffe5b4',
            },
          ]}
          height={350}
          stacked={true}
        />

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Conformité Ratios d'Encadrement</h3>
          <p className="text-sm text-gray-600 mb-6">Ratio actuel vs ratio réglementaire par section</p>

          <div className="space-y-6">
            {ratioCompliance.map((section) => (
              <div key={section.section}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{section.section}</span>
                  <Badge variant={section.compliant ? 'default' : 'destructive'}>
                    {section.compliant ? 'Conforme' : 'Non conforme'}
                  </Badge>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <GaugeChart
                      value={section.actual}
                      max={section.required * 1.2}
                      title=""
                      subtitle={`${section.actual.toFixed(1)} : 1`}
                      colorRanges={[
                        { min: 0, max: section.required, color: '#f4c2c2' },
                        { min: section.required, max: section.required * 1.2, color: '#b5ead7' },
                      ]}
                      height={120}
                    />
                  </div>
                  <div className="text-sm text-gray-600">
                    <div>Requis: {section.required.toFixed(1)} : 1</div>
                    <div>Actuel: {section.actual.toFixed(1)} : 1</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Insights */}
      <Card className="p-6 bg-purple-50 border-purple-200">
        <h3 className="text-lg font-semibold text-purple-900 mb-4">Recommandations RH</h3>
        <div className="space-y-3">
          {metrics && metrics.absenteeism_rate > 8 && (
            <div className="flex items-start gap-3">
              <Badge variant="destructive">Attention</Badge>
              <p className="text-sm text-purple-800">
                Le taux d'absentéisme dépasse 8%. Analysez les causes et mettez en place des actions préventives.
              </p>
            </div>
          )}

          {ratioCompliance.some((s) => !s.compliant) && (
            <div className="flex items-start gap-3">
              <Badge variant="destructive">Non Conformité</Badge>
              <p className="text-sm text-purple-800">
                Une ou plusieurs sections ne respectent pas les ratios réglementaires. Action immédiate requise.
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
