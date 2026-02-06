'use client'

import { useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { accountingExportService, type AccountingExport } from '@/lib/services/accounting-export.service'

export default function NewExportPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery } = useNursery()
  const router = useRouter()

  const [isExporting, setIsExporting] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState('')

  // Form state
  const [exportFormat, setExportFormat] = useState<AccountingExport['export_type']>('fec')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedNursery?.id || !exportFormat || !periodStart || !periodEnd) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }

    try {
      setIsExporting(true)

      if (!session) {
        alert('Session expirée')
        return
      }

      const userId = session?.user?.id
      if (!userId) {
        alert('Utilisateur non identifié')
        return
      }

      let result
      if (exportFormat === 'fec') {
        result = await accountingExportService.generateFEC(
          selectedNursery.id,
          new Date(periodStart).getFullYear(),
          userId
        )
      } else {
        result = await accountingExportService.generateCSV(
          selectedNursery.id,
          periodStart,
          periodEnd,
          userId
        )
      }

      setDownloadUrl(result.file_url || '')
      setExportSuccess(true)

      setTimeout(() => {
        router.push('/owner/invoicing/exports')
      }, 3000)
    } catch (error) {
      console.error('Error exporting data:', error)
      alert('Erreur lors de l\'export des données')
    } finally {
      setIsExporting(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (exportSuccess) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card className="p-12 text-center">
          <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Export réussi !</h2>
          <p className="text-gray-600 mb-6">
            L'export a été généré avec succès
          </p>
          {downloadUrl && (
            <a href={downloadUrl} download target="_blank" rel="noopener noreferrer">
              <Button className="mb-4">
                Télécharger le fichier
              </Button>
            </a>
          )}
          <p className="text-sm text-gray-500">Redirection...</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push('/owner/invoicing/exports')}>
          <ArrowLeftIcon className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold mb-2">Nouvel export comptable</h1>
          <p className="text-muted-foreground">Exporter les données vers un logiciel comptable</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="p-6 mb-6">
          <div className="space-y-4">
            {/* Format d'export */}
            <div>
              <Label>Format d'export *</Label>
              <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as AccountingExport['export_type'])} required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fec">FEC (Fichier des Écritures Comptables - France)</SelectItem>
                  <SelectItem value="csv">CSV (Général)</SelectItem>
                  <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                  <SelectItem value="sage">Sage Compta</SelectItem>
                  <SelectItem value="cegid">Cegid</SelectItem>
                  <SelectItem value="ebp">EBP Comptabilité</SelectItem>
                  <SelectItem value="quickbooks">QuickBooks</SelectItem>
                </SelectContent>
              </Select>
              
              {exportFormat === 'fec' && (
                <p className="text-xs text-gray-500 mt-1">
                  Format obligatoire pour le contrôle fiscal français (Article A47 A-1 du LPF)
                </p>
              )}
            </div>

            {/* Période de début */}
            <div>
              <Label>Date de début *</Label>
              <Input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                required
              />
            </div>

            {/* Période de fin */}
            <div>
              <Label>Date de fin *</Label>
              <Input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Généralement, un export annuel (1er janvier au 31 décembre)
              </p>
            </div>
          </div>
        </Card>

        {/* Informations FEC */}
        {exportFormat === 'fec' && (
          <Card className="p-6 mb-6 bg-blue-50 border-blue-200">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span>📘</span> À propos du format FEC
            </h3>
            <div className="text-sm text-gray-700 space-y-1">
              <p>• Format obligatoire en cas de contrôle fiscal en France</p>
              <p>• Contient toutes les écritures comptables de la période</p>
              <p>• Fichier texte délimité par pipe (|)</p>
              <p>• Encodage UTF-8 sans BOM</p>
              <p>• Nom du fichier: [SIREN]FEC[AAAAMMJJ].txt</p>
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/owner/invoicing/exports')}
          >
            Annuler
          </Button>
          <Button type="submit" disabled={isExporting}>
            {isExporting ? 'Export en cours...' : 'Générer l\'export'}
          </Button>
        </div>
      </form>
    </div>
  )
}
