'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  LineChart,
  BarChart,
  PieChart,
  GaugeChart,
  DashboardGrid,
  WidgetCard,
  WidgetPicker,
} from '@/components/analytics'
import { metricsService } from '@/lib/services/metrics.service'
import { analyticsService } from '@/lib/services/analytics.service'
import { dashboardService, type DashboardWidget } from '@/lib/services/dashboard.service'
import {
  ChartBarIcon,
  CurrencyEuroIcon,
  UserGroupIcon,
  CheckCircleIcon,
  UsersIcon,
  InboxIcon,
  Cog6ToothIcon,
  PlusIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'

type TimePeriod = 'day' | 'week' | 'month' | 'year'

interface DashboardSummary {
  occupancy_rate: number
  monthly_revenue: number
  staff_ratio: number
  haccp_compliance: number
  parent_engagement: number
  overdue_invoices_count: number
  overdue_invoices_amount: number
}

export default function AnalyticsDashboardPage() {
  const { session } = useAuth()
  const { selectedNursery, isLoading: nurseryLoading } = useNursery()

  const [period, setPeriod] = useState<TimePeriod>('month')
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showWidgetPicker, setShowWidgetPicker] = useState(false)
  const [isCustomizing, setIsCustomizing] = useState(false)

  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [occupancyTrend, setOccupancyTrend] = useState<any[]>([])
  const [revenueTrend, setRevenueTrend] = useState<any[]>([])
  const [childrenBySection, setChildrenBySection] = useState<any[]>([])
  const [insights, setInsights] = useState<any[]>([])
  const [widgets, setWidgets] = useState<DashboardWidget[]>([])

  useEffect(() => {
    if (selectedNursery?.id && session?.user?.id) {
      loadDashboardData()
    }
  }, [selectedNursery?.id, session?.user?.id, period])

  async function loadDashboardData() {
    if (!selectedNursery?.id || !session?.user?.id) return

    try {
      setIsLoading(true)

      // Load dashboard configuration
      const dashboardConfig = await dashboardService.getDashboardConfig(session.user.id, selectedNursery.id)
      if (dashboardConfig.length === 0) {
        // Create default dashboard if none exists
        await dashboardService.createDefaultDashboard(session.user.id, selectedNursery.id)
        const newConfig = await dashboardService.getDashboardConfig(session.user.id, selectedNursery.id)
        setWidgets(newConfig)
      } else {
        setWidgets(dashboardConfig)
      }

      // Load KPI summary
      const today = new Date().toISOString().split('T')[0]
      const summaryData = await metricsService.getDashboardSummary(selectedNursery.id, today)
      setSummary(summaryData)

      // Load occupancy trend (last 12 periods)
      const months = period === 'year' ? 12 : period === 'month' ? 12 : period === 'week' ? 12 : 7
      const occTrend = await analyticsService.getOccupancyTrend(selectedNursery.id, months)
      setOccupancyTrend(occTrend)

      // Load revenue trend
      const revTrend = await analyticsService.getRevenueTrend(selectedNursery.id, months)
      setRevenueTrend(revTrend)

      // Load children by section
      const childrenData = await analyticsService.getChildrenBySection(selectedNursery.id)
      setChildrenBySection(childrenData)

      // Load insights
      const insightsData = await analyticsService.getInsights(selectedNursery.id)
      setInsights(insightsData.slice(0, 5)) // Top 5 insights
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true)
    await loadDashboardData()
    setIsRefreshing(false)
  }

  async function handleAddWidget(widgetType: string) {
    if (!session?.user?.id || !selectedNursery?.id) return

    try {
      const newWidget = await dashboardService.addWidget(session.user.id, selectedNursery.id, {
        widget_type: widgetType as any,
        title: getWidgetTitle(widgetType),
        position_x: 0,
        position_y: widgets.length,
        width: 6,
        height: 4,
        config: {},
      })

      setWidgets([...widgets, newWidget])
      setShowWidgetPicker(false)
    } catch (error) {
      console.error('Error adding widget:', error)
    }
  }

  async function handleRemoveWidget(widgetId: string) {
    try {
      await dashboardService.removeWidget(widgetId)
      setWidgets(widgets.filter((w) => w.id !== widgetId))
    } catch (error) {
      console.error('Error removing widget:', error)
    }
  }

  function getWidgetTitle(type: string): string {
    const titles: Record<string, string> = {
      KPI_CARD: 'Carte KPI',
      LINE_CHART: 'Graphique Lignes',
      BAR_CHART: 'Graphique Barres',
      PIE_CHART: 'Graphique Secteurs',
      AREA_CHART: 'Graphique Aires',
      GAUGE_CHART: 'Jauge',
      TABLE: 'Tableau',
      METRIC_COMPARISON: 'Comparaison Métriques',
    }
    return titles[type] || type
  }

  if (nurseryLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des analytics...</p>
        </div>
      </div>
    )
  }

  if (!selectedNursery) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6 max-w-md text-center">
          <InboxIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune crèche sélectionnée</h3>
          <p className="text-gray-600 mb-4">
            Veuillez sélectionner une crèche pour voir les analytics.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-100">
            <ChartBarIcon className="w-6 h-6 text-indigo-600" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            <p className="text-sm text-muted-foreground">
              Vue d'ensemble des indicateurs clés de performance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Period selector */}
          <Select value={period} onValueChange={(value) => setPeriod(value as TimePeriod)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Aujourd'hui</SelectItem>
              <SelectItem value="week">Cette semaine</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
              <SelectItem value="year">Cette année</SelectItem>
            </SelectContent>
          </Select>

          {/* Refresh button */}
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <ArrowPathIcon className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>

          {/* Customize button */}
          <Button
            variant={isCustomizing ? 'default' : 'outline'}
            onClick={() => setIsCustomizing(!isCustomizing)}
          >
            <Cog6ToothIcon className="w-4 h-4 mr-2" />
            {isCustomizing ? 'Terminer' : 'Personnaliser'}
          </Button>

          {isCustomizing && (
            <Button onClick={() => setShowWidgetPicker(true)}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Ajouter Widget
            </Button>
          )}
        </div>
      </div>

      {/* Insights Banner */}
      {insights.length > 0 && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <ChartBarIcon className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-2">Insights Automatiques</h3>
              <div className="space-y-2">
                {insights.map((insight, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <Badge variant={insight.severity === 'critical' ? 'destructive' : 'default'}>
                      {insight.category}
                    </Badge>
                    <span className="text-blue-800">{insight.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Occupancy Trend */}
        <LineChart
          title="Évolution de l'Occupation"
          subtitle="Taux d'occupation sur les 12 derniers mois"
          data={occupancyTrend}
          xAxisKey="period"
          lines={[
            {
              dataKey: 'rate',
              name: 'Taux d\'occupation (%)',
              color: '#b5ead7',
              strokeWidth: 3,
            },
          ]}
          height={300}
          formatYAxis={(value) => `${value}%`}
          formatTooltip={(value) => `${value.toFixed(1)}%`}
        />

        {/* Revenue Trend */}
        <LineChart
          title="Évolution du Revenue"
          subtitle="Revenue mensuel sur les 12 derniers mois"
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
          height={300}
          formatYAxis={(value) => `${(value / 1000).toFixed(0)}k€`}
          formatTooltip={(value) => `${new Intl.NumberFormat('fr-FR').format(value)} €`}
        />

        {/* Children by Section */}
        <PieChart
          title="Répartition des Enfants par Section"
          subtitle="Nombre d'enfants actifs par section"
          data={childrenBySection.map((section) => ({
            name: section.section_name,
            value: section.child_count,
          }))}
          height={300}
          colors={['#5a9dc9', '#f4c2c2', '#ffe5b4', '#b5ead7', '#e0b0ff', '#d4f1a5']}
        />

        {/* Occupancy by Section */}
        <BarChart
          title="Occupation par Section"
          subtitle="Taux d'occupation actuel de chaque section"
          data={childrenBySection.map((section) => ({
            section: section.section_name,
            occupation: section.occupancy_rate,
            capacite: section.capacity,
          }))}
          xAxisKey="section"
          bars={[
            {
              dataKey: 'occupation',
              name: 'Taux d\'occupation (%)',
              color: '#5a9dc9',
            },
          ]}
          height={300}
          formatYAxis={(value) => `${value}%`}
        />
      </div>

      {/* Quick Links */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Analytics Détaillées</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Link href="/owner/analytics/financial">
            <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2">
              <CurrencyEuroIcon className="w-8 h-8 text-blue-600" />
              <span className="text-sm font-medium">Finances</span>
            </Button>
          </Link>

          <Link href="/owner/analytics/children">
            <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2">
              <UserGroupIcon className="w-8 h-8 text-pink-600" />
              <span className="text-sm font-medium">Enfants</span>
            </Button>
          </Link>

          <Link href="/owner/analytics/staff">
            <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2">
              <UsersIcon className="w-8 h-8 text-purple-600" />
              <span className="text-sm font-medium">Personnel</span>
            </Button>
          </Link>

          <Link href="/owner/analytics/haccp">
            <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2">
              <CheckCircleIcon className="w-8 h-8 text-green-600" />
              <span className="text-sm font-medium">HACCP</span>
            </Button>
          </Link>

          <Link href="/owner/analytics/parents">
            <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2">
              <ChartBarIcon className="w-8 h-8 text-cyan-600" />
              <span className="text-sm font-medium">Parents</span>
            </Button>
          </Link>

          <Link href="/owner/analytics/reports">
            <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2">
              <InboxIcon className="w-8 h-8 text-orange-600" />
              <span className="text-sm font-medium">Rapports</span>
            </Button>
          </Link>
        </div>
      </Card>

      {/* Widget Picker Modal */}
      <WidgetPicker
        open={showWidgetPicker}
        onSelectWidget={handleAddWidget}
        onClose={() => setShowWidgetPicker(false)}
        availableWidgets={[
          {
            id: 'KPI_CARD',
            name: 'Carte KPI',
            description: 'Afficher une métrique clé',
            category: 'general',
            icon: ChartBarIcon,
            size: 'small',
          },
          {
            id: 'LINE_CHART',
            name: 'Graphique Lignes',
            description: 'Évolution dans le temps',
            category: 'general',
            icon: ChartBarIcon,
            size: 'medium',
          },
          {
            id: 'BAR_CHART',
            name: 'Graphique Barres',
            description: 'Comparaison de valeurs',
            category: 'general',
            icon: ChartBarIcon,
            size: 'medium',
          },
          {
            id: 'PIE_CHART',
            name: 'Graphique Secteurs',
            description: 'Répartition en pourcentages',
            category: 'general',
            icon: ChartBarIcon,
            size: 'medium',
          },
        ]}
        selectedWidgetIds={widgets.map((w) => w.widget_type)}
      />
    </div>
  )
}
