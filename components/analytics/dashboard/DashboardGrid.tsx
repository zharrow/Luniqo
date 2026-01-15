'use client'

import { ReactNode } from 'react'

export interface DashboardGridProps {
  children: ReactNode
  columns?: 1 | 2 | 3 | 4
  gap?: number
  className?: string
}

const columnClasses = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 lg:grid-cols-2',
  3: 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3',
  4: 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-4',
}

export default function DashboardGrid({
  children,
  columns = 3,
  gap = 6,
  className = '',
}: DashboardGridProps) {
  return (
    <div
      className={`grid ${columnClasses[columns]} gap-${gap} ${className}`}
      style={{ gap: `${gap * 0.25}rem` }} // Tailwind gap-6 = 1.5rem = 24px
    >
      {children}
    </div>
  )
}
