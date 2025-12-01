'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface EmptyStateProps {
 icon?: ReactNode
 title: string
 description?: string
 action?: {
 label: string
 onClick: () => void
 }
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
 return (
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 className="flex flex-col items-center justify-center py-12 px-6 text-center"
 >
 {icon && (
 <motion.div
 initial={{ scale: 0 }}
 animate={{ scale: 1 }}
 transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
 className="w-20 h-20 rounded-full bg-neutral-100 flex items-center justify-center mb-4 text-neutral-400"
 >
 {icon}
 </motion.div>
 )}

 <h3 className="text-lg font-bold text-neutral-900 mb-2">{title}</h3>

 {description && (
 <p className="text-sm text-neutral-600 max-w-md mb-6">
 {description}
 </p>
 )}

 {action && (
 <motion.button
 whileHover={{ scale: 1.05 }}
 whileTap={{ scale: 0.95 }}
 onClick={action.onClick}
 className="btn-primary"
 >
 {action.label}
 </motion.button>
 )}
 </motion.div>
 )
}
