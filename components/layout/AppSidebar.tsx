'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import {
  HomeIcon,
  BuildingOfficeIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  CalendarIcon,
  ClockIcon,
  BeakerIcon,
  ChatBubbleLeftRightIcon,
  BellIcon,
  ChartBarIcon,
  Cog6ToothIcon
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
  SidebarSeparator,
  SidebarRail
} from '@/components/ui/sidebar'

interface NavItem {
  name: string
  href: string
  icon: any
  roles?: ('Developer' | 'Admin')[]
}

const navigation: NavItem[] = [
  { name: 'Tableau de bord', href: '/dashboard', icon: HomeIcon, roles: ['Admin'] },
  { name: 'Pièces', href: '/dashboard/rooms', icon: BuildingOfficeIcon, roles: ['Admin'] },
  { name: 'Tâches', href: '/dashboard/tasks', icon: ClipboardDocumentListIcon, roles: ['Admin'] },
  { name: 'Employés', href: '/dashboard/users', icon: UserGroupIcon, roles: ['Admin'] },
  { name: 'Sessions', href: '/dashboard/sessions', icon: CalendarIcon, roles: ['Admin'] },
  { name: 'Historique', href: '/dashboard/history', icon: ClockIcon, roles: ['Admin'] },
  { name: 'HACCP', href: '/dashboard/haccp', icon: BeakerIcon, roles: ['Admin'] },
  { name: 'Messages', href: '/dashboard/messages', icon: ChatBubbleLeftRightIcon, roles: ['Admin', 'Developer'] },
  { name: 'Notifications', href: '/dashboard/notifications', icon: BellIcon, roles: ['Admin', 'Developer'] },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon, roles: ['Developer'] },
]

const mainNavigation: NavItem[] = [
  { name: 'Tableau de bord', href: '/dashboard', icon: HomeIcon, roles: ['Admin'] },
  { name: 'Pièces', href: '/dashboard/rooms', icon: BuildingOfficeIcon, roles: ['Admin'] },
  { name: 'Tâches', href: '/dashboard/tasks', icon: ClipboardDocumentListIcon, roles: ['Admin'] },
  { name: 'Employés', href: '/dashboard/users', icon: UserGroupIcon, roles: ['Admin'] },
]

const operationsNavigation: NavItem[] = [
  { name: 'Sessions', href: '/dashboard/sessions', icon: CalendarIcon, roles: ['Admin'] },
  { name: 'Historique', href: '/dashboard/history', icon: ClockIcon, roles: ['Admin'] },
  { name: 'HACCP', href: '/dashboard/haccp', icon: BeakerIcon, roles: ['Admin'] },
]

const communicationNavigation: NavItem[] = [
  { name: 'Messages', href: '/dashboard/messages', icon: ChatBubbleLeftRightIcon, roles: ['Admin', 'Developer'] },
  { name: 'Notifications', href: '/dashboard/notifications', icon: BellIcon, roles: ['Admin', 'Developer'] },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon, roles: ['Developer'] },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { role, enterprise } = useAuth()

  // Filter navigation based on role
  const filterNav = (items: NavItem[]) =>
    items.filter(item => !item.roles || item.roles.includes(role as any))

  const filteredMainNav = filterNav(mainNavigation)
  const filteredOperationsNav = filterNav(operationsNavigation)
  const filteredCommunicationNav = filterNav(communicationNavigation)

  return (
    <Sidebar collapsible="icon" className="border-r border-neutral-200 dark:border-dark-300">
      <SidebarHeader className="border-b border-neutral-200 dark:border-dark-300 p-4">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-xl font-bold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              cLean
            </span>
            {enterprise && (
              <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                {enterprise.name}
              </span>
            )}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        {filteredMainNav.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Principal</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredMainNav.map((item) => {
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                  const Icon = item.icon

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.name}
                        className={isActive ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700' : ''}
                      >
                        <Link href={item.href}>
                          <Icon className="w-5 h-5" />
                          <span>{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Operations Navigation */}
        {filteredOperationsNav.length > 0 && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Opérations</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {filteredOperationsNav.map((item) => {
                    const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                    const Icon = item.icon

                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.name}
                          className={isActive ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700' : ''}
                        >
                          <Link href={item.href}>
                            <Icon className="w-5 h-5" />
                            <span>{item.name}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {/* Communication Navigation */}
        {filteredCommunicationNav.length > 0 && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Communication</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {filteredCommunicationNav.map((item) => {
                    const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                    const Icon = item.icon

                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.name}
                          className={isActive ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700' : ''}
                        >
                          <Link href={item.href}>
                            <Icon className="w-5 h-5" />
                            <span>{item.name}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-neutral-200 dark:border-dark-300">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Paramètres">
              <Link href="/dashboard/settings">
                <Cog6ToothIcon className="w-5 h-5" />
                <span>Paramètres</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className="px-2 py-2 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-success-500 animate-pulse"></div>
            <span>v1.0.0 • SaaS 2025</span>
          </div>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
