'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import {
  HomeIcon,
  BuildingOfficeIcon,
  BuildingOffice2Icon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  CalendarIcon,
  ClockIcon,
  BeakerIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  PuzzlePieceIcon,
  EyeIcon,
  BriefcaseIcon,
  CalendarDaysIcon,
  XCircleIcon,
  ShieldCheckIcon,
  ClipboardDocumentCheckIcon,
  QueueListIcon,
  UserPlusIcon,
  DocumentTextIcon,
  CurrencyEuroIcon
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
  roles?: ('Developer' | 'Owner')[]
  moduleColor?: string // Couleur du module pour l'indicateur visuel
}


const mainNavigation: NavItem[] = [
  { name: 'Tableau de bord', href: '/owner/dashboard', icon: HomeIcon, roles: ['Owner'], moduleColor: '#5a9dc9' },
  { name: 'Crèches', href: '/owner/nurseries', icon: BuildingOffice2Icon, roles: ['Owner'], moduleColor: '#5a9dc9' }, // Multi-site
  { name: 'Enfants', href: '/owner/children', icon: UserGroupIcon, roles: ['Owner'], moduleColor: '#f4c2c2' }, // Children (Phase 1)
  { name: 'Familles', href: '/owner/families', icon: UserGroupIcon, roles: ['Owner'], moduleColor: '#e8b4d4' }, // Families (Phase 1)
  { name: 'Sections', href: '/owner/sections', icon: BuildingOfficeIcon, roles: ['Owner'], moduleColor: '#b3d4e8' }, // Sections (Phase 1)
  { name: 'Pièces', href: '/owner/rooms', icon: BuildingOfficeIcon, roles: ['Owner'], moduleColor: '#5a9dc9' }, // Clean
  { name: 'Tâches', href: '/owner/tasks', icon: ClipboardDocumentListIcon, roles: ['Owner'], moduleColor: '#aed581' }, // Tasks
  { name: 'Employés', href: '/owner/users', icon: UserGroupIcon, roles: ['Owner'], moduleColor: '#f4a5a5' }, // Users
]

const operationsNavigation: NavItem[] = [
  { name: 'Sessions', href: '/owner/sessions', icon: CalendarIcon, roles: ['Owner'], moduleColor: '#5a9dc9' }, // Clean
  { name: 'Historique', href: '/owner/history', icon: ClockIcon, roles: ['Owner'], moduleColor: '#5a9dc9' }, // Clean
  { name: 'HACCP', href: '/owner/haccp', icon: BeakerIcon, roles: ['Owner'], moduleColor: '#81c995' }, // HACCP
]

const dailyActivitiesNavigation: NavItem[] = [
  { name: 'Activités', href: '/owner/activities', icon: PuzzlePieceIcon, roles: ['Owner'], moduleColor: '#ffe5b4' }, // Activities (Phase 2)
  { name: 'Observations', href: '/owner/observations', icon: EyeIcon, roles: ['Owner'], moduleColor: '#ffd4a3' }, // Observations (Phase 2)
]

const staffPlanningNavigation: NavItem[] = [
  { name: 'Personnel', href: '/owner/staff', icon: BriefcaseIcon, roles: ['Owner'], moduleColor: '#c8a8e9' }, // Staff (Phase 3)
  { name: 'Planning', href: '/owner/planning', icon: CalendarDaysIcon, roles: ['Owner'], moduleColor: '#d4b5f0' }, // Planning (Phase 3)
  { name: 'Absences', href: '/owner/absences', icon: XCircleIcon, roles: ['Owner'], moduleColor: '#e0c4f5' }, // Absences (Phase 3)
  { name: 'Conformité', href: '/owner/compliance', icon: ShieldCheckIcon, roles: ['Owner'], moduleColor: '#b3a8e9' }, // Compliance (Phase 3)
]

const enrollmentNavigation: NavItem[] = [
  { name: 'Candidatures', href: '/owner/applications', icon: ClipboardDocumentCheckIcon, roles: ['Owner'], moduleColor: '#a8d5ba' }, // Applications (Phase 4)
  { name: 'Liste d\'attente', href: '/owner/waiting-list', icon: QueueListIcon, roles: ['Owner'], moduleColor: '#b5e7c7' }, // Waiting list (Phase 4)
  { name: 'Admissions', href: '/owner/admissions', icon: UserPlusIcon, roles: ['Owner'], moduleColor: '#c2f0d4' }, // Admissions (Phase 4)
  { name: 'Contrats', href: '/owner/contracts', icon: DocumentTextIcon, roles: ['Owner'], moduleColor: '#a8cba5' }, // Contracts (Phase 4)
  { name: 'Grilles tarifaires', href: '/owner/rate-grids', icon: CurrencyEuroIcon, roles: ['Owner'], moduleColor: '#b8d9b5' }, // Rate grids (Phase 4)
]

