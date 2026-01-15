'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

export interface WidgetOption {
  id: string
  name: string
  description: string
  category: 'financial' | 'occupancy' | 'staff' | 'haccp' | 'parent' | 'general'
  icon: React.ElementType
  size: 'small' | 'medium' | 'large'
}

export interface WidgetPickerProps {
  open: boolean
  onClose: () => void
  onSelectWidget: (widgetId: string) => void
  availableWidgets: WidgetOption[]
  selectedWidgetIds?: string[]
}

const categoryLabels = {
  financial: 'Financier',
  occupancy: 'Occupation',
  staff: 'Personnel',
  haccp: 'HACCP',
  parent: 'Parents',
  general: 'Général',
}

const categoryColors = {
  financial: 'bg-blue-100 text-blue-700',
  occupancy: 'bg-green-100 text-green-700',
  staff: 'bg-purple-100 text-purple-700',
  haccp: 'bg-orange-100 text-orange-700',
  parent: 'bg-pink-100 text-pink-700',
  general: 'bg-gray-100 text-gray-700',
}

export default function WidgetPicker({
  open,
  onClose,
  onSelectWidget,
  availableWidgets,
  selectedWidgetIds = [],
}: WidgetPickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Filter widgets
  const filteredWidgets = availableWidgets.filter((widget) => {
    const matchesSearch =
      !searchQuery ||
      widget.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      widget.description.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = !selectedCategory || widget.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  // Group by category
  const categories = Array.from(new Set(availableWidgets.map((w) => w.category)))

  const handleSelectWidget = (widgetId: string) => {
    onSelectWidget(widgetId)
    onClose()
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-4xl max-h-[80vh] overflow-y-auto">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Ajouter un widget</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <XMarkIcon className="h-5 w-5" />
              </Button>
            </div>

            {/* Search and filters */}
            <div className="space-y-4 mb-6">
              <Input
                type="text"
                placeholder="Rechercher un widget..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              {/* Category filter */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedCategory === null ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                >
                  Tous
                </Button>
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                  >
                    {categoryLabels[category]}
                  </Button>
                ))}
              </div>
            </div>

            {/* Widget grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredWidgets.map((widget) => {
                const Icon = widget.icon
                const isSelected = selectedWidgetIds.includes(widget.id)

                return (
                  <button
                    key={widget.id}
                    onClick={() => handleSelectWidget(widget.id)}
                    disabled={isSelected}
                    className={`text-left p-4 border-2 rounded-lg transition-all ${
                      isSelected
                        ? 'border-gray-300 bg-gray-50 cursor-not-allowed opacity-60'
                        : 'border-gray-200 hover:border-blue-500 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${categoryColors[widget.category]}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 text-sm">{widget.name}</h4>
                        <p className="text-xs text-gray-500 mt-1">{widget.description}</p>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="text-xs text-gray-500 mt-2">Déjà ajouté</div>
                    )}
                  </button>
                )
              })}
            </div>

            {filteredWidgets.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Aucun widget trouvé
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  )
}
