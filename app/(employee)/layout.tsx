'use client'

import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { EmployeeSidebar } from '@/components/layout/EmployeeSidebar'
import Header from '@/components/layout/Header'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { DashboardSkeleton } from '@/components/shared/DashboardSkeleton'

export const dynamic = 'force-dynamic'

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Protect Employee routes - redirect if not Employee
  const { session, isLoading } = useRequireAuth(['Employee'])

  // Show skeleton while checking session
  if (isLoading) {
    return <DashboardSkeleton statsCount={3} cardsCount={4} />
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <EmployeeSidebar />
      <SidebarInset className="bg-neutral-50">
        <Header />
        <main className="p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
