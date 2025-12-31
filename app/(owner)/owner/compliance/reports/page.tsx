'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import {
  ComplianceService,
  type RegulatoryReport,
  type CreateReportInput
} from '@/lib/services/compliance.service'
import {
  DocumentTextIcon,
  ArrowLeftIcon,
  PlusIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'
import { FormDialog } from '@/components/shared/FormDialog'
import { getTodayLocal, formatDateLocal } from '@/lib/utils/date'

const complianceService = new ComplianceService()

const REPORT_TYPES = [
  { value: 'daily_ratio', label: 'Rapport quotidien des ratios' },
  { value: 'monthly_compliance', label: 'Synthèse mensuelle de conformité' },
  { value: 'staff_qualifications', label: 'État des qualifications du personnel' },
  { value: 'incident_summary', label: 'Résumé des incidents' },
  { value: 'regulatory_audit', label: 'Audit réglementaire' },
  { value: 'custom', label: 'Rapport personnalisé' }
]


export default function ComplianceReportsPage() {
  const router = useRouter()
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery, isLoading: nurseryLoading } = useNursery()
  const [reports, setReports] = useState<RegulatoryReport[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [filterType, setFilterType] = useState<string>('all')

  const [formData, setFormData] = useState<CreateReportInput>({
    nursery_id: '',
    report_type: 'daily_ratio',
    report_date: getTodayLocal(),
    report_period_start: formatDateLocal(new Date(new Date().setDate(new Date().getDate() - 30))),
    report_period_end: getTodayLocal(),
    compliance_status: 'under_review',
    generated_by_id: '',
    notes: ''
  })

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
      const reportsData = await complianceService.getReports(selectedNursery.id)
      setReports(reportsData)
    } catch (error) {
      console.error('Error loading reports:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!session?.user?.id || !selectedNursery?.id) return

    try {
      setIsSubmitting(true)

      const reportInput: CreateReportInput = {
        ...formData,
        nursery_id: selectedNursery.id,
        generated_by_id: session.user.id,
        report_date: getTodayLocal()
      }

      await complianceService.createReport(reportInput)

      await loadData()
      setShowCreateDialog(false)
      resetForm()
    } catch (error) {
      console.error('Error creating report:', error)
      alert('Erreur lors de la création du rapport')
    } finally {
      setIsSubmitting(false)
    }
  }

  function resetForm() {
    setFormData({
      nursery_id: '',
      report_type: 'daily_ratio',
      report_date: getTodayLocal(),
      report_period_start: formatDateLocal(new Date(new Date().setDate(new Date().getDate() - 30))),
      report_period_end: getTodayLocal(),
      compliance_status: 'under_review',
      generated_by_id: '',
      notes: ''
    })
  }

  function getReportTypeLabel(type: string): string {
    return REPORT_TYPES.find((t) => t.value === type)?.label || type
  }

  function getStatusBadgeVariant(
    status: string
  ): 'default' | 'success' | 'warning' | 'destructive' {
    switch (status) {
      case 'compliant':
        return 'success'
      case 'warning':
        return 'warning'
      case 'non_compliant':
        return 'destructive'
      case 'under_review':
        return 'default'
      default:
        return 'default'
    }
  }

  function getStatusLabel(status: string): string {
    switch (status) {
      case 'compliant':
        return 'Conforme'
      case 'warning':
        return 'Avertissement'
      case 'non_compliant':
        return 'Non conforme'
      case 'under_review':
        return 'En révision'
      default:
        return status
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

  const filteredReports =
    filterType === 'all'
      ? reports
      : reports.filter((r) => r.report_type === filterType)

  const compliantReports = reports.filter((r) => r.compliance_status === 'compliant')
  const reviewReports = reports.filter((r) => r.compliance_status === 'under_review')

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Breadcrumb */}
      <PageBreadcrumb
        items={[
          { label: 'Accueil', href: '/owner/dashboard' },
          { label: 'Conformité', href: '/owner/compliance' },
          { label: 'Rapports réglementaires', href: '/owner/compliance/reports' }
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
          <div className="p-3 bg-indigo-50 rounded-xl">
            <DocumentTextIcon className="h-8 w-8 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rapports réglementaires</h1>
            <p className="text-gray-600">{selectedNursery.name}</p>
          </div>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Nouveau rapport
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Conformes</p>
              <p className="text-2xl font-bold text-green-600">{compliantReports.length}</p>
            </div>
            <CheckCircleIcon className="h-10 w-10 text-green-400" />
          </div>
        </Card>
        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">En révision</p>
              <p className="text-2xl font-bold text-yellow-600">{reviewReports.length}</p>
            </div>
            <ExclamationTriangleIcon className="h-10 w-10 text-yellow-400" />
          </div>
        </Card>
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total</p>
              <p className="text-2xl font-bold text-blue-600">{reports.length}</p>
            </div>
            <DocumentTextIcon className="h-10 w-10 text-blue-400" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <Button
          variant={filterType === 'all' ? 'default' : 'outline'}
          onClick={() => setFilterType('all')}
          size="sm"
        >
          Tous ({reports.length})
        </Button>
        {REPORT_TYPES.map((type) => {
          const count = reports.filter((r) => r.report_type === type.value).length
          return (
            <Button
              key={type.value}
              variant={filterType === type.value ? 'default' : 'outline'}
              onClick={() => setFilterType(type.value)}
              size="sm"
            >
              {type.label} ({count})
            </Button>
          )
        })}
      </div>

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <Card className="p-12 text-center">
          <DocumentTextIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Aucun rapport</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {filterType === 'all'
              ? 'Aucun rapport réglementaire disponible'
              : `Aucun rapport de type "${getReportTypeLabel(filterType)}"`}
          </p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Créer un rapport
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report) => (
            <Card key={report.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {getReportTypeLabel(report.report_type)}
                    </h3>
                    <Badge variant={getStatusBadgeVariant(report.compliance_status)}>
                      {getStatusLabel(report.compliance_status)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-3">
                    <div>
                      <p className="text-gray-600">Type</p>
                      <p className="font-medium">{getReportTypeLabel(report.report_type)}</p>
                    </div>
                    {report.report_period_start && (
                      <div>
                        <p className="text-gray-600">Du</p>
                        <p className="font-medium">
                          {new Date(report.report_period_start).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    )}
                    {report.report_period_end && (
                      <div>
                        <p className="text-gray-600">Au</p>
                        <p className="font-medium">
                          {new Date(report.report_period_end).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    )}
                  </div>

                  {report.notes && <p className="text-sm text-gray-600 mb-3">{report.notes}</p>}

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="h-4 w-4" />
                      <span>
                        Créé le {new Date(report.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    {report.report_file_url && (
                      <span className="text-green-600 font-medium">Fichier disponible</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  {report.report_file_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={report.report_file_url} download>
                        <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                        Télécharger
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Report Dialog */}
      <FormDialog
        isOpen={showCreateDialog}
        onClose={() => {
          setShowCreateDialog(false)
          resetForm()
        }}
        title="Créer un rapport réglementaire"
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Type de rapport *</label>
            <select
              className="w-full border rounded-md px-3 py-2"
              value={formData.report_type}
              onChange={(e) => setFormData({ ...formData, report_type: e.target.value })}
              required
            >
              {REPORT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date de début *</label>
              <Input
                type="date"
                value={formData.report_period_start}
                onChange={(e) =>
                  setFormData({ ...formData, report_period_start: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date de fin *</label>
              <Input
                type="date"
                value={formData.report_period_end}
                onChange={(e) => setFormData({ ...formData, report_period_end: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes (optionnel)</label>
            <textarea
              className="w-full border rounded-md px-3 py-2 min-h-[80px]"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notes ou commentaires additionnels..."
            />
          </div>
        </div>
      </FormDialog>
    </div>
  )
}
