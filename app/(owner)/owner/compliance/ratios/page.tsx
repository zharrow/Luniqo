'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import {
  ComplianceService,
  type RatioLog,
  type DailyComplianceSummary
} from '@/lib/services/compliance.service'
import {
  UserGroupIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  ChartBarIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'
import { getTodayLocal, formatDateLocal, getDateWithOffset } from '@/lib/utils/date'

const complianceService = new ComplianceService()

export default function RatiosPage() {
  const router = useRouter()
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery, isLoading: nurseryLoading } = useNursery()
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(getTodayLocal())
  const [complianceSummary, setComplianceSummary] = useState<DailyComplianceSummary | null>(null)
  const [alerts, setAlerts] = useState<RatioLog[]>([])
  const [ratioHistory, setRatioHistory] = useState<RatioLog[]>([])

  useEffect(() => {
    if (session?.user?.id && selectedNursery?.id) {
      loadData()
    } else if (!authLoading && !nurseryLoading) {
      setLoading(false)
    }
  }, [session?.user?.id, selectedNursery?.id, selectedDate, authLoading, nurseryLoading])

  async function loadData() {
    if (!selectedNursery?.id) return

    try {
      setLoading(true)

      const [summaryData, alertsData, historyData] = await Promise.all([
        complianceService.getDailyComplianceSummary(selectedNursery.id, selectedDate),
        complianceService.getRatioAlerts(selectedNursery.id, selectedDate),
        complianceService.getRatioHistory(selectedNursery.id, selectedDate)
      ])

      setComplianceSummary(summaryData)
      setAlerts(alertsData)
      setRatioHistory(historyData)
    } catch (error) {
      console.error('Error loading ratio data:', error)
    } finally {
      setLoading(false)
    }
  }

  function getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 border-red-300 text-red-700'
      case 'warning':
        return 'bg-yellow-100 border-yellow-300 text-yellow-700'
      case 'info':
        return 'bg-blue-100 border-blue-300 text-blue-700'
      default:
        return 'bg-gray-100 border-gray-300 text-gray-700'
    }
  }

  function getSeverityBadgeVariant(
    severity: string
  ): 'default' | 'success' | 'warning' | 'destructive' {
    switch (severity) {
      case 'critical':
        return 'destructive'
      case 'warning':
        return 'warning'
      case 'info':
        return 'default'
      default:
        return 'default'
    }
  }

  function getSeverityLabel(severity: string): string {
    switch (severity) {
      case 'critical':
        return 'Critique'
      case 'warning':
        return 'Avertissement'
      case 'info':
        return 'Information'
      default:
        return severity
    }
  }

  function parseRatio(ratio: string): { staff: number; children: number } {
    const parts = ratio.split(':')
    return { staff: parseInt(parts[0]) || 1, children: parseInt(parts[1]) || 0 }
  }

  function calculateRatioPercentage(currentRatio: string, requiredRatio: string): number {
    const current = parseRatio(currentRatio)
    const required = parseRatio(requiredRatio)

    if (current.children === 0) return 0

    const currentChildrenPerStaff = current.children / current.staff
    const requiredChildrenPerStaff = required.children / required.staff

    return Math.min(100, (currentChildrenPerStaff / requiredChildrenPerStaff) * 100)
  }

  if (authLoading || nurseryLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!selectedNursery) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center max-w-md">
          <p className="text-lg font-medium mb-2">Aucune crèche sélectionnée</p>
          <p className="text-sm text-muted-foreground mb-4">
            Veuillez sélectionner une crèche dans le menu
          </p>
        </Card>
      </div>
    )
  }

  const isCompliant = complianceSummary?.compliance_rate === 100
  const currentRatio =
    complianceSummary && complianceSummary.avg_actual_ratio > 0
      ? `1:${complianceSummary.avg_actual_ratio.toFixed(1)}`
      : '1:0'
  const requiredRatio =
    complianceSummary && complianceSummary.avg_required_ratio > 0
      ? `1:${complianceSummary.avg_required_ratio.toFixed(1)}`
      : '1:5'
  const ratioPercentage = complianceSummary
    ? calculateRatioPercentage(currentRatio, requiredRatio)
    : 0

  const criticalAlerts = alerts.filter((a) => a.non_compliance_severity === 'critical')
  const warningAlerts = alerts.filter(
    (a) => a.non_compliance_severity === 'moderate' || a.non_compliance_severity === 'minor'
  )

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Breadcrumb */}
      <PageBreadcrumb
        items={[
          { label: 'Accueil', href: '/owner/dashboard' },
          { label: 'Conformité', href: '/owner/compliance' },
          { label: 'Suivi des ratios', href: '/owner/compliance/ratios' }
        ]}
      />

      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push('/owner/compliance')}
        className="mb-4"
      >
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Retour à la conformité
      </Button>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${isCompliant ? 'bg-green-50' : 'bg-red-50'}`}>
            <UserGroupIcon
              className={`h-8 w-8 ${isCompliant ? 'text-green-600' : 'text-red-600'}`}
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Suivi des ratios</h1>
            <p className="text-gray-600">{selectedNursery.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(getDateWithOffset(-1))}
          >
            Jour précédent
          </Button>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-40"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(getTodayLocal())}
          >
            Aujourd'hui
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(getDateWithOffset(1))}
          >
            Jour suivant
          </Button>
        </div>
      </div>

      {/* Current Status Card */}
      {complianceSummary && (
        <Card
          className={`p-8 mb-6 ${isCompliant ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              {isCompliant ? (
                <CheckCircleIcon className="h-16 w-16 text-green-600" />
              ) : (
                <ExclamationTriangleIcon className="h-16 w-16 text-red-600" />
              )}
              <div>
                <h2 className={`text-3xl font-bold ${isCompliant ? 'text-green-900' : 'text-red-900'}`}>
                  {isCompliant ? 'Conforme' : 'Non conforme'}
                </h2>
                <p className={`text-sm ${isCompliant ? 'text-green-700' : 'text-red-700'}`}>
                  {new Date(selectedDate).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Ratio Visual */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Taux de conformité</span>
                <span className="text-sm font-medium text-gray-900">
                  {complianceSummary.compliance_rate.toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
                <div
                  className={`h-8 rounded-full transition-all ${
                    complianceSummary.compliance_rate < 80
                      ? 'bg-red-500'
                      : complianceSummary.compliance_rate < 95
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(100, complianceSummary.compliance_rate)}%` }}
                />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Ratio moyen</p>
                  <p className="text-3xl font-bold text-gray-900">{currentRatio}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Ratio requis</p>
                  <p className="text-3xl font-bold text-gray-900">{requiredRatio}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-white rounded-lg border-2 border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Personnel moyen</p>
                <p className="text-3xl font-bold text-blue-600">
                  {complianceSummary.avg_staff_present.toFixed(1)}
                </p>
              </div>
              <div className="p-4 bg-white rounded-lg border-2 border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Enfants moyens</p>
                <p className="text-3xl font-bold text-purple-600">
                  {complianceSummary.avg_children_present.toFixed(1)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="p-3 bg-white border border-gray-200 rounded-md text-center">
              <p className="text-xs text-gray-600">Critiques</p>
              <p className="text-xl font-bold text-red-600">{complianceSummary.critical_issues}</p>
            </div>
            <div className="p-3 bg-white border border-gray-200 rounded-md text-center">
              <p className="text-xs text-gray-600">Modérés</p>
              <p className="text-xl font-bold text-orange-600">{complianceSummary.moderate_issues}</p>
            </div>
            <div className="p-3 bg-white border border-gray-200 rounded-md text-center">
              <p className="text-xs text-gray-600">Mineurs</p>
              <p className="text-xl font-bold text-yellow-600">{complianceSummary.minor_issues}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Alertes critiques</p>
              <p className="text-2xl font-bold text-red-600">{criticalAlerts.length}</p>
            </div>
            <ExclamationTriangleIcon className="h-10 w-10 text-red-400" />
          </div>
        </Card>
        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Avertissements</p>
              <p className="text-2xl font-bold text-yellow-600">{warningAlerts.length}</p>
            </div>
            <ClockIcon className="h-10 w-10 text-yellow-400" />
          </div>
        </Card>
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Historique</p>
              <p className="text-2xl font-bold text-blue-600">{ratioHistory.length}</p>
            </div>
            <ChartBarIcon className="h-10 w-10 text-blue-400" />
          </div>
        </Card>
      </div>

      {/* Alerts List */}
      {alerts.length > 0 && (
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Alertes du jour ({alerts.length})
          </h2>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border-2 ${getSeverityColor(alert.non_compliance_severity || 'info')}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={getSeverityBadgeVariant(alert.non_compliance_severity || 'info')}>
                        {getSeverityLabel(alert.non_compliance_severity || 'info')}
                      </Badge>
                      <span className="text-xs text-gray-600">
                        {new Date(alert.log_timestamp).toLocaleTimeString('fr-FR')}
                      </span>
                    </div>
                    <p className="font-medium text-gray-900 mb-1">
                      Ratio: {alert.actual_ratio}:1 (requis: {alert.required_ratio}:1)
                    </p>
                    <p className="text-sm text-gray-700">
                      {alert.children_present} enfants, {alert.staff_present} personnel
                      {alert.qualified_staff_present && ` (${alert.qualified_staff_present} qualifiés)`}
                    </p>
                    {alert.notes && <p className="text-sm text-gray-600 mt-1">{alert.notes}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Ratio History */}
      {ratioHistory.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Historique du jour ({ratioHistory.length} enregistrements)
          </h2>
          <div className="space-y-2">
            {ratioHistory.map((record) => (
              <div
                key={record.id}
                className="p-3 bg-gray-50 border border-gray-200 rounded-md flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {record.log_hour}h00 - {new Date(record.log_timestamp).toLocaleTimeString('fr-FR')}
                  </p>
                  <p className="text-xs text-gray-600">
                    Personnel: {record.staff_present} • Enfants: {record.children_present}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">
                    Ratio: {record.actual_ratio}:1
                  </p>
                  <Badge variant={record.is_compliant ? 'success' : 'destructive'}>
                    {record.is_compliant ? 'Conforme' : 'Non conforme'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Empty State */}
      {alerts.length === 0 && ratioHistory.length === 0 && (
        <Card className="p-12 text-center bg-green-50 border-green-200">
          <CheckCircleIcon className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-green-900 mb-2">Aucune donnée disponible</h3>
          <p className="text-sm text-green-700">
            Aucun historique ou alerte pour cette date
          </p>
        </Card>
      )}
    </div>
  )
}
