import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        primary:
          "border-transparent bg-primary-100 text-primary-700 hover:bg-primary-200",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        danger:
          "border-transparent bg-red-100 text-red-700 hover:bg-red-200",
        success:
          "border-transparent bg-green-100 text-green-700 hover:bg-green-200",
        warning:
          "border-transparent bg-yellow-100 text-yellow-700 hover:bg-yellow-200",
        neutral:
          "border-transparent bg-gray-100 text-gray-700 hover:bg-gray-200",
        outline: "text-foreground",
      },
      size: {
        sm: "text-xs px-2 py-0.5",
        md: "text-sm px-2.5 py-1",
        lg: "text-base px-3 py-1.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

// Count badge (for notifications, etc.)
export function CountBadge({ count }: { count: number }) {
  if (count === 0) return null

  return (
    <span
      className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-gradient-to-br from-red-500 to-red-600 text-white text-xs font-bold rounded-full shadow-lg"
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

export { Badge, badgeVariants }
