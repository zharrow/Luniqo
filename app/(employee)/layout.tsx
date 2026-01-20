'use client'

import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { EmployeeSidebar } from '@/components/layout/EmployeeSidebar'
import Header from '@/components/layout/Header'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'

export const dynamic = 'force-dynamic'

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Protect Employee routes - redirect if not Employee
  const { session, isLoading } = useRequireAuth(['Employee'])

  // Show loading state while checking session
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-200 border-t-primary-500 mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
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
