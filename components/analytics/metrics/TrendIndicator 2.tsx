'use client'

import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, MinusIcon } from '@heroicons/react/24/outline'

export interface TrendIndicatorProps {
  value: number
  suffix?: string
  showIcon?: boolean
  size?: 'sm' | 'md' | 'lg'
  reverseColors?: boolean // For metrics where down is good (e.g., costs, incidents)
}

const sizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
}

const iconSizes = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
}

export default function TrendIndicator({
  value,
  suffix = '%',
  showIcon = true,
  size = 'md',
  reverseColors = false,
}: TrendIndicatorProps) {
  const isPositive = value > 0
  const isNeutral = value === 0

  // Determine color based on trend and reverseColors flag
  const getColorClass = () => {
    if (isNeutral) return 'text-gray-500'
    if (reverseColors) {
      return isPositive ? 'text-red-500' : 'text-green-600'
    }
    return isPositive ? 'text-green-600' : 'text-red-500'
  }

  const colorClass = getColorClass()
  const sizeClass = sizeClasses[size]
  const iconSizeClass = iconSizes[size]

  const formattedValue = Math.abs(value).toFixed(1)

  return (
    <span className={`inline-flex items-center gap-1 font-medium ${sizeClass} ${colorClass}`}>
      {showIcon && (
        <>
          {isNeutral ? (
            <MinusIcon className={iconSizeClass} />
          ) : isPositive ? (
            <ArrowTrendingUpIcon className={iconSizeClass} />
          ) : (
            <ArrowTrendingDownIcon className={iconSizeClass} />
          )}
        </>
      )}
      <span>
        {isPositive && '+'}
        {formattedValue}
        {suffix}
      </span>
    </span>
  )
}
