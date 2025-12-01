'use client'

import { ReactNode } from 'react'
import { AppSidebar } from './AppSidebar'
import Header from './Header'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'

interface DashboardLayoutProps {
 children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
 return (
 <SidebarProvider defaultOpen={true}>
 <AppSidebar />
 <SidebarInset className="bg-neutral-50">
 <Header />

 {/* Page content */}
 <main className="p-6">
 {children}
 </main>
 </SidebarInset>
 </SidebarProvider>
 )
}
