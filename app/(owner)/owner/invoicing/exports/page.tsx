'use client'

import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { useRouter } from 'next/navigation'
import { PlusIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { accountingExportService, type AccountingExport } from '@/lib/services/accounting-export.service'
import Link from 'next/link'

export default function ExportsPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery, isLoading: nurseryLoading } = useNursery()
  const router = useRouter()

  const [exports, setExports] = useState<AccountingExport[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (selectedNursery?.id) {
      loadExports()
    }
  }, [selectedNursery?.id])

  const loadExports = async () => {
    if (!selectedNursery?.id) return

    try {
      setIsLoading(true)
      const data = await accountingExportService.getByNursery(selectedNursery.id)
      setExports(data)
    } catch (error) {
      console.error('Error loading exports:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getFormatLabel = (format: AccountingExport['export_type']) => {
    const labels: Record<AccountingExport['export_type'], string> = {
      fec: 'FEC (Fiscal)',
      csv: 'CSV',
      excel: 'Excel',
      sage: 'Sage',
      cegid: 'Cegid',
      ebp: 'EBP',
      quickbooks: 'QuickBooks',
      custom: 'Personnalisé',
    }
    return labels[format] || format.toUpperCase()
  }

  const getStatusBadge = (status: AccountingExport['status']) => {
    const config: Record<AccountingExport['status'], { label: string; variant: any }> = {
      pending: { label: 'En attente', variant: 'secondary' },
      processing: { label: 'En cours', variant: 'default' },
      completed: { label: 'Terminé', variant: 'success' },
      failed: { label: 'Échec', variant: 'destructive' },
    }
    const { label, variant } = config[status]
    return <Badge variant={variant}>{label}</Badge>
  }

  if (authLoading || nurseryLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-100">
            <ArrowDownTrayIcon className="w-6 h-6 text-indigo-600" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Exports comptables</h1>
            <p className="text-sm text-muted-foreground">
              Historique des exports vers logiciels comptables
            </p>
          </div>
        </div>
        <Link href="/owner/invoicing/exports/new">
          <Button>
            <PlusIcon className="w-4 h-4 mr-2" />
            Nouvel export
          </Button>
        </Link>
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : exports.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-600 mb-2">Aucun export trouvé</p>
          <p className="text-sm text-gray-500 mb-4">
            Créez votre premier export comptable
          </p>
          <Link href="/owner/invoicing/exports/new">
            <Button>
              <PlusIcon className="w-4 h-4 mr-2" />
              Nouvel export
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {exports.map((exp) => (
            <Card key={exp.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                {/* Informations */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">
                      {getFormatLabel(exp.export_type)}
                    </h3>
                    {getStatusBadge(exp.status)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Période</p>
                      <p className="font-medium">
                        {new Date(exp.period_start).toLocaleDateString('fr-FR')} au{' '}
                        {new Date(exp.period_end).toLocaleDateString('fr-FR')}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Date de création</p>
                      <p className="font-medium">
                        {new Date(exp.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>

                    {exp.completed_at && (
                      <div>
                        <p className="text-gray-500">Complété le</p>
                        <p className="font-medium">
                          {new Date(exp.completed_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    )}

                    <div>
                      <p className="text-gray-500">Taille</p>
                      <p className="font-medium">
                        {exp.file_size ? `${(exp.file_size / 1024).toFixed(1)} KB` : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {exp.status === 'completed' && exp.file_url && (
                  <div className="ml-6">
                    <a href={exp.file_url} download target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                        Télécharger
                      </Button>
                    </a>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
