'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { reportsService, type CustomReport } from '@/lib/services/reports.service'
import {
  DocumentTextIcon,
  ClockIcon,
  CalendarIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  PlayIcon,
  TrashIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'

export default function ReportsPage() {
  const { session } = useAuth()
  const { selectedNursery, isLoading: nurseryLoading } = useNursery()

  const [isLoading, setIsLoading] = useState(true)
  const [reports, setReports] = useState<CustomReport[]>([])
  const [filteredReports, setFilteredReports] = useState<CustomReport[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [executingReportId, setExecutingReportId] = useState<string | null>(null)

  useEffect(() => {
    if (selectedNursery?.id) {
      loadReports()
    }
  }, [selectedNursery?.id])

  useEffect(() => {
    filterReports()
  }, [reports, searchQuery, typeFilter])

  async function loadReports() {
    if (!selectedNursery?.id) return

    try {
      setIsLoading(true)
      const reportsData = await reportsService.getReports(selectedNursery.id)
      setReports(reportsData)
    } catch (error) {
      console.error('Error loading reports:', error)
    } finally {
      setIsLoading(false)
    }
  }

  function filterReports() {
    let filtered = reports

    if (searchQuery) {
      filtered = filtered.filter((report) =>
        report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter((report) => report.report_type === typeFilter)
    }

    setFilteredReports(filtered)
  }

  async function handleExecuteReport(reportId: string) {
    try {
      setExecutingReportId(reportId)
      await reportsService.executeCustomReport(reportId)
      // Reload reports to update execution count
      await loadReports()
    } catch (error) {
      console.error('Error executing report:', error)
    } finally {
      setExecutingReportId(null)
    }
  }

  async function handleDeleteReport(reportId: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce rapport ?')) return

    try {
      await reportsService.deleteReport(reportId)
      await loadReports()
    } catch (error) {
      console.error('Error deleting report:', error)
    }
  }

  function getReportTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      monthly: 'Rapport Mensuel',
      financial: 'Financier',
      staff: 'Personnel',
      haccp: 'HACCP',
      custom: 'Personnalisé',
    }
    return labels[type] || type
  }

  function getReportTypeBadgeColor(type: string): string {
    const colors: Record<string, string> = {
      monthly: 'bg-blue-100 text-blue-800',
      financial: 'bg-green-100 text-green-800',
      staff: 'bg-purple-100 text-purple-800',
      haccp: 'bg-orange-100 text-orange-800',
      custom: 'bg-gray-100 text-gray-800',
    }
    return colors[type] || colors.custom
  }

  if (nurseryLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des rapports...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/owner/analytics">
            <Button variant="ghost" size="icon">
              <ArrowLeftIcon className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Rapports Personnalisés</h1>
            <p className="text-gray-600">Créez et gérez vos rapports analytics</p>
          </div>
        </div>

        <Link href="/owner/analytics/reports/new">
          <Button>
            <PlusIcon className="w-4 h-4 mr-2" />
            Nouveau Rapport
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <DocumentTextIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{reports.length}</p>
              <p className="text-sm text-gray-600">Rapports Total</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CalendarIcon className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {reports.filter((r) => r.is_scheduled).length}
              </p>
              <p className="text-sm text-gray-600">Planifiés</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <ClockIcon className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {reports.reduce((sum, r) => sum + (r.execution_count || 0), 0)}
              </p>
              <p className="text-sm text-gray-600">Exécutions</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <ArrowDownTrayIcon className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {reports.filter((r) => r.last_executed_at).length}
              </p>
              <p className="text-sm text-gray-600">Récents</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Rechercher un rapport..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="monthly">Rapport Mensuel</SelectItem>
              <SelectItem value="financial">Financier</SelectItem>
              <SelectItem value="staff">Personnel</SelectItem>
              <SelectItem value="haccp">HACCP</SelectItem>
              <SelectItem value="custom">Personnalisé</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Reports List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredReports.map((report) => (
          <Card key={report.id} className="p-6 hover:shadow-lg transition-shadow duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{report.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{report.description}</p>

                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge className={getReportTypeBadgeColor(report.report_type)}>
                    {getReportTypeLabel(report.report_type)}
                  </Badge>
                  {report.is_scheduled && (
                    <Badge className="bg-green-100 text-green-800">
                      <ClockIcon className="w-3 h-3 mr-1" />
                      {report.schedule_frequency}
                    </Badge>
                  )}
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  {report.last_executed_at && (
                    <div>
                      Dernière exécution:{' '}
                      {new Date(report.last_executed_at).toLocaleDateString('fr-FR')}
                    </div>
                  )}
                  <div>Exécuté {report.execution_count} fois</div>
                  <div>
                    Créé le {new Date(report.created_at).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => handleExecuteReport(report.id)}
                disabled={executingReportId === report.id}
                className="flex-1"
              >
                {executingReportId === report.id ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <>
                    <PlayIcon className="w-4 h-4 mr-2" />
                    Exécuter
                  </>
                )}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDeleteReport(report.id)}
              >
                <TrashIcon className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredReports.length === 0 && (
        <Card className="p-12 text-center">
          <DocumentTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun rapport trouvé</h3>
          <p className="text-gray-600 mb-6">
            {searchQuery || typeFilter !== 'all'
              ? 'Essayez de modifier vos filtres de recherche.'
              : 'Commencez par créer votre premier rapport personnalisé.'}
          </p>
          {!searchQuery && typeFilter === 'all' && (
            <Link href="/owner/analytics/reports/new">
              <Button>
                <PlusIcon className="w-4 h-4 mr-2" />
                Créer un Rapport
              </Button>
            </Link>
          )}
        </Card>
      )}
    </div>
  )
}
