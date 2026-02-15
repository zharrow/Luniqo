'use client'

import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { DeveloperSidebar } from '@/components/layout/DeveloperSidebar'
import Header from '@/components/layout/Header'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { DashboardSkeleton } from '@/components/shared/DashboardSkeleton'

export const dynamic = 'force-dynamic'

export default function DeveloperRouteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Protect Developer routes - redirect if not Developer
  const { isLoading } = useRequireAuth(['Developer'])

  // Show skeleton while checking session
  if (isLoading) {
    return <DashboardSkeleton statsCount={4} cardsCount={0} showTable />
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <DeveloperSidebar />
      <SidebarInset className="bg-neutral-50">
        <Header />
        <main className="p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
