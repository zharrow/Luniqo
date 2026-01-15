'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  KPICard,
  LineChart,
  HeatMap,
  BarChart,
  RankingList,
} from '@/components/analytics'
import { metricsService } from '@/lib/services/metrics.service'
import {
  UsersIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  HeartIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'

export default function ParentsAnalyticsPage() {
  const { session } = useAuth()
  const { selectedNursery, isLoading: nurseryLoading } = useNursery()

  const [isLoading, setIsLoading] = useState(true)
  const [engagementRate, setEngagementRate] = useState(0)
  const [avgResponseTime, setAvgResponseTime] = useState(0)
  const [engagementTrend, setEngagementTrend] = useState<any[]>([])
  const [connectionHeatmap, setConnectionHeatmap] = useState<any[]>([])
  const [topPosts, setTopPosts] = useState<any[]>([])

  useEffect(() => {
    if (selectedNursery?.id) {
      loadParentsData()
    }
  }, [selectedNursery?.id])

  async function loadParentsData() {
    if (!selectedNursery?.id) return

    try {
      setIsLoading(true)

      // Calculate date range (last 30 days)
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]

      // Load parent engagement rate
      const engagementMetric = await metricsService.calculateParentEngagementRate(
        selectedNursery.id,
        startDate,
        endDate
      )
      setEngagementRate(engagementMetric.engagement_rate)

      // Load average response time
      const responseTime = await metricsService.calculateAvgMessageResponseTime(
        selectedNursery.id,
        startDate,
        endDate
      )
      setAvgResponseTime(responseTime)

      // Mock data
      const mockTrend = []
      for (let i = 11; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        mockTrend.push({
          month: date.toLocaleDateString('fr-FR', { month: 'short' }),
          rate: Math.random() * 20 + 60,
        })
      }
      setEngagementTrend(mockTrend)

      // Mock heatmap data
      const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
      const hours = Array.from({ length: 24 }, (_, i) => i)
      const heatmapData: Array<{ x: string; y: string; value: number }> = []
      days.forEach((day) => {
        hours.forEach((hour) => {
          heatmapData.push({
            x: `${hour}h`,
            y: day,
            value: Math.random() * 100,
          })
        })
      })
      setConnectionHeatmap(heatmapData)

      setTopPosts([
        { title: 'Sortie au parc', reactions: 145, comments: 23 },
        { title: 'Atelier peinture', reactions: 132, comments: 19 },
        { title: 'Anniversaire de Marie', reactions: 98, comments: 15 },
      ])
    } catch (error) {
      console.error('Error loading parents data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (nurseryLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des analytics parents...</p>
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Portail Parents</h1>
            <p className="text-gray-600">Engagement, utilisation et satisfaction</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Taux d'Engagement"
          value={engagementRate.toFixed(1)}
          unit="%"
          icon={<UsersIcon className="w-6 h-6" />}
          color="turquoise"
        />

        <KPICard
          title="Temps de Réponse Moyen"
          value={avgResponseTime.toFixed(1)}
          unit="heures"
          icon={<ClockIcon className="w-6 h-6" />}
          color="peach"
          reverseColors={true}
        />

        <KPICard
          title="Messages ce Mois"
          value="487"
          icon={<ChatBubbleLeftRightIcon className="w-6 h-6" />}
          color="lavender"
        />

        <KPICard
          title="Réactions Timeline"
          value="1,245"
          icon={<HeartIcon className="w-6 h-6" />}
          color="pink"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LineChart
          title="Évolution de l'Engagement"
          subtitle="12 derniers mois"
          data={engagementTrend}
          xAxisKey="month"
          lines={[
            {
              dataKey: 'rate',
              name: 'Taux d\'engagement (%)',
              color: '#a0d8d8',
              strokeWidth: 3,
            },
          ]}
          height={350}
          formatYAxis={(value) => `${value.toFixed(0)}%`}
        />

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Posts Timeline les Plus Populaires</h3>
          <p className="text-sm text-gray-600 mb-4">Top 3 des posts avec le plus de réactions</p>

          <RankingList
            items={topPosts.map((post, index) => ({
              rank: index + 1,
              label: post.title,
              value: post.reactions,
              subLabel: `${post.comments} commentaires`,
            }))}
            unit="réactions"
          />
        </Card>

        <div className="lg:col-span-2">
          <HeatMap
            title="Heures de Connexion au Portail"
            subtitle="Activité des parents par jour et heure"
            data={connectionHeatmap}
            xLabels={Array.from({ length: 24 }, (_, i) => `${i}h`)}
            yLabels={['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']}
            minColor="#e0f7fa"
            maxColor="#006064"
          />
        </div>
      </div>
    </div>
  )
}
