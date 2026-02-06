'use client'

import { Card } from '@/components/ui/card'
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts'

export interface PieChartData {
  name: string
  value: number
  color?: string
}

export interface PieChartProps {
  data: PieChartData[]
  title?: string
  subtitle?: string
  height?: number
  showLegend?: boolean
  showLabels?: boolean
  innerRadius?: number // For donut chart (0 for full pie)
  colors?: string[]
  formatTooltip?: (value: number) => string
  loading?: boolean
}

const defaultColors = [
  '#5a9dc9', // Blue
  '#f4c2c2', // Pink
  '#b5ead7', // Mint
  '#ffe5b4', // Peach
  '#e0b0ff', // Lavender
  '#d4f1a5', // Lime
  '#a0d8d8', // Turquoise
  '#ffd4a3', // Orange
  '#c9c9ff', // Periwinkle
  '#ffb3ba', // Light pink
]

const CustomTooltip = ({
  active,
  payload,
  formatTooltip,
}: TooltipProps<number, string> & { formatTooltip?: (value: number) => string }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: data.color }}
          />
          <span className="font-medium text-gray-900">{data.name}</span>
        </div>
        <p className="text-sm text-gray-600">
          Valeur: <span className="font-medium">{formatTooltip ? formatTooltip(data.value) : data.value}</span>
        </p>
        {data.percentage && (
          <p className="text-sm text-gray-600">
            Pourcentage: <span className="font-medium">{data.percentage}%</span>
          </p>
        )}
      </div>
    )
  }
  return null
}

const renderCustomLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: any) => {
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  if (percent < 0.05) return null // Don't show labels for segments < 5%

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="text-sm font-medium"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export default function PieChart({
  data,
  title,
  subtitle,
  height = 300,
  showLegend = true,
  showLabels = true,
  innerRadius = 0,
  colors = defaultColors,
  formatTooltip,
  loading = false,
}: PieChartProps) {
  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          {title && <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>}
          {subtitle && <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>}
          <div className="h-64 bg-gray-200 rounded-full mx-auto" style={{ maxWidth: '256px' }}></div>
        </div>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card className="p-6">
        {title && <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>}
        {subtitle && <p className="text-sm text-gray-500 mb-4">{subtitle}</p>}
        <div className="flex items-center justify-center h-64 text-gray-400">
          Aucune donnée disponible
        </div>
      </Card>
    )
  }

  // Calculate percentages and assign colors
  const total = data.reduce((sum, item) => sum + item.value, 0)
  const enrichedData = data.map((item, index) => ({
    ...item,
    color: item.color || colors[index % colors.length],
    percentage: ((item.value / total) * 100).toFixed(1),
  }))

  return (
    <Card className="p-6">
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>}
      {subtitle && <p className="text-sm text-gray-500 mb-4">{subtitle}</p>}

      <ResponsiveContainer width="100%" height={height}>
        <RechartsPieChart>
          <Pie
            data={enrichedData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={showLabels ? renderCustomLabel : false}
            outerRadius={80}
            innerRadius={innerRadius}
            fill="#8884d8"
            dataKey="value"
          >
            {enrichedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip formatTooltip={formatTooltip} />} />
          {showLegend && (
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => <span className="text-sm text-gray-600">{value}</span>}
            />
          )}
        </RechartsPieChart>
      </ResponsiveContainer>
    </Card>
  )
}
