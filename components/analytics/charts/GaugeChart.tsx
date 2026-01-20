'use client'

import { Card } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

export interface GaugeChartProps {
  value: number // Current value (0-100 or actual number)
  max?: number // Maximum value (default 100)
  min?: number // Minimum value (default 0)
  title?: string
  subtitle?: string
  label?: string // Label to show in center
  unit?: string // Unit (%, €, etc.)
  height?: number
  colorRanges?: Array<{
    min: number
    max: number
    color: string
  }>
  loading?: boolean
}

const defaultColorRanges = [
  { min: 0, max: 30, color: '#ef4444' }, // Red (poor)
  { min: 30, max: 70, color: '#f59e0b' }, // Orange (average)
  { min: 70, max: 100, color: '#10b981' }, // Green (good)
]

export default function GaugeChart({
  value,
  max = 100,
  min = 0,
  title,
  subtitle,
  label,
  unit = '%',
  height = 200,
  colorRanges = defaultColorRanges,
  loading = false,
}: GaugeChartProps) {
  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          {title && <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>}
          {subtitle && <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>}
          <div className="h-40 bg-gray-200 rounded-full mx-auto" style={{ maxWidth: '200px' }}></div>
        </div>
      </Card>
    )
  }

  // Normalize value to 0-100 range
  const normalizedValue = ((value - min) / (max - min)) * 100
  const clampedValue = Math.max(0, Math.min(100, normalizedValue))

  // Determine color based on value
  const getColor = (val: number) => {
    const range = colorRanges.find((r) => val >= r.min && val <= r.max)
    return range?.color || '#9ca3af'
  }

  const color = getColor(clampedValue)

  // Data for the gauge (semi-circle)
  const data = [
    { name: 'value', value: clampedValue },
    { name: 'empty', value: 100 - clampedValue },
  ]

  return (
    <Card className="p-6">
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>}
      {subtitle && <p className="text-sm text-gray-500 mb-4">{subtitle}</p>}

      <div className="relative" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="80%"
              startAngle={180}
              endAngle={0}
              innerRadius="70%"
              outerRadius="100%"
              dataKey="value"
              stroke="none"
            >
              <Cell fill={color} />
              <Cell fill="#e5e7eb" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center pb-8">
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-900">
              {value.toFixed(0)}
              {unit}
            </div>
            {label && <div className="text-sm text-gray-500 mt-1">{label}</div>}
          </div>
        </div>
      </div>

      {/* Color legend */}
      <div className="flex items-center justify-center gap-4 mt-4">
        {colorRanges.map((range, index) => (
          <div key={index} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: range.color }}
            />
            <span className="text-xs text-gray-600">
              {range.min}-{range.max}{unit}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}
