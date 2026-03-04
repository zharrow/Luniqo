'use client'

import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { AppSidebar } from '@/components/layout/AppSidebar'
import Header from '@/components/layout/Header'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { EventPopup } from '@/components/shared/EventPopup'
import { DashboardSkeleton } from '@/components/shared/DashboardSkeleton'

export const dynamic = 'force-dynamic'

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Protect Owner routes - redirect if not Owner
  const { session, isLoading } = useRequireAuth(['Owner'])

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="bg-neutral-50">
        <Header />
        <main className="p-6">
          {isLoading ? <DashboardSkeleton statsCount={4} cardsCount={6} /> : children}
        </main>
      </SidebarInset>
      {/* Event popups (welcome, seasonal, promo) */}
      {!isLoading && <EventPopup />}
    </SidebarProvider>
  )
}
