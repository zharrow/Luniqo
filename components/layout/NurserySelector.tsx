'use client'

import { BuildingOffice2Icon } from '@heroicons/react/24/outline'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useNursery } from '@/lib/contexts/NurseryContext'

export default function NurserySelector() {
  const { selectedNursery, nurseries, setSelectedNursery, isLoading } = useNursery()

  // Hide only if loading or no nurseries at all
  if (isLoading || nurseries.length === 0) {
    return null
  }

  // If only one nursery, show it as read-only label
  if (nurseries.length === 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-white/50 rounded-lg border border-border/50 backdrop-blur-sm">
        <BuildingOffice2Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className="text-sm text-foreground font-medium">
          {selectedNursery?.name || nurseries[0].name}
        </span>
      </div>
    )
  }

  // Multiple nurseries - show dropdown selector
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/50 rounded-lg border border-border/50 backdrop-blur-sm">
      <BuildingOffice2Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <Select
        value={selectedNursery?.id || 'none'}
        onValueChange={(value) => {
          const nursery = nurseries.find(n => n.id === value)
          if (nursery) {
            setSelectedNursery(nursery)
          }
        }}
      >
        <SelectTrigger className="h-8 w-[280px] border-0 bg-transparent shadow-none focus:ring-0 text-sm">
          <SelectValue placeholder="Sélectionner une crèche" />
        </SelectTrigger>
        <SelectContent>
          {nurseries.map((nursery) => (
            <SelectItem key={nursery.id} value={nursery.id}>
              <div className="flex items-center gap-2">
                <span>{nursery.name}</span>
                {nursery.is_default && (
                  <span className="text-xs text-muted-foreground">(Par défaut)</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
