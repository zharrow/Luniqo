'use client'

import { Card } from '@/components/ui/card'
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts'

export interface LineChartProps {
  data: Array<Record<string, any>>
  lines: Array<{
    dataKey: string
    name: string
    color: string
    strokeWidth?: number
  }>
  xAxisKey: string
  title?: string
  subtitle?: string
  height?: number
  showLegend?: boolean
  showGrid?: boolean
  formatYAxis?: (value: number) => string
  formatTooltip?: (value: number) => string
  loading?: boolean
}

const CustomTooltip = ({
  active,
  payload,
  label,
  formatTooltip,
}: TooltipProps<number, string> & { formatTooltip?: (value: number) => string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="font-medium text-gray-900 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600">{entry.name}:</span>
            <span className="font-medium text-gray-900">
              {formatTooltip ? formatTooltip(entry.value as number) : entry.value}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export default function LineChart({
  data,
  lines,
  xAxisKey,
  title,
  subtitle,
  height = 300,
  showLegend = true,
  showGrid = true,
  formatYAxis,
  formatTooltip,
  loading = false,
}: LineChartProps) {
  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          {title && <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>}
          {subtitle && <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>}
          <div className="h-64 bg-gray-200 rounded"></div>
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

  return (
    <Card className="p-6">
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>}
      {subtitle && <p className="text-sm text-gray-500 mb-4">{subtitle}</p>}

      <ResponsiveContainer width="100%" height={height}>
        <RechartsLineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
          <XAxis
            dataKey={xAxisKey}
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickLine={{ stroke: '#e5e7eb' }}
            tickFormatter={formatYAxis}
          />
          <Tooltip content={<CustomTooltip formatTooltip={formatTooltip} />} />
          {showLegend && (
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
              formatter={(value) => <span className="text-sm text-gray-600">{value}</span>}
            />
          )}
          {lines.map((line) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              stroke={line.color}
              strokeWidth={line.strokeWidth || 2}
              name={line.name}
              dot={{ fill: line.color, r: 4 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </Card>
  )
}
