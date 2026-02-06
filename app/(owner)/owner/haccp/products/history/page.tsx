'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { haccpService, type Batch } from '@/lib/services/haccp.service'
import {
  ClockIcon,
  CheckCircleIcon,
  TrashIcon,
  XCircleIcon,
  ArchiveBoxIcon,
} from '@heroicons/react/24/outline'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'
import { Badge } from '@/components/ui/badge'
import { formatDateLocal } from '@/lib/utils/date'

// Helper: days since action
function daysSince(date: string): number {
  const today = new Date()
  const actionDate = new Date(date)
  const diff = today.getTime() - actionDate.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

// Helper: batch status display
function getBatchStatusInfo(batch: Batch) {
  switch (batch.status) {
    case 'consumed': return { label: 'Consommé', color: 'bg-green-100 text-green-700', icon: CheckCircleIcon }
    case 'discarded': return { label: 'Jeté', color: 'bg-gray-100 text-gray-500', icon: TrashIcon }
    case 'expired': return { label: 'Expiré', color: 'bg-red-100 text-red-700', icon: XCircleIcon }
    default: return { label: batch.status, color: 'bg-gray-100 text-gray-500', icon: ClockIcon }
  }
}

export default function BatchHistoryPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery } = useNursery()

  const [batches, setBatches] = useState<Batch[]>([])
  const [filteredBatches, setFilteredBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('ALL')

  const loadData = useCallback(async () => {
    if (!selectedNursery?.id) return
    try {
      setLoading(true)
      const data = await haccpService.getBatchHistory(selectedNursery.id)
      setBatches(data)
    } catch (error) {
      console.error('Error loading batch history:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedNursery?.id])

  useEffect(() => {
    if (selectedNursery?.id) {
      loadData()
    } else if (!authLoading && !selectedNursery) {
      setLoading(false)
    }
  }, [selectedNursery?.id, authLoading, loadData])

  useEffect(() => {
    if (filterStatus === 'ALL') {
      setFilteredBatches(batches)
    } else {
      setFilteredBatches(batches.filter(b => b.status === filterStatus))
    }
  }, [batches, filterStatus])

  const statuses = ['ALL', 'consumed', 'discarded', 'expired']

  if (authLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <PageBreadcrumb
        items={[
          { label: 'Dashboard', href: '/owner/dashboard' },
          { label: 'HACCP', href: '/owner/haccp' },
          { label: 'Produits', href: '/owner/haccp/products' },
          { label: 'Historique des lots' }
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gray-100">
            <ArchiveBoxIcon className="w-6 h-6 text-gray-600" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Historique des lots</h1>
            <p className="text-sm text-muted-foreground">
              Lots consommés, jetés ou expirés
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      {statuses.length > 1 && (
        <div className="flex gap-2 flex-wrap mb-6">
          {statuses.map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filterStatus === status
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status === 'ALL' ? 'Tous' :
               status === 'consumed' ? 'Consommés' :
               status === 'discarded' ? 'Jetés' :
               status === 'expired' ? 'Expirés' : status}
            </button>
          ))}
        </div>
      )}

      {/* Batches list */}
      {filteredBatches.length === 0 ? (
        <div className="card p-12 text-center">
          <ArchiveBoxIcon className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {filterStatus === 'ALL' ? 'Aucun historique' : `Aucun lot ${filterStatus === 'consumed' ? 'consommé' : filterStatus === 'discarded' ? 'jeté' : 'expiré'}`}
          </h3>
          <p className="text-muted-foreground">
            Les lots archivés apparaîtront ici
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBatches.map((batch) => {
            const statusInfo = getBatchStatusInfo(batch)
            const StatusIcon = statusInfo.icon
            const days = batch.updated_at ? daysSince(batch.updated_at) : null

            return (
              <div
                key={batch.id}
                className="group relative rounded-2xl bg-white p-5 transition-all duration-300 hover:shadow-lg border border-gray-100"
              >
                <div className="flex items-center gap-4">
                  {/* Product image */}
                  {batch.product?.image_url ? (
                    <img
                      src={batch.product.image_url}
                      alt={batch.product.name}
                      className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <ArchiveBoxIcon className="w-8 h-8 text-gray-400" />
                    </div>
                  )}

                  {/* Batch info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-base truncate">
                        {batch.product?.name || 'Produit inconnu'}
                      </h3>
                      <Badge className={`text-xs ${statusInfo.color}`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusInfo.label}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm">
                      {batch.product?.brand && (
                        <div>
                          <span className="text-muted-foreground text-xs">Marque</span>
                          <p className="font-medium truncate">{batch.product.brand}</p>
                        </div>
                      )}
                      {batch.batch_number && (
                        <div>
                          <span className="text-muted-foreground text-xs">Lot</span>
                          <p className="font-medium font-mono">{batch.batch_number}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground text-xs">Réception</span>
                        <p className="font-medium">{new Date(batch.reception_date).toLocaleDateString('fr-FR')}</p>
                      </div>
                      {batch.expiry_date && (
                        <div>
                          <span className="text-muted-foreground text-xs">DLC</span>
                          <p className="font-medium">{new Date(batch.expiry_date).toLocaleDateString('fr-FR')}</p>
                        </div>
                      )}
                      {batch.opened_at && (
                        <div>
                          <span className="text-muted-foreground text-xs">Ouvert le</span>
                          <p className="font-medium">{new Date(batch.opened_at).toLocaleDateString('fr-FR')}</p>
                        </div>
                      )}
                      {batch.quantity && (
                        <div>
                          <span className="text-muted-foreground text-xs">Quantité</span>
                          <p className="font-medium">{batch.quantity}</p>
                        </div>
                      )}
                      {days !== null && (
                        <div>
                          <span className="text-muted-foreground text-xs">Il y a</span>
                          <p className="font-medium">{days === 0 ? "Aujourd'hui" : `${days} jour${days > 1 ? 's' : ''}`}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
