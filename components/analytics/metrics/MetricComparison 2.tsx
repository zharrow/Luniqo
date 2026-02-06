'use client'

import { Card } from '@/components/ui/card'
import TrendIndicator from './TrendIndicator'

export interface MetricComparisonProps {
  title: string
  currentPeriod: {
    label: string
    value: number
    unit?: string
  }
  previousPeriod: {
    label: string
    value: number
    unit?: string
  }
  reverseColors?: boolean
  icon?: React.ReactNode
  color?: 'blue' | 'pink' | 'mint' | 'peach' | 'lavender'
  loading?: boolean
}

const colorClasses = {
  blue: 'bg-blue-50 text-blue-700',
  pink: 'bg-pink-50 text-pink-700',
  mint: 'bg-green-50 text-green-700',
  peach: 'bg-orange-50 text-orange-700',
  lavender: 'bg-purple-50 text-purple-700',
}

export default function MetricComparison({
  title,
  currentPeriod,
  previousPeriod,
  reverseColors = false,
  icon,
  color = 'blue',
  loading = false,
}: MetricComparisonProps) {
  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </Card>
    )
  }

  // Calculate percentage change
  const change =
    previousPeriod.value === 0
      ? 0
      : ((currentPeriod.value - previousPeriod.value) / previousPeriod.value) * 100

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        {icon && <div className="text-gray-400 text-xl">{icon}</div>}
      </div>

      {/* Current Period */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-3xl font-bold text-gray-900">
            {currentPeriod.value.toLocaleString('fr-FR')}
          </span>
          {currentPeriod.unit && (
            <span className="text-lg text-gray-500">{currentPeriod.unit}</span>
          )}
        </div>
        <p className="text-xs text-gray-500">{currentPeriod.label}</p>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 my-4"></div>

      {/* Comparison */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-700">
              {previousPeriod.value.toLocaleString('fr-FR')}
            </span>
            {previousPeriod.unit && (
              <span className="text-xs text-gray-500">{previousPeriod.unit}</span>
            )}
          </div>
          <p className="text-xs text-gray-500">{previousPeriod.label}</p>
        </div>

        <div className={`px-3 py-1.5 rounded-full ${colorClasses[color]}`}>
          <TrendIndicator
            value={change}
            reverseColors={reverseColors}
            showIcon={true}
            size="sm"
          />
        </div>
      </div>
    </Card>
  )
}
