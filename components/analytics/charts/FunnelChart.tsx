'use client'

import { Card } from '@/components/ui/card'

export interface FunnelChartData {
  name: string
  value: number
  color?: string
}

export interface FunnelChartProps {
  data: FunnelChartData[]
  title?: string
  subtitle?: string
  height?: number
  showPercentages?: boolean
  showConversionRates?: boolean
  colors?: string[]
  loading?: boolean
}

const defaultColors = [
  '#5a9dc9', // Blue
  '#7db3d7', // Lighter blue
  '#9fc9e5', // Even lighter
  '#b5ead7', // Mint
  '#d4f1a5', // Lime
]

export default function FunnelChart({
  data,
  title,
  subtitle,
  height = 400,
  showPercentages = true,
  showConversionRates = true,
  colors = defaultColors,
  loading = false,
}: FunnelChartProps) {
  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          {title && <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>}
          {subtitle && <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>}
          <div className="h-80 bg-gray-200 rounded"></div>
        </div>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card className="p-6">
        {title && <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>}
        {subtitle && <p className="text-sm text-gray-500 mb-4">{subtitle}</p>}
        <div className="flex items-center justify-center h-80 text-gray-400">
          Aucune donnée disponible
        </div>
      </Card>
    )
  }

  const maxValue = Math.max(...data.map((d) => d.value))

  return (
    <Card className="p-6">
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>}
      {subtitle && <p className="text-sm text-gray-500 mb-4">{subtitle}</p>}

      <div className="relative" style={{ height }}>
        <div className="flex flex-col justify-center h-full gap-3 py-4">
          {data.map((item, index) => {
            const percentage = (item.value / maxValue) * 100
            const conversionRate =
              index > 0 ? ((item.value / data[index - 1].value) * 100).toFixed(1) : null
            const color = item.color || colors[index % colors.length]

            return (
              <div key={index} className="relative">
                {/* Funnel segment */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div
                      className="relative h-16 rounded-lg shadow-sm flex items-center justify-between px-6 transition-all duration-300 hover:shadow-md"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: color,
                        marginLeft: `${(100 - percentage) / 2}%`,
                      }}
                    >
                      <span className="text-white font-medium text-sm">{item.name}</span>
                      <div className="text-right">
                        <div className="text-white font-bold text-lg">
                          {item.value.toLocaleString('fr-FR')}
                        </div>
                        {showPercentages && (
                          <div className="text-white text-xs opacity-90">
                            {((item.value / data[0].value) * 100).toFixed(1)}%
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Conversion rate arrow */}
                {showConversionRates && conversionRate && index > 0 && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-10">
                    <div className="bg-gray-700 text-white text-xs px-2 py-1 rounded-full whitespace-nowrap">
                      {conversionRate}%
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Summary */}
      {data.length > 1 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Taux de conversion global:</span>
            <span className="font-bold text-gray-900">
              {((data[data.length - 1].value / data[0].value) * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </Card>
  )
}
