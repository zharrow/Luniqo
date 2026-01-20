'use client'

import { Card } from '@/components/ui/card'
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps,
  Cell,
} from 'recharts'

export interface BarChartProps {
  data: Array<Record<string, any>>
  bars: Array<{
    dataKey: string
    name: string
    color: string
  }>
  xAxisKey: string
  title?: string
  subtitle?: string
  height?: number
  showLegend?: boolean
  showGrid?: boolean
  stacked?: boolean
  horizontal?: boolean
  formatYAxis?: (value: number) => string
  formatTooltip?: (value: number) => string
  loading?: boolean
  colorByValue?: boolean // Use different colors for each bar
  colors?: string[] // Array of colors for colorByValue mode
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
              className="w-3 h-3 rounded"
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

const defaultColors = ['#5a9dc9', '#f4c2c2', '#b5ead7', '#ffe5b4', '#e0b0ff', '#d4f1a5', '#a0d8d8']

export default function BarChart({
  data,
  bars,
  xAxisKey,
  title,
  subtitle,
  height = 300,
  showLegend = true,
  showGrid = true,
  stacked = false,
  horizontal = false,
  formatYAxis,
  formatTooltip,
  loading = false,
  colorByValue = false,
  colors = defaultColors,
}: BarChartProps) {
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

  const ChartComponent = horizontal ? RechartsBarChart : RechartsBarChart
  const layout = horizontal ? 'horizontal' : 'vertical'

  return (
    <Card className="p-6">
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>}
      {subtitle && <p className="text-sm text-gray-500 mb-4">{subtitle}</p>}

      <ResponsiveContainer width="100%" height={height}>
        <ChartComponent
          data={data}
          layout={layout}
          margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
        >
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
          {horizontal ? (
            <>
              <XAxis
                type="number"
                tick={{ fill: '#6b7280', fontSize: 12 }}
                tickLine={{ stroke: '#e5e7eb' }}
                tickFormatter={formatYAxis}
              />
              <YAxis
                type="category"
                dataKey={xAxisKey}
                tick={{ fill: '#6b7280', fontSize: 12 }}
                tickLine={{ stroke: '#e5e7eb' }}
              />
            </>
          ) : (
            <>
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
            </>
          )}
          <Tooltip content={<CustomTooltip formatTooltip={formatTooltip} />} />
          {showLegend && (
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value) => <span className="text-sm text-gray-600">{value}</span>}
            />
          )}
          {bars.map((bar) => (
            <Bar
              key={bar.dataKey}
              dataKey={bar.dataKey}
              stackId={stacked ? 'stack' : undefined}
              fill={bar.color}
              name={bar.name}
              radius={[4, 4, 0, 0]}
            >
              {colorByValue && data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          ))}
        </ChartComponent>
      </ResponsiveContainer>
    </Card>
  )
}
