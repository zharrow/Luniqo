'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  ArrowDownTrayIcon,
  DocumentArrowDownIcon,
  TableCellsIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'

export interface ExportButtonProps {
  onExport: (format: 'pdf' | 'excel' | 'csv') => Promise<void> | void
  formats?: Array<'pdf' | 'excel' | 'csv'>
  label?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg'
  className?: string
  disabled?: boolean
}

const formatIcons = {
  pdf: DocumentArrowDownIcon,
  excel: TableCellsIcon,
  csv: DocumentTextIcon,
}

const formatLabels = {
  pdf: 'PDF',
  excel: 'Excel',
  csv: 'CSV',
}

export default function ExportButton({
  onExport,
  formats = ['pdf', 'excel', 'csv'],
  label = 'Exporter',
  variant = 'outline',
  size = 'default',
  className = '',
  disabled = false,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    setIsExporting(true)
    setShowDropdown(false)

    try {
      await onExport(format)
    } catch (error) {
      console.error('Export error:', error)
    } finally {
      setIsExporting(false)
    }
  }

  // Single format - direct button
  if (formats.length === 1) {
    const format = formats[0]
    const Icon = formatIcons[format]

    return (
      <Button
        variant={variant}
        size={size}
        onClick={() => handleExport(format)}
        disabled={disabled || isExporting}
        className={className}
      >
        <Icon className="h-4 w-4 mr-2" />
        {isExporting ? 'Export...' : `${label} ${formatLabels[format]}`}
      </Button>
    )
  }

  // Multiple formats - dropdown
  return (
    <div className="relative inline-block">
      <Button
        variant={variant}
        size={size}
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={disabled || isExporting}
        className={className}
      >
        <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
        {isExporting ? 'Export...' : label}
      </Button>

      {showDropdown && !isExporting && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />

          {/* Dropdown menu */}
          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
            {formats.map((format) => {
              const Icon = formatIcons[format]
              return (
                <button
                  key={format}
                  onClick={() => handleExport(format)}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <Icon className="h-4 w-4" />
                  <span>Exporter en {formatLabels[format]}</span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