const communicationNavigation: NavItem[] = [
  { name: 'Messages', href: '/owner/messages', icon: ChatBubbleLeftRightIcon, roles: ['Owner', 'Developer'], moduleColor: '#64b5d1' }, // Communication
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon, roles: ['Developer'], moduleColor: '#9fa8da' }, // Analytics
]

export function AppSidebar() {
  const pathname = usePathname()
  const { role, enterprise } = useAuth()

  // Filter navigation based on role
  const filterNav = (items: NavItem[]) =>
    items.filter(item => !item.roles || item.roles.includes(role as any))

  const filteredMainNav = filterNav(mainNavigation)
  const filteredOperationsNav = filterNav(operationsNavigation)
  const filteredDailyActivitiesNav = filterNav(dailyActivitiesNavigation)
  const filteredStaffPlanningNav = filterNav(staffPlanningNavigation)
  const filteredEnrollmentNav = filterNav(enrollmentNavigation)
  const filteredCommunicationNav = filterNav(communicationNavigation)

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
        {/* Main Navigation */}
        {filteredMainNav.length > 0 && (
          <SidebarGroup className="px-2">
            <SidebarGroupLabel>Principal</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredMainNav.map((item) => {
                  // For /dashboard, only match exact path. For others, match path and subpaths
                  const isActive = item.href === '/dashboard'
                    ? pathname === '/dashboard'
                    : pathname === item.href || pathname?.startsWith(item.href + '/')
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
                        <Link href={item.href} className="flex items-center relative group/item">
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
        )}

        {/* Operations Navigation */}
        {filteredOperationsNav.length > 0 && (
          <>
            <SidebarSeparator />
            <SidebarGroup className="px-2">
              <SidebarGroupLabel>Opérations</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {filteredOperationsNav.map((item) => {
                    // For /dashboard, only match exact path. For others, match path and subpaths
                    const isActive = item.href === '/dashboard'
                      ? pathname === '/dashboard'
                      : pathname === item.href || pathname?.startsWith(item.href + '/')
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
                          <Link href={item.href} className="flex items-center relative group/item">
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
          </>
        )}

        {/* Daily Activities Navigation (Phase 2) */}
        {filteredDailyActivitiesNav.length > 0 && (
          <>
            <SidebarSeparator />
            <SidebarGroup className="px-2">
              <SidebarGroupLabel>Activités quotidiennes</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {filteredDailyActivitiesNav.map((item) => {
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
                          <Link href={item.href} className="flex items-center relative group/item">
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
          </>
        )}

        {/* Staff & Planning Navigation (Phase 3) */}
        {filteredStaffPlanningNav.length > 0 && (
          <>
            <SidebarSeparator />
            <SidebarGroup className="px-2">
              <SidebarGroupLabel>Personnel & Planning</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {filteredStaffPlanningNav.map((item) => {
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
                          <Link href={item.href} className="flex items-center relative group/item">
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
          </>
        )}

        {/* Enrollment Navigation (Phase 4) */}
        {filteredEnrollmentNav.length > 0 && (
          <>
            <SidebarSeparator />
            <SidebarGroup className="px-2">
              <SidebarGroupLabel>Inscriptions & Contrats</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {filteredEnrollmentNav.map((item) => {
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
                          <Link href={item.href} className="flex items-center relative group/item">
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
          </>
        )}

        {/* Communication Navigation */}
        {filteredCommunicationNav.length > 0 && (
          <>
            <SidebarSeparator />
            <SidebarGroup className="px-2">
              <SidebarGroupLabel>Communication</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {filteredCommunicationNav.map((item) => {
                    // For /dashboard, only match exact path. For others, match path and subpaths
                    const isActive = item.href === '/dashboard'
                      ? pathname === '/dashboard'
                      : pathname === item.href || pathname?.startsWith(item.href + '/')
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
                          <Link href={item.href} className="flex items-center relative group/item">
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
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-neutral-200 bg-gradient-to-br from-neutral-50 to-white px-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Mon Profil" className="rounded-md">
              <Link href="/owner/profile" className="group/footer">
                <Cog6ToothIcon className="w-5 h-5 transition-transform duration-300 group-hover/footer:rotate-90" />
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
