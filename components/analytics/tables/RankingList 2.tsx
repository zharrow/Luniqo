'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export interface RankingItem {
  rank: number
  label: string
  value: number
  subLabel?: string
  icon?: React.ReactNode
  percentage?: number
}

export interface RankingListProps {
  items: RankingItem[]
  title?: string
  subtitle?: string
  unit?: string
  showPercentages?: boolean
  maxItems?: number
  highlightTop?: number // Highlight top N items
  color?: 'blue' | 'pink' | 'mint' | 'peach' | 'lavender'
  loading?: boolean
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    badge: 'bg-blue-100 text-blue-700',
  },
  pink: {
    bg: 'bg-pink-50',
    text: 'text-pink-700',
    badge: 'bg-pink-100 text-pink-700',
  },
  mint: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    badge: 'bg-green-100 text-green-700',
  },
  peach: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    badge: 'bg-orange-100 text-orange-700',
  },
  lavender: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    badge: 'bg-purple-100 text-purple-700',
  },
}

const getRankBadge = (rank: number) => {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return null
}

export default function RankingList({
  items,
  title = 'Classement',
  subtitle,
  unit = '',
  showPercentages = true,
  maxItems = 10,
  highlightTop = 3,
  color = 'blue',
  loading = false,
}: RankingListProps) {
  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          {title && <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>}
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    )
  }

  if (!items || items.length === 0) {
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

  const colors = colorClasses[color]
  const displayItems = items.slice(0, maxItems)
  const maxValue = Math.max(...displayItems.map((item) => item.value))

  return (
    <Card className="p-6">
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>}
      {subtitle && <p className="text-sm text-gray-500 mb-4">{subtitle}</p>}

      <div className="space-y-3">
        {displayItems.map((item) => {
          const isHighlighted = item.rank <= highlightTop
          const rankBadge = getRankBadge(item.rank)
          const barWidth = (item.value / maxValue) * 100

          return (
            <div
              key={item.rank}
              className={`rounded-lg p-4 transition-all duration-200 ${
                isHighlighted
                  ? `${colors.bg} border-2 ${colors.text.replace('text-', 'border-')}`
                  : 'bg-gray-50 border border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                {/* Rank */}
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                    isHighlighted ? colors.badge : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {rankBadge || item.rank}
                </div>

                {/* Icon (if provided) */}
                {item.icon && <div className="text-xl">{item.icon}</div>}

                {/* Label and value */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <h4 className="font-medium text-gray-900 truncate">{item.label}</h4>
                    <div className="flex items-baseline gap-1 shrink-0">
                      <span className="text-lg font-bold text-gray-900">
                        {item.value.toLocaleString('fr-FR')}
                      </span>
                      {unit && <span className="text-sm text-gray-600">{unit}</span>}
                    </div>
                  </div>

                  {item.subLabel && (
                    <p className="text-xs text-gray-500 mb-2">{item.subLabel}</p>
                  )}

                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        isHighlighted ? colors.text.replace('text-', 'bg-') : 'bg-gray-400'
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>

                {/* Percentage */}
                {showPercentages && item.percentage !== undefined && (
                  <Badge variant={isHighlighted ? 'default' : 'secondary'}>
                    {item.percentage.toFixed(1)}%
                  </Badge>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {items.length > maxItems && (
        <p className="text-sm text-gray-500 text-center mt-4">
          +{items.length - maxItems} autre{items.length - maxItems > 1 ? 's' : ''}
        </p>
      )}
    </Card>
  )
}
