import { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface KanbanColumn {
  id: string
  title: string
  items: any[]
  color?: string
}

interface KanbanBoardProps {
  columns: KanbanColumn[]
  renderItem: (item: any) => ReactNode
  emptyMessage?: string
  className?: string
}

export function KanbanBoard({
  columns,
  renderItem,
  emptyMessage = 'Aucun élément',
  className
}: KanbanBoardProps) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4', className)}>
      {columns.map((column) => (
        <div key={column.id} className="flex flex-col">
          {/* Column header */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1">
              <div className={cn('w-3 h-3 rounded-full', column.color || 'bg-primary')} />
              <h3 className="font-semibold text-sm">{column.title}</h3>
              <span className="text-xs text-muted-foreground ml-auto">
                {column.items.length}
              </span>
            </div>
          </div>

          {/* Items */}
          <div className="flex-1 space-y-2">
            {column.items.length === 0 ? (
              <Card className="p-6 text-center">
                <p className="text-xs text-muted-foreground">{emptyMessage}</p>
              </Card>
            ) : (
              column.items.map((item) => (
                <div key={item.id}>
                  {renderItem(item)}
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  )
}