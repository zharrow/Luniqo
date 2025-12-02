import { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface CompactListProps {
  children: ReactNode
  className?: string
}

interface CompactListItemProps {
  icon?: ReactNode
  title: string
  description?: string
  metadata?: Array<{
    label: string
    color?: 'primary' | 'accent' | 'success' | 'danger' | 'neutral'
  }>
  badge?: ReactNode
  actions?: ReactNode
  inactive?: boolean
  className?: string
  onClick?: () => void
}

const CompactList = ({ children, className }: CompactListProps) => {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <div className="divide-y divide-border">
        {children}
      </div>
    </Card>
  )
}

const CompactListItem = ({
  icon,
  title,
  description,
  metadata,
  badge,
  actions,
  inactive = false,
  className,
  onClick
}: CompactListItemProps) => {
  const colorMap = {
    primary: 'bg-primary/60',
    accent: 'bg-accent/60',
    success: 'bg-success/60',
    danger: 'bg-danger/60',
    neutral: 'bg-muted-foreground/60'
  }

  return (
    <div
      className={cn(
        'group relative px-4 py-3.5 transition-all duration-200',
        'hover:bg-muted/50',
        inactive && 'opacity-50',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {/* Hover gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div className="relative flex items-center gap-3">
        {/* Icon with glow effect */}
        {icon && (
          <div className="flex-shrink-0">
            <div className="relative w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-all duration-300 group-hover:scale-110">
              {icon}
              {/* Subtle glow on hover */}
              <div className="absolute inset-0 rounded-lg bg-primary/20 blur-md opacity-0 group-hover:opacity-50 transition-opacity duration-300" />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-sm leading-tight truncate group-hover:text-primary transition-colors">
              {title}
            </h3>
            {badge && <div className="flex-shrink-0">{badge}</div>}
          </div>

          {/* Description */}
          {description && (
            <p className="text-xs text-muted-foreground line-clamp-1 mb-1.5">
              {description}
            </p>
          )}

          {/* Metadata */}
          {metadata && metadata.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {metadata.map((item, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <div className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    colorMap[item.color || 'primary']
                  )} />
                  <span className="truncate">{item.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {actions}
          </div>
        )}
      </div>

      {/* Subtle bottom border highlight on hover */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  )
}

// Composant pour l'état vide
interface CompactListEmptyProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

const CompactListEmpty = ({
  icon,
  title,
  description,
  action
}: CompactListEmptyProps) => {
  return (
    <Card className="p-12 text-center">
      {icon && (
        <div className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-muted-foreground mb-4">
          {description}
        </p>
      )}
      {action}
    </Card>
  )
}

export { CompactList, CompactListItem, CompactListEmpty }
export type { CompactListProps, CompactListItemProps, CompactListEmptyProps }