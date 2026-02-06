'use client'

import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
// TODO: Implement server actions for data fetching
// import { attendanceService } from '@/lib/services/attendance.service'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Download, TrendingUp, Users, Clock, AlertCircle, CheckCircle } from 'lucide-react'

export default function OwnerAttendanceReportsPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery, isLoading: nurseryLoading } = useNursery()
  const [weeklyStats, setWeeklyStats] = useState<any>(null)
  const [monthlyStats, setMonthlyStats] = useState<any>(null)
  const [recentAttendances, setRecentAttendances] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('week')

  // TODO: Implement data fetching via server actions
  // useEffect(() => {
  //   if (selectedNursery?.id) {
  //     loadReports()
  //   }
  // }, [selectedNursery?.id, selectedPeriod])

  // async function loadReports() {
  //   if (!selectedNursery?.id) return
  //   try {
  //     setIsLoading(true)
  //     setError(null)
  //     const today = new Date()
  //     const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  //     const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
  //
  //     const weekly = await attendanceService.getStatistics(
  //       selectedNursery.id,
  //       weekAgo.toISOString().split('T')[0],
  //       today.toISOString().split('T')[0]
  //     )
  //     const monthly = await attendanceService.getStatistics(
  //       selectedNursery.id,
  //       monthAgo.toISOString().split('T')[0],
  //       today.toISOString().split('T')[0]
  //     )
  //     const recent = await attendanceService.getByDateRange(
  //       selectedNursery.id,
  //       weekAgo.toISOString().split('T')[0],
  //       today.toISOString().split('T')[0]
  //     )
  //
  //     setWeeklyStats(weekly)
  //     setMonthlyStats(monthly)
  //     setRecentAttendances(recent)
  //   } catch (err) {
  //     console.error('Error loading reports:', err)
  //     setError('Impossible de charger les rapports')
  //   } finally {
  //     setIsLoading(false)
  //   }
  // }

  if (authLoading || nurseryLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!session || !selectedNursery) return null

  // Mock data for display
  const stats = selectedPeriod === 'week' ? weeklyStats : monthlyStats
  const mockStats = {
    totalDays: selectedPeriod === 'week' ? 7 : 30,
    totalAttendances: selectedPeriod === 'week' ? 145 : 620,
    averageDaily: selectedPeriod === 'week' ? 20.7 : 20.7,
    presentRate: 94.5,
    lateRate: 8.2,
    absentRate: 5.5,
    averageHours: 8.3
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100">
            <Calendar className="w-6 h-6 text-blue-600" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rapports de présences</h1>
            <p className="text-sm text-muted-foreground">
              Analyse détaillée de la fréquentation - {selectedNursery.name}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
            <Button
              variant={selectedPeriod === 'week' ? 'default' : 'outline'}
              onClick={() => setSelectedPeriod('week')}
            >
              7 derniers jours
            </Button>
            <Button
              variant={selectedPeriod === 'month' ? 'default' : 'outline'}
              onClick={() => setSelectedPeriod('month')}
            >
              30 derniers jours
            </Button>
            <Button className="bg-[#b5ead7] hover:bg-[#a0dcc4] text-gray-900">
              <Download className="w-4 h-4 mr-2" />
              Exporter
            </Button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="p-4 mb-6 bg-red-50 border-red-200">
          <p className="text-red-800">{error}</p>
        </Card>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total présences</p>
              <p className="text-3xl font-bold text-blue-900">{mockStats.totalAttendances}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {mockStats.totalDays} jours
              </p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6 bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Taux de présence</p>
              <p className="text-3xl font-bold text-green-900">{mockStats.presentRate}%</p>
              <p className="text-xs text-green-700 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                +2.3% vs période précédente
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-6 bg-yellow-50 border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Taux de retard</p>
              <p className="text-3xl font-bold text-yellow-900">{mockStats.lateRate}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                Moyenne journalière: {mockStats.averageDaily.toFixed(1)}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </Card>

        <Card className="p-6 bg-red-50 border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Taux d'absence</p>
              <p className="text-3xl font-bold text-red-900">{mockStats.absentRate}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                Heures moyennes: {mockStats.averageHours}h
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Attendance Trends */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Tendances de fréquentation
          </h3>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <p className="text-muted-foreground text-sm">
              Graphique de tendances (à intégrer avec Recharts)
            </p>
          </div>
        </Card>

        {/* Status Distribution */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Répartition des statuts
          </h3>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <p className="text-muted-foreground text-sm">
              Graphique circulaire (à intégrer avec Recharts)
            </p>
          </div>
        </Card>
      </div>

      {/* Daily Breakdown */}
      <Card className="p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Détail par jour
        </h3>

        {isLoading ? (
          <div className="py-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold">Date</th>
                  <th className="text-center py-3 px-4 font-semibold">Total</th>
                  <th className="text-center py-3 px-4 font-semibold">Présents</th>
                  <th className="text-center py-3 px-4 font-semibold">Retards</th>
                  <th className="text-center py-3 px-4 font-semibold">Absents</th>
                  <th className="text-center py-3 px-4 font-semibold">Taux</th>
                  <th className="text-center py-3 px-4 font-semibold">Heures moy.</th>
                </tr>
              </thead>
              <tbody>
                {/* Mock data rows */}
                {[...Array(7)].map((_, i) => {
                  const date = new Date()
                  date.setDate(date.getDate() - i)
                  return (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">
                            {date.toLocaleDateString('fr-FR', { weekday: 'long' })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {date.toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </td>
                      <td className="text-center py-3 px-4">
                        <Badge variant="outline">21</Badge>
                      </td>
                      <td className="text-center py-3 px-4">
                        <Badge className="bg-green-100 text-green-800">20</Badge>
                      </td>
                      <td className="text-center py-3 px-4">
                        <Badge className="bg-yellow-100 text-yellow-800">2</Badge>
                      </td>
                      <td className="text-center py-3 px-4">
                        <Badge className="bg-red-100 text-red-800">1</Badge>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="font-semibold text-green-700">95.2%</span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="text-sm">8.2h</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Top Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 bg-green-50 border-green-200">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-green-900 mb-1">Assiduité exemplaire</h4>
              <p className="text-sm text-green-800">
                12 enfants avec 100% de présence ce mois
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-yellow-50 border-yellow-200">
          <div className="flex items-start gap-3">
            <Clock className="w-8 h-8 text-yellow-600 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-yellow-900 mb-1">Retards fréquents</h4>
              <p className="text-sm text-yellow-800">
                5 familles avec retards récurrents à surveiller
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-8 h-8 text-blue-600 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">Pic de fréquentation</h4>
              <p className="text-sm text-blue-800">
                Mercredi: journée la plus fréquentée (avg. 23 enfants)
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
