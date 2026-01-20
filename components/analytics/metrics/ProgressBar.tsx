'use client'

export interface ProgressBarProps {
  value: number // Current value
  max: number // Maximum value
  label?: string
  showPercentage?: boolean
  showValues?: boolean
  unit?: string
  color?: 'blue' | 'pink' | 'mint' | 'peach' | 'lavender' | 'lime' | 'turquoise' | 'red' | 'orange' | 'green'
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
}

const colorClasses = {
  blue: 'bg-blue-500',
  pink: 'bg-pink-500',
  mint: 'bg-green-500',
  peach: 'bg-orange-400',
  lavender: 'bg-purple-500',
  lime: 'bg-lime-500',
  turquoise: 'bg-cyan-500',
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  green: 'bg-green-600',
}

const sizeClasses = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
}

export default function ProgressBar({
  value,
  max,
  label,
  showPercentage = true,
  showValues = false,
  unit = '',
  color = 'blue',
  size = 'md',
  animated = false,
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))
  const colorClass = colorClasses[color]
  const sizeClass = sizeClasses[size]

  return (
    <div className="w-full">
      {/* Header */}
      {(label || showPercentage || showValues) && (
        <div className="flex items-center justify-between mb-2">
          {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {showValues && (
              <span>
                {value.toLocaleString('fr-FR')} / {max.toLocaleString('fr-FR')} {unit}
              </span>
            )}
            {showPercentage && (
              <span className="font-medium">{percentage.toFixed(0)}%</span>
            )}
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeClass}`}>
        <div
          className={`h-full rounded-full ${colorClass} ${
            animated ? 'transition-all duration-500 ease-out' : ''
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
