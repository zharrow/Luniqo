'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { reportsService } from '@/lib/services/reports.service'
import {
  ArrowLeftIcon,
  CheckIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'

const reportTypes = [
  { value: 'financial', label: 'Financier', description: 'Revenue, MRR, ARR, factures' },
  { value: 'staff', label: 'Personnel', description: 'Absentéisme, heures, ratios' },
  { value: 'haccp', label: 'HACCP', description: 'Conformité, incidents' },
  { value: 'custom', label: 'Personnalisé', description: 'Sélection libre de métriques' },
]

const formats = [
  { value: 'PDF', label: 'PDF', description: 'Document imprimable' },
  { value: 'EXCEL', label: 'Excel', description: 'Tableau de données éditable' },
  { value: 'CSV', label: 'CSV', description: 'Données brutes' },
]

const scheduleFrequencies = [
  { value: 'DAILY', label: 'Quotidien' },
  { value: 'WEEKLY', label: 'Hebdomadaire' },
  { value: 'MONTHLY', label: 'Mensuel' },
  { value: 'QUARTERLY', label: 'Trimestriel' },
  { value: 'YEARLY', label: 'Annuel' },
]

const availableMetrics = {
  financial: [
    { id: 'mrr', label: 'MRR (Monthly Recurring Revenue)' },
    { id: 'arr', label: 'ARR (Annual Recurring Revenue)' },
    { id: 'collection_rate', label: 'Taux de recouvrement' },
    { id: 'overdue_invoices', label: 'Factures impayées' },
    { id: 'revenue_by_type', label: 'Revenue par type de contrat' },
  ],
  staff: [
    { id: 'absenteeism_rate', label: 'Taux d\'absentéisme' },
    { id: 'staff_ratio', label: 'Ratio d\'encadrement' },
    { id: 'overtime_hours', label: 'Heures supplémentaires' },
    { id: 'turnover_rate', label: 'Taux de turnover' },
  ],
  haccp: [
    { id: 'compliance_rate', label: 'Taux de conformité' },
    { id: 'incidents_count', label: 'Nombre d\'incidents' },
    { id: 'temperature_issues', label: 'Problèmes de température' },
    { id: 'resolution_time', label: 'Temps moyen de résolution' },
  ],
  custom: [
    { id: 'occupancy_rate', label: 'Taux d\'occupation' },
    { id: 'enrollment_count', label: 'Nombre d\'inscriptions' },
    { id: 'retention_rate', label: 'Taux de rétention' },
    { id: 'parent_engagement', label: 'Engagement parents' },
  ],
}

export default function NewReportPage() {
  const router = useRouter()
  const { session } = useAuth()
  const { selectedNursery } = useNursery()

  const [isCreating, setIsCreating] = useState(false)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [reportType, setReportType] = useState<string>('financial')
  const [format, setFormat] = useState<string>('PDF')
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([])
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduleFrequency, setScheduleFrequency] = useState<string>('MONTHLY')

  function handleMetricToggle(metricId: string) {
    if (selectedMetrics.includes(metricId)) {
      setSelectedMetrics(selectedMetrics.filter((m) => m !== metricId))
    } else {
      setSelectedMetrics([...selectedMetrics, metricId])
    }
  }

  async function handleCreateReport() {
    if (!session?.enterprise?.id || !name || selectedMetrics.length === 0) {
      alert('Veuillez remplir tous les champs obligatoires et sélectionner au moins une métrique.')
      return
    }

    try {
      setIsCreating(true)

      // Calculate period (last 30 days by default)
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 30)

      const reportConfig = {
        name,
        description,
        report_type: reportType as any,
        format: format as any,
        config: {
          title: name,
          description,
          period: {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
          },
          metrics: selectedMetrics,
          filters: {},
        },
        is_scheduled: isScheduled,
        schedule_frequency: isScheduled ? (scheduleFrequency as any) : null,
      }

      if (!selectedNursery?.id || !session?.user?.id) {
        throw new Error('Missing required data')
      }

      await reportsService.createCustomReport(selectedNursery.id, reportConfig, session.user.id)

      router.push('/owner/analytics/reports')
    } catch (error) {
      console.error('Error creating report:', error)
      alert('Erreur lors de la création du rapport. Veuillez réessayer.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/owner/analytics/reports">
          <Button variant="ghost" size="icon">
            <ArrowLeftIcon className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Créer un Rapport Personnalisé</h1>
          <p className="text-gray-600">Configurez votre rapport analytics sur mesure</p>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-6">
        {/* Basic Info */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Informations Générales</h2>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nom du rapport *</Label>
              <Input
                id="name"
                placeholder="Ex: Rapport Financier Mensuel"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Description du rapport et de son objectif..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
        </Card>

        {/* Report Type */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Type de Rapport</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reportTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => {
                  setReportType(type.value)
                  setSelectedMetrics([])
                }}
                className={`p-4 border-2 rounded-lg text-left transition-colors ${
                  reportType === type.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{type.label}</h3>
                    <p className="text-sm text-gray-600">{type.description}</p>
                  </div>
                  {reportType === type.value && (
                    <CheckIcon className="w-5 h-5 text-blue-500" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Metrics Selection */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Métriques à Inclure *</h2>
          <p className="text-sm text-gray-600 mb-4">
            Sélectionnez les métriques que vous souhaitez inclure dans le rapport
          </p>

          <div className="space-y-3">
            {availableMetrics[reportType as keyof typeof availableMetrics]?.map((metric) => (
              <div key={metric.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                <Checkbox
                  id={metric.id}
                  checked={selectedMetrics.includes(metric.id)}
                  onCheckedChange={() => handleMetricToggle(metric.id)}
                />
                <Label htmlFor={metric.id} className="flex-1 cursor-pointer">
                  {metric.label}
                </Label>
              </div>
            ))}
          </div>

          {selectedMetrics.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium text-gray-700 mb-2">Métriques sélectionnées:</p>
              <div className="flex flex-wrap gap-2">
                {selectedMetrics.map((metricId) => {
                  const metric = availableMetrics[reportType as keyof typeof availableMetrics]?.find(
                    (m) => m.id === metricId
                  )
                  return metric ? (
                    <Badge key={metricId} variant="default">
                      {metric.label}
                    </Badge>
                  ) : null
                })}
              </div>
            </div>
          )}
        </Card>

        {/* Format */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Format d'Export</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {formats.map((fmt) => (
              <button
                key={fmt.value}
                onClick={() => setFormat(fmt.value)}
                className={`p-4 border-2 rounded-lg text-left transition-colors ${
                  format === fmt.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{fmt.label}</h3>
                    <p className="text-sm text-gray-600">{fmt.description}</p>
                  </div>
                  {format === fmt.value && (
                    <CheckIcon className="w-5 h-5 text-blue-500" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Scheduling */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Planification Automatique</h2>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Checkbox
                id="is-scheduled"
                checked={isScheduled}
                onCheckedChange={(checked) => setIsScheduled(checked === true)}
              />
              <Label htmlFor="is-scheduled" className="cursor-pointer">
                Générer et envoyer ce rapport automatiquement
              </Label>
            </div>

            {isScheduled && (
              <div>
                <Label htmlFor="schedule-frequency">Fréquence</Label>
                <Select value={scheduleFrequency} onValueChange={setScheduleFrequency}>
                  <SelectTrigger id="schedule-frequency" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {scheduleFrequencies.map((freq) => (
                      <SelectItem key={freq.value} value={freq.value}>
                        {freq.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4">
          <Link href="/owner/analytics/reports">
            <Button variant="outline">Annuler</Button>
          </Link>

          <Button
            onClick={handleCreateReport}
            disabled={isCreating || !name || selectedMetrics.length === 0}
          >
            {isCreating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Création en cours...
              </>
            ) : (
              <>
                <DocumentTextIcon className="w-4 h-4 mr-2" />
                Créer le Rapport
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
