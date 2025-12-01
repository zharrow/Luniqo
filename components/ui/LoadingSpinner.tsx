'use client'

import { motion } from 'framer-motion'

interface LoadingSpinnerProps {
 size?: 'sm' | 'md' | 'lg'
 color?: 'primary' | 'white' | 'neutral'
}

const sizeClasses = {
 sm: 'w-4 h-4',
 md: 'w-8 h-8',
 lg: 'w-12 h-12',
}

const colorClasses = {
 primary: 'border-primary-500',
 white: 'border-white',
 neutral: 'border-neutral-500',
}

export default function LoadingSpinner({ size = 'md', color = 'primary' }: LoadingSpinnerProps) {
 return (
 <motion.div
 animate={{ rotate: 360 }}
 transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
 className={`${sizeClasses[size]} border-2 ${colorClasses[color]} border-t-transparent rounded-full`}
 />
 )
}

// Full page loading
export function LoadingPage() {
 return (
 <div className="min-h-screen flex items-center justify-center bg-neutral-50">
 <div className="text-center">
 <LoadingSpinner size="lg" />
 <p className="mt-4 text-neutral-600 font-medium">Chargement...</p>
 </div>
 </div>
 )
}

// Inline loading with text
export function LoadingInline({ text = 'Chargement...' }: { text?: string }) {
 return (
 <div className="flex items-center gap-3">
 <LoadingSpinner size="sm" />
 <span className="text-sm text-neutral-600">{text}</span>
 </div>
 )
}
