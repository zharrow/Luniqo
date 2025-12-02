import { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface CardGridProps {
  children: ReactNode
  className?: string
  columns?: {
    mobile?: 1 | 2 | 3
    tablet?: 1 | 2 | 3 | 4
    desktop?: 1 | 2 | 3 | 4 | 5
  }
}

interface CardGridItemProps {
  icon?: ReactNode
  title: string
  subtitle?: string
  description?: string
  footer?: ReactNode
  actions?: ReactNode
  badge?: ReactNode
  inactive?: boolean
  className?: string
  onClick?: () => void
}

export function CardGrid({
  children,
  className,
  columns = { mobile: 1, tablet: 2, desktop: 3 }
}: CardGridProps) {
  const gridCols = cn(
    'grid gap-4',
    columns.mobile === 1 && 'grid-cols-1',
    columns.mobile === 2 && 'grid-cols-2',
    columns.mobile === 3 && 'grid-cols-3',
    columns.tablet === 1 && 'md:grid-cols-1',
    columns.tablet === 2 && 'md:grid-cols-2',
    columns.tablet === 3 && 'md:grid-cols-3',
    columns.tablet === 4 && 'md:grid-cols-4',
    columns.desktop === 1 && 'lg:grid-cols-1',
    columns.desktop === 2 && 'lg:grid-cols-2',
    columns.desktop === 3 && 'lg:grid-cols-3',
    columns.desktop === 4 && 'lg:grid-cols-4',
    columns.desktop === 5 && 'lg:grid-cols-5'
  )

  return <div className={cn(gridCols, className)}>{children}</div>
}

export function CardGridItem({
  icon,
  title,
  subtitle,
  description,
  footer,
  actions,
  badge,
  inactive = false,
  className,
  onClick
}: CardGridItemProps) {
  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-300',
        'hover:shadow-lg hover:-translate-y-1',
        inactive && 'opacity-50',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {icon && (
              <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                {icon}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base mb-0.5 truncate group-hover:text-primary transition-colors">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-muted-foreground truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {badge && <div className="flex-shrink-0 ml-2">{badge}</div>}
        </div>

        {/* Description */}
        {description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {description}
          </p>
        )}

        {/* Footer */}
        {footer && (
          <div className="pt-3 border-t border-border/50">
            {footer}
          </div>
        )}

        {/* Actions (overlay) */}
        {actions && (
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {actions}
          </div>
        )}
      </div>

      {/* Accent bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </Card>
  )
}