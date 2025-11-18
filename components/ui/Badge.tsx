'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  variant?: 'primary' | 'success' | 'danger' | 'warning' | 'neutral'
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
}

const variantClasses = {
  primary: 'bg-primary-100 text-primary-700 border-primary-200',
  success: 'bg-success-100 text-success-700 border-success-200',
  danger: 'bg-danger-100 text-danger-700 border-danger-200',
  warning: 'bg-warning-100 text-warning-700 border-warning-200',
  neutral: 'bg-neutral-100 text-neutral-700 border-neutral-200',
}

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
}

export default function Badge({
  children,
  variant = 'primary',
  size = 'sm',
  animated = false
}: BadgeProps) {
  const Component = animated ? motion.span : 'span'

  const motionProps = animated
    ? {
        initial: { scale: 0 },
        animate: { scale: 1 },
        transition: { type: 'spring' as const, stiffness: 500, damping: 30 },
      }
    : {}

  return (
    <Component
      {...motionProps}
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full border ${variantClasses[variant]} ${sizeClasses[size]}`}
    >
      {children}
    </Component>
  )
}

// Status badge with dot
export function StatusBadge({
  status,
  label
}: {
  status: 'active' | 'inactive' | 'pending'
  label?: string
}) {
  const statusConfig = {
    active: { color: 'bg-success-500', variant: 'success' as const, text: 'Actif' },
    inactive: { color: 'bg-neutral-400', variant: 'neutral' as const, text: 'Inactif' },
    pending: { color: 'bg-warning-500', variant: 'warning' as const, text: 'En attente' },
  }

  const config = statusConfig[status]

  return (
    <Badge variant={config.variant}>
      <span className={`w-2 h-2 rounded-full ${config.color} ${status === 'active' ? 'animate-pulse' : ''}`} />
      {label || config.text}
    </Badge>
  )
}

// Count badge (for notifications, etc.)
export function CountBadge({ count }: { count: number }) {
  if (count === 0) return null

  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-gradient-to-br from-danger-500 to-danger-600 text-white text-xs font-bold rounded-full shadow-lg"
    >
      {count > 99 ? '99+' : count}
    </motion.span>
  )
}
