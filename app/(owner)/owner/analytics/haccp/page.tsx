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
  PieChart,
  GaugeChart,
  ExportButton,
} from '@/components/analytics'
import { metricsService } from '@/lib/services/metrics.service'
import {
  CheckCircleIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'

export default function HACCPAnalyticsPage() {
  const { session } = useAuth()
  const { selectedNursery, isLoading: nurseryLoading } = useNursery()

  const [isLoading, setIsLoading] = useState(true)
  const [complianceRate, setComplianceRate] = useState(0)
  const [complianceTrend, setComplianceTrend] = useState<any[]>([])
  const [incidentsByCategory, setIncidentsByCategory] = useState<any[]>([])
  const [temperatureIssues, setTemperatureIssues] = useState<any[]>([])

  useEffect(() => {
    if (selectedNursery?.id) {
      loadHACCPData()
    }
  }, [selectedNursery?.id])

  async function loadHACCPData() {
    if (!selectedNursery?.id) return

    try {
      setIsLoading(true)

      // Load HACCP compliance rate
      const startDate = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
      const endDate = new Date().toISOString().split('T')[0]
      const compliance = await metricsService.calculateHACCPComplianceRate(
        selectedNursery.id,
        startDate,
        endDate
      )
      setComplianceRate(compliance.compliance_rate)

      // Mock data
      const mockTrend = []
      for (let i = 11; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        mockTrend.push({
          month: date.toLocaleDateString('fr-FR', { month: 'short' }),
          compliance: Math.random() * 10 + 85,
        })
      }
      setComplianceTrend(mockTrend)

      setIncidentsByCategory([
        { category: 'Température', count: 12 },
        { category: 'Traçabilité', count: 8 },
        { category: 'Hygiène', count: 5 },
        { category: 'DLC dépassée', count: 3 },
      ])

      setTemperatureIssues([
        { equipment: 'Réfrigérateur 1', issues: 5 },
        { equipment: 'Réfrigérateur 2', issues: 3 },
        { equipment: 'Congélateur', issues: 4 },
      ])
    } catch (error) {
      console.error('Error loading HACCP data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (nurseryLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des analytics HACCP...</p>
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
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-green-100">
            <CheckCircleIcon className="w-6 h-6 text-green-600" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics HACCP & Sécurité</h1>
            <p className="text-sm text-muted-foreground">
              Conformité, incidents et traçabilité alimentaire
            </p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LineChart
          title="Évolution de la Conformité"
          subtitle="12 derniers mois"
          data={complianceTrend}
          xAxisKey="month"
          lines={[
            {
              dataKey: 'compliance',
              name: 'Taux de conformité (%)',
              color: '#b5ead7',
              strokeWidth: 3,
            },
          ]}
          height={350}
          formatYAxis={(value) => `${value.toFixed(0)}%`}
        />

        <PieChart
          title="Incidents par Catégorie"
          subtitle="Répartition des non-conformités"
          data={incidentsByCategory.map((item) => ({
            name: item.category,
            value: item.count,
          }))}
          height={350}
          colors={['#f4c2c2', '#ffe5b4', '#b5ead7', '#e0b0ff']}
        />

        <BarChart
          title="Problèmes de Température par Équipement"
          subtitle="Nombre d'alertes ce mois"
          data={temperatureIssues}
          xAxisKey="equipment"
          bars={[
            {
              dataKey: 'issues',
              name: 'Alertes',
              color: '#f4c2c2',
            },
          ]}
          height={350}
        />

        <Card className="p-6 bg-mint-50 border-green-200">
          <h3 className="text-lg font-semibold text-green-900 mb-4">Recommandations HACCP</h3>
          <div className="space-y-3">
            {complianceRate < 95 && (
              <div className="flex items-start gap-3">
                <Badge variant="destructive">Action Requise</Badge>
                <p className="text-sm text-green-800">
                  Le taux de conformité est inférieur à 95%. Renforcez les contrôles quotidiens.
                </p>
              </div>
            )}
            {incidentsByCategory.find((i) => i.category === 'Température')?.count > 5 && (
              <div className="flex items-start gap-3">
                <Badge className="bg-orange-500">Attention</Badge>
                <p className="text-sm text-green-800">
                  Nombreux incidents de température. Vérifiez l'état des équipements frigorifiques.
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
