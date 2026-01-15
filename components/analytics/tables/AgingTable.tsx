'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export interface AgingBucket {
  label: string
  range: string // e.g., "0-30 jours"
  count: number
  amount: number
  percentage: number
}

export interface AgingTableProps {
  buckets: AgingBucket[]
  title?: string
  subtitle?: string
  currency?: string
  loading?: boolean
}

const getSeverityColor = (index: number, total: number) => {
  if (index === 0) return 'success' // Current / not overdue
  if (index === 1) return 'warning' // Slightly overdue
  if (index === total - 1) return 'destructive' // Very overdue
  return 'secondary' // Moderately overdue
}

export default function AgingTable({
  buckets,
  title = 'Analyse des impayés par ancienneté',
  subtitle,
  currency = '€',
  loading = false,
}: AgingTableProps) {
  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          {title && <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>}
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    )
  }

  if (!buckets || buckets.length === 0) {
    return (
      <Card className="p-6">
        {title && <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>}
        {subtitle && <p className="text-sm text-gray-500 mb-4">{subtitle}</p>}
        <div className="flex items-center justify-center h-40 text-gray-400">
          Aucune donnée disponible
        </div>
      </Card>
    )
  }

  const totalAmount = buckets.reduce((sum, b) => sum + b.amount, 0)
  const totalCount = buckets.reduce((sum, b) => sum + b.count, 0)

  return (
    <Card className="p-6">
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>}
      {subtitle && <p className="text-sm text-gray-500 mb-4">{subtitle}</p>}

      <div className="space-y-3">
        {buckets.map((bucket, index) => {
          const severityColor = getSeverityColor(index, buckets.length)

          return (
            <div
              key={index}
              className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-gray-900">{bucket.label}</h4>
                    <Badge variant={severityColor}>{bucket.range}</Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    {bucket.count} facture{bucket.count > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">
                    {bucket.amount.toLocaleString('fr-FR')} {currency}
                  </div>
                  <p className="text-sm text-gray-500">{bucket.percentage.toFixed(1)}%</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    severityColor === 'success'
                      ? 'bg-green-500'
                      : severityColor === 'warning'
                      ? 'bg-yellow-500'
                      : severityColor === 'destructive'
                      ? 'bg-red-500'
                      : 'bg-orange-500'
                  }`}
                  style={{ width: `${bucket.percentage}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Total</p>
            <p className="text-lg font-bold text-gray-900">
              {totalCount} facture{totalCount > 1 ? 's' : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Montant total</p>
            <p className="text-2xl font-bold text-gray-900">
              {totalAmount.toLocaleString('fr-FR')} {currency}
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}
