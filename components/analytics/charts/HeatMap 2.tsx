'use client'

import { Card } from '@/components/ui/card'

export interface HeatMapData {
  x: string // X-axis label (e.g., day of week)
  y: string // Y-axis label (e.g., hour)
  value: number
}

export interface HeatMapProps {
  data: HeatMapData[]
  title?: string
  subtitle?: string
  xLabels: string[] // Array of X-axis labels
  yLabels: string[] // Array of Y-axis labels
  minColor?: string // Color for minimum value
  maxColor?: string // Color for maximum value
  formatValue?: (value: number) => string
  loading?: boolean
}

export default function HeatMap({
  data,
  title,
  subtitle,
  xLabels,
  yLabels,
  minColor = '#e0f2fe', // Light blue
  maxColor = '#0369a1', // Dark blue
  formatValue,
  loading = false,
}: HeatMapProps) {
  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          {title && <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>}
          {subtitle && <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>}
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card className="p-6">
        {title && <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>}
        {subtitle && <p className="text-sm text-gray-500 mb-4">{subtitle}</p>}
        <div className="flex items-center justify-center h-96 text-gray-400">
          Aucune donnée disponible
        </div>
      </Card>
    )
  }

  // Find min and max values for color scaling
  const values = data.map((d) => d.value)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)

  // Function to interpolate between two colors
  const interpolateColor = (value: number) => {
    if (maxValue === minValue) return maxColor

    const ratio = (value - minValue) / (maxValue - minValue)

    // Parse hex colors
    const parseHex = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
          }
        : { r: 0, g: 0, b: 0 }
    }

    const minRgb = parseHex(minColor)
    const maxRgb = parseHex(maxColor)

    const r = Math.round(minRgb.r + (maxRgb.r - minRgb.r) * ratio)
    const g = Math.round(minRgb.g + (maxRgb.g - minRgb.g) * ratio)
    const b = Math.round(minRgb.b + (maxRgb.b - minRgb.b) * ratio)

    return `rgb(${r}, ${g}, ${b})`
  }

  // Create a map for quick lookup
  const dataMap = new Map(data.map((d) => [`${d.x}-${d.y}`, d.value]))

  return (
    <Card className="p-6">
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>}
      {subtitle && <p className="text-sm text-gray-500 mb-4">{subtitle}</p>}

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Heatmap grid */}
          <div className="flex">
            {/* Y-axis labels */}
            <div className="flex flex-col justify-between pr-2">
              <div className="h-8"></div> {/* Spacer for X-axis labels */}
              {yLabels.map((label) => (
                <div
                  key={label}
                  className="flex items-center justify-end h-12 text-xs text-gray-600 font-medium"
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Heatmap cells */}
            <div className="flex-1">
              {/* X-axis labels */}
              <div className="flex mb-2">
                {xLabels.map((label) => (
                  <div
                    key={label}
                    className="flex-1 text-center text-xs text-gray-600 font-medium h-8 flex items-center justify-center"
                  >
                    {label}
                  </div>
                ))}
              </div>

              {/* Grid */}
              {yLabels.map((yLabel) => (
                <div key={yLabel} className="flex gap-1 mb-1">
                  {xLabels.map((xLabel) => {
                    const value = dataMap.get(`${xLabel}-${yLabel}`) ?? 0
                    const bgColor = interpolateColor(value)
                    const textColor = value > (maxValue - minValue) / 2 ? 'white' : '#374151'

                    return (
                      <div
                        key={`${xLabel}-${yLabel}`}
                        className="flex-1 h-12 rounded flex items-center justify-center text-xs font-medium transition-transform hover:scale-105 cursor-pointer"
                        style={{
                          backgroundColor: bgColor,
                          color: textColor,
                        }}
                        title={`${xLabel} - ${yLabel}: ${formatValue ? formatValue(value) : value}`}
                      >
                        {formatValue ? formatValue(value) : value}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-2 mt-6">
            <span className="text-xs text-gray-600">Faible</span>
            <div className="flex h-4 w-32 rounded overflow-hidden">
              {[...Array(20)].map((_, i) => {
                const ratio = i / 19
                const value = minValue + (maxValue - minValue) * ratio
                return (
                  <div
                    key={i}
                    className="flex-1"
                    style={{ backgroundColor: interpolateColor(value) }}
                  />
                )
              })}
            </div>
            <span className="text-xs text-gray-600">Élevé</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
