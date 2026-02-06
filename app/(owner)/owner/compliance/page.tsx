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
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ArrowRightIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'
import { getTodayLocal } from '@/lib/utils/date'

const complianceService = new ComplianceService()

export default function CompliancePage() {
  const router = useRouter()
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery, isLoading: nurseryLoading } = useNursery()
  const [loading, setLoading] = useState(true)
  const [ratioAlerts, setRatioAlerts] = useState<RatioLog[]>([])
  const [complianceSummary, setComplianceSummary] = useState<DailyComplianceSummary | null>(null)
  const [qualifiedStaffPct, setQualifiedStaffPct] = useState<number>(0)

  useEffect(() => {
    if (session?.user?.id && selectedNursery?.id) {
      loadData()
    } else if (!authLoading && !nurseryLoading) {
      setLoading(false)
    }
  }, [session?.user?.id, selectedNursery?.id, authLoading, nurseryLoading])

  async function loadData() {
    if (!selectedNursery?.id) return

    try {
      setLoading(true)
      const today = getTodayLocal()

      const [ratioAlertsData, summaryData, qualifiedPct] = await Promise.all([
        complianceService.getRatioAlerts(selectedNursery.id, today),
        complianceService.getDailyComplianceSummary(selectedNursery.id, today),
        complianceService.getQualifiedStaffPercentage(selectedNursery.id)
      ])

      setRatioAlerts(ratioAlertsData)
      setComplianceSummary(summaryData)
      setQualifiedStaffPct(qualifiedPct)
    } catch (error) {
      console.error('Error loading compliance data:', error)
    } finally {
      setLoading(false)
    }
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

  const criticalRatioAlerts = ratioAlerts.filter(
    (a) => a.non_compliance_severity === 'critical'
  )
  const warningRatioAlerts = ratioAlerts.filter(
    (a) => a.non_compliance_severity === 'moderate' || a.non_compliance_severity === 'minor'
  )

  const isCompliant = complianceSummary?.compliance_rate === 100
  const currentRatio =
    complianceSummary && complianceSummary.avg_actual_ratio > 0
      ? `1:${complianceSummary.avg_actual_ratio.toFixed(1)}`
      : '1:0'
  const requiredRatio =
    complianceSummary && complianceSummary.avg_required_ratio > 0
      ? `1:${complianceSummary.avg_required_ratio.toFixed(1)}`
      : '1:5'
  const staffCount = complianceSummary?.avg_staff_present || 0
  const childrenCount = complianceSummary?.avg_children_present || 0

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Breadcrumb */}
      <PageBreadcrumb
        items={[
          { label: 'Accueil', href: '/owner/dashboard' },
          { label: 'Conformité réglementaire', href: '/owner/compliance' }
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-green-100">
            <ShieldCheckIcon className="w-6 h-6 text-green-600" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Conformité réglementaire</h1>
            <p className="text-sm text-muted-foreground">
              {selectedNursery.name}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/owner/compliance/ratios')}
          >
            <UserGroupIcon className="h-4 w-4 mr-2" />
            Suivi des ratios
          </Button>
          <Button onClick={() => router.push('/owner/compliance/reports')}>
            <DocumentTextIcon className="h-4 w-4 mr-2" />
            Rapports
          </Button>
        </div>
      </div>

      {/* Today's Compliance Status */}
      <Card
        className={`p-6 mb-6 ${isCompliant ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {isCompliant ? (
              <CheckCircleIcon className="h-12 w-12 text-green-600" />
            ) : (
              <ExclamationTriangleIcon className="h-12 w-12 text-red-600" />
            )}
            <div>
              <h2
                className={`text-2xl font-bold ${isCompliant ? 'text-green-900' : 'text-red-900'}`}
              >
                {isCompliant ? 'Conforme' : 'Non conforme'}
              </h2>
              <p className={`text-sm ${isCompliant ? 'text-green-700' : 'text-red-700'}`}>
                Statut de conformité pour aujourd'hui
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600 mb-1">Ratio moyen</p>
            <p className={`text-3xl font-bold ${isCompliant ? 'text-green-600' : 'text-red-600'}`}>
              {currentRatio}
            </p>
            <p className="text-xs text-gray-500">Requis: {requiredRatio}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
          <div>
            <p className="text-sm text-gray-600">Personnel moyen</p>
            <p className="text-2xl font-bold text-gray-900">{staffCount.toFixed(1)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Enfants moyens</p>
            <p className="text-2xl font-bold text-gray-900">{childrenCount.toFixed(1)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Personnel qualifié</p>
            <p className="text-2xl font-bold text-gray-900">{qualifiedStaffPct.toFixed(0)}%</p>
          </div>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Alertes critiques</p>
              <p className="text-2xl font-bold text-red-600">{criticalRatioAlerts.length}</p>
            </div>
            <ExclamationTriangleIcon className="h-10 w-10 text-red-400" />
          </div>
        </Card>
        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Avertissements</p>
              <p className="text-2xl font-bold text-yellow-600">{warningRatioAlerts.length}</p>
            </div>
            <ClockIcon className="h-10 w-10 text-yellow-400" />
          </div>
        </Card>
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Taux de conformité</p>
              <p className="text-2xl font-bold text-blue-600">
                {complianceSummary?.compliance_rate.toFixed(0) || 0}%
              </p>
            </div>
            <CalendarIcon className="h-10 w-10 text-blue-400" />
          </div>
        </Card>
      </div>

      {/* Critical Ratio Alerts */}
      {criticalRatioAlerts.length > 0 && (
        <Card className="p-6 mb-6 bg-red-50 border-red-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              <h2 className="text-lg font-semibold text-red-900">
                Alertes critiques ({criticalRatioAlerts.length})
              </h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/owner/compliance/ratios')}
            >
              Voir détails
              <ArrowRightIcon className="h-4 w-4 ml-2" />
            </Button>
          </div>
          <div className="space-y-3">
            {criticalRatioAlerts.slice(0, 3).map((alert) => (
              <div key={alert.id} className="p-4 bg-white border border-red-200 rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-red-900">
                      Ratio non conforme: {alert.actual_ratio}:1 (requis: {alert.required_ratio}:1)
                    </p>
                    <p className="text-sm text-red-700 mt-1">
                      {alert.children_present} enfants, {alert.staff_present} personnel
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      {new Date(alert.log_timestamp).toLocaleString('fr-FR')}
                    </p>
                  </div>
                  <Badge variant="destructive">Critique</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Warning Ratio Alerts */}
      {warningRatioAlerts.length > 0 && (
        <Card className="p-6 mb-6 bg-yellow-50 border-yellow-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
              <h2 className="text-lg font-semibold text-yellow-900">
                Avertissements ({warningRatioAlerts.length})
              </h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/owner/compliance/ratios')}
            >
              Voir détails
              <ArrowRightIcon className="h-4 w-4 ml-2" />
            </Button>
          </div>
          <div className="space-y-3">
            {warningRatioAlerts.slice(0, 3).map((alert) => (
              <div key={alert.id} className="p-4 bg-white border border-yellow-200 rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-yellow-900">
                      Ratio surveillé: {alert.actual_ratio}:1 (requis: {alert.required_ratio}:1)
                    </p>
                    <p className="text-sm text-yellow-700 mt-1">
                      {alert.children_present} enfants, {alert.staff_present} personnel
                    </p>
                    <p className="text-xs text-yellow-600 mt-1">
                      {new Date(alert.log_timestamp).toLocaleString('fr-FR')}
                    </p>
                  </div>
                  <Badge variant="warning">Avertissement</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* All Clear Message */}
      {criticalRatioAlerts.length === 0 && warningRatioAlerts.length === 0 && (
        <Card className="p-12 text-center bg-green-50 border-green-200">
          <CheckCircleIcon className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-green-900 mb-2">Tout est conforme</h3>
          <p className="text-sm text-green-700">
            Aucune alerte de conformité active pour le moment
          </p>
        </Card>
      )}
    </div>
  )
}
