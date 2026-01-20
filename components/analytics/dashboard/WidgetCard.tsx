'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EllipsisVerticalIcon, XMarkIcon, ArrowsPointingOutIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'

export interface WidgetCardProps {
  id: string
  title: string
  subtitle?: string
  children: React.ReactNode
  onRemove?: (id: string) => void
  onRefresh?: (id: string) => void
  onExpand?: (id: string) => void
  isRefreshing?: boolean
  className?: string
}

export default function WidgetCard({
  id,
  title,
  subtitle,
  children,
  onRemove,
  onRefresh,
  onExpand,
  isRefreshing = false,
  className = '',
}: WidgetCardProps) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <Card className={`relative ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between p-4 pb-2 border-b border-gray-100">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>

        {/* Actions menu */}
        <div className="relative ml-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMenu(!showMenu)}
            className="h-6 w-6 p-0"
          >
            <EllipsisVerticalIcon className="h-4 w-4" />
          </Button>

          {showMenu && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />

              {/* Dropdown */}
              <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                {onRefresh && (
                  <button
                    onClick={() => {
                      onRefresh(id)
                      setShowMenu(false)
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    disabled={isRefreshing}
                  >
                    {isRefreshing ? 'Actualisation...' : 'Actualiser'}
                  </button>
                )}
                {onExpand && (
                  <button
                    onClick={() => {
                      onExpand(id)
                      setShowMenu(false)
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                  >
                    <ArrowsPointingOutIcon className="h-4 w-4" />
                    Agrandir
                  </button>
                )}
                {onRemove && (
                  <button
                    onClick={() => {
                      onRemove(id)
                      setShowMenu(false)
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                  >
                    <XMarkIcon className="h-4 w-4" />
                    Retirer
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isRefreshing ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          children
        )}
      </div>
    </Card>
  )
}
