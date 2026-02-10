'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import {
  ChartBarIcon,
  BuildingOfficeIcon,
  Cog6ToothIcon,
  LockClosedIcon,
  MegaphoneIcon,
} from '@heroicons/react/24/outline'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail
} from '@/components/ui/sidebar'

interface NavItem {
  name: string
  href: string
  icon: any
}

const navigation: NavItem[] = [
  { name: 'Analytics', href: '/developer/dashboard', icon: ChartBarIcon },
  { name: 'Permissions', href: '/developer/permissions', icon: LockClosedIcon },
  { name: 'Entreprises', href: '/developer/enterprises', icon: BuildingOfficeIcon },
  { name: 'Popups', href: '/developer/popups', icon: MegaphoneIcon },
  { name: 'Paramètres', href: '/developer/settings', icon: Cog6ToothIcon },
]

export function DeveloperSidebar() {
  const pathname = usePathname()
  const { session } = useAuth()

  // Get initials for avatar
  const getInitials = () => {
    if (session && 'email' in session.user && session.user.email) {
      return session.user.email[0].toUpperCase()
    }
    return 'D'
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-neutral-200 p-4 bg-gradient-to-br from-blue-50 to-white">
        {/* Logo and branding */}
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <h2 className="text-xl font-bold text-neutral-900">Luniqo</h2>
            <p className="text-xs text-purple-600 font-semibold">Developer Portal</p>
          </div>
        </div>

        {/* Developer Badge - Only visible when expanded */}
        <div className="mt-3 px-3 py-3 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 border border-purple-100 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">
                {getInitials()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-neutral-900 truncate">
                {session && 'email' in session.user ? session.user.email : 'Developer'}
              </p>
              <p className="text-xs text-purple-600 font-semibold">Super Admin</p>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const isActive = pathname === item.href

                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.name}>
                      <Link href={item.href}>
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-neutral-200 bg-gradient-to-br from-neutral-50 to-white">
        <div className="px-2 py-2 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
            <span>v1.0.0 • Developer Portal</span>
          </div>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
