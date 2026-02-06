'use client'

import { Card } from '@/components/ui/card'
import TrendIndicator from './TrendIndicator'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

export interface KPICardProps {
  title: string
  value: string | number
  unit?: string
  icon?: React.ReactNode
  trend?: number // Percentage change
  trendLabel?: string // e.g., "vs last month"
  reverseColors?: boolean // For metrics where down is good
  sparklineData?: Array<{ value: number }> // Mini chart data
  color?: 'blue' | 'pink' | 'mint' | 'peach' | 'lavender' | 'lime' | 'turquoise'
  loading?: boolean
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-50',
    icon: 'text-blue-600',
    sparkline: '#5a9dc9',
  },
  pink: {
    bg: 'bg-pink-50',
    icon: 'text-pink-600',
    sparkline: '#f4c2c2',
  },
  mint: {
    bg: 'bg-green-50',
    icon: 'text-green-600',
    sparkline: '#b5ead7',
  },
  peach: {
    bg: 'bg-orange-50',
    icon: 'text-orange-600',
    sparkline: '#ffe5b4',
  },
  lavender: {
    bg: 'bg-purple-50',
    icon: 'text-purple-600',
    sparkline: '#e0b0ff',
  },
  lime: {
    bg: 'bg-lime-50',
    icon: 'text-lime-600',
    sparkline: '#d4f1a5',
  },
  turquoise: {
    bg: 'bg-cyan-50',
    icon: 'text-cyan-600',
    sparkline: '#a0d8d8',
  },
}

export default function KPICard({
  title,
  value,
  unit,
  icon,
  trend,
  trendLabel,
  reverseColors = false,
  sparklineData,
  color = 'blue',
  loading = false,
}: KPICardProps) {
  const colors = colorClasses[color]

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/3"></div>
        </div>
      </Card>
    )
  }

  return (
    <Card className={`p-6 ${colors.bg} border-none shadow-sm hover:shadow-md transition-shadow duration-200`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">{value}</span>
            {unit && <span className="text-lg text-gray-500">{unit}</span>}
          </div>
        </div>
        {icon && <div className={`${colors.icon} text-2xl`}>{icon}</div>}
      </div>

      <div className="flex items-center justify-between">
        <div>
          {trend !== undefined && (
            <div className="flex items-center gap-2">
              <TrendIndicator value={trend} reverseColors={reverseColors} size="sm" />
              {trendLabel && <span className="text-xs text-gray-500">{trendLabel}</span>}
            </div>
          )}
        </div>

        {sparklineData && sparklineData.length > 0 && (
          <div className="w-24 h-12">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparklineData}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={colors.sparkline}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  )
}
