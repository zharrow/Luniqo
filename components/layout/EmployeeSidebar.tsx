'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import {
  HomeIcon,
  CalendarIcon,
  ClockIcon,
  UserCircleIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentCheckIcon,
  DocumentTextIcon,
  PuzzlePieceIcon,
  EyeIcon
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
  SidebarRail,
  useSidebar
} from '@/components/ui/sidebar'

interface NavItem {
  name: string
  href: string
  icon: any
  moduleColor?: string
}

const employeeNavigation: NavItem[] = [
  { name: 'Tableau de bord', href: '/employee/dashboard', icon: HomeIcon, moduleColor: '#5a9dc9' },
  { name: 'Mon Calendrier', href: '/employee/calendar', icon: CalendarIcon, moduleColor: '#aed581' },
  { name: 'Mon Historique', href: '/employee/history', icon: ClockIcon, moduleColor: '#f4c2c2' },
]

const dailyWorkNavigation: NavItem[] = [
  { name: 'Présence', href: '/employee/attendance', icon: ClipboardDocumentCheckIcon, moduleColor: '#b5ead7' },
  { name: 'Journal quotidien', href: '/employee/daily-logs', icon: DocumentTextIcon, moduleColor: '#c2f0d4' },
  { name: 'Activités', href: '/employee/activities', icon: PuzzlePieceIcon, moduleColor: '#ffe5b4' },
  { name: 'Observations', href: '/employee/observations', icon: EyeIcon, moduleColor: '#ffd4a3' },
]

const communicationNavigation: NavItem[] = [
  { name: 'Messages', href: '/employee/messages', icon: ChatBubbleLeftRightIcon, moduleColor: '#64b5d1' },
]

export function EmployeeSidebar() {
  const pathname = usePathname()
  const { enterprise } = useAuth()
  const { setOpenMobile } = useSidebar()

  return (
    <Sidebar collapsible="icon" className="border-r border-neutral-200">
      <SidebarHeader className="border-b border-neutral-200 p-4 bg-gradient-to-br from-primary-50 to-white">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
            <img
              src="/luniqo.png"
              alt="Luniqo"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-xl font-bold text-primary-700" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Luniqo
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
        {/* Employee Navigation */}
        <SidebarGroup className="px-2">
          <SidebarGroupLabel>Mon Espace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {employeeNavigation.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                const Icon = item.icon

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.name}
                      className={isActive ? 'text-white' : ''}
                      style={isActive && item.moduleColor ? {
                        background: `linear-gradient(to right, ${item.moduleColor}, ${item.moduleColor}dd)`,
                      } : {}}
                    >
                      <Link href={item.href} className="flex items-center relative group/item" onClick={() => setOpenMobile(false)}>
                        <Icon className="w-5 h-5 transition-transform duration-300 group-hover/item:scale-110" />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Daily Work Navigation */}
        <SidebarGroup className="px-2 mt-4">
          <SidebarGroupLabel>Travail quotidien</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {dailyWorkNavigation.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                const Icon = item.icon

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.name}
                      className={isActive ? 'text-white rounded-md' : 'rounded-md'}
                      style={isActive && item.moduleColor ? {
                        background: `linear-gradient(to right, ${item.moduleColor}, ${item.moduleColor}dd)`,
                      } : {}}
                    >
                      <Link href={item.href} className="flex items-center relative group/item" onClick={() => setOpenMobile(false)}>
                        <Icon className="w-5 h-5 transition-transform duration-300 group-hover/item:scale-110" />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Communication Navigation */}
        <SidebarGroup className="px-2 mt-4">
          <SidebarGroupLabel>Communication</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {communicationNavigation.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                const Icon = item.icon

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.name}
                      className={isActive ? 'text-white rounded-md' : 'rounded-md'}
                      style={isActive && item.moduleColor ? {
                        background: `linear-gradient(to right, ${item.moduleColor}, ${item.moduleColor}dd)`,
                      } : {}}
                    >
                      <Link href={item.href} className="flex items-center relative group/item" onClick={() => setOpenMobile(false)}>
                        <Icon className="w-5 h-5 transition-transform duration-300 group-hover/item:scale-110" />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-neutral-200 bg-gradient-to-br from-neutral-50 to-white px-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Mon Profil" className="rounded-md">
              <Link href="/employee/profile" className="group/footer" onClick={() => setOpenMobile(false)}>
                <UserCircleIcon className="w-5 h-5 transition-transform duration-300 group-hover/footer:scale-110" />
                <span>Mon Profil</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className="px-2 py-2 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-success-500 animate-pulse"></div>
            <span>v1.0.0 • Luniqo 2025</span>
          </div>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
