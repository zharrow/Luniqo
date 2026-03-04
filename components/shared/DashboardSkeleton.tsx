import { Skeleton } from '@/components/ui/skeleton'

interface DashboardSkeletonProps {
  /** Number of stat cards to show */
  statsCount?: number
  /** Number of content cards to show */
  cardsCount?: number
  /** Show a table instead of cards */
  showTable?: boolean
}

export function DashboardSkeleton({
  statsCount = 4,
  cardsCount = 6,
  showTable = false,
}: DashboardSkeletonProps) {
  return (
    <div className="space-y-6">
          {/* Page Title */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>

          {/* Stats Cards */}
          {statsCount > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: statsCount }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-8 rounded-lg" />
                  </div>
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ))}
            </div>
          )}

          {/* Content Area */}
          {showTable ? (
            /* Table Skeleton */
            <div className="bg-white rounded-xl border">
              {/* Table Header */}
              <div className="border-b p-4 flex items-center gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-20 ml-auto" />
              </div>
              {/* Table Rows */}
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="border-b last:border-0 p-4 flex items-center gap-4"
                >
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-16 rounded-full ml-auto" />
                </div>
              ))}
            </div>
          ) : (
            /* Cards Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: cardsCount }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border p-5 space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Skeleton className="h-8 w-20 rounded-lg" />
                    <Skeleton className="h-8 w-20 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          )}
    </div>
  )
}
