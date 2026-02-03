'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import {
  BuildingOfficeIcon,
  BuildingOffice2Icon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  CalendarIcon,
  BeakerIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  PuzzlePieceIcon,
  BriefcaseIcon,
  XCircleIcon,
  ClipboardDocumentCheckIcon,
  QueueListIcon,
  UserPlusIcon,
  CurrencyEuroIcon,
  LockClosedIcon,
  ChartPieIcon,
  DocumentTextIcon,
  ShoppingBagIcon,
  TruckIcon,
  ExclamationTriangleIcon,
  WrenchIcon,
} from '@heroicons/react/24/outline'

// Animated icons from lucide-animated
import {
  AnimatedIconWrapper,
  HomeIcon,
  ClockIcon,
  SettingsIcon,
  SparklesIcon,
  EyeIcon,
  ShieldCheckIcon,
  EuroIcon,
  CalendarDaysIcon,
} from '@/components/ui/lucide-animated'
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
import { Badge } from '@/components/ui/badge'

interface NavItem {
  name: string
  href: string
  icon: any
  roles?: ('Developer' | 'Owner')[]
  moduleColor?: string // Couleur du module pour l'indicateur visuel
  moduleId?: string // ID du module requis pour accéder à cette route
  isAnimated?: boolean // Pour les icônes lucide-animated
}


// ============================================================================
// MODULE BASE (gratuit) - Configuration & Données de Base
// ============================================================================
const baseNavigation: NavItem[] = [
  { name: 'Tableau de bord', href: '/owner/dashboard', icon: HomeIcon, roles: ['Owner'], moduleColor: '#5a9dc9', moduleId: 'base', isAnimated: true },
  { name: 'Mes Crèches', href: '/owner/nurseries', icon: BuildingOffice2Icon, roles: ['Owner'], moduleColor: '#5a9dc9', moduleId: 'base' },
  { name: 'Employés', href: '/owner/users', icon: UserGroupIcon, roles: ['Owner'], moduleColor: '#5a9dc9', moduleId: 'base' },
  { name: 'Messages', href: '/owner/messages', icon: ChatBubbleLeftRightIcon, roles: ['Owner'], moduleColor: '#64b5d1', moduleId: 'base' },
]

// ============================================================================
// MODULE NETTOYAGE (29€/mois) - Gestion du nettoyage complet
// ============================================================================
const cleaningNavigation: NavItem[] = [
  { name: 'Pièces', href: '/owner/rooms', icon: BuildingOfficeIcon, roles: ['Owner'], moduleColor: '#81c784', moduleId: 'cleaning' },
  { name: 'Tâches', href: '/owner/tasks', icon: ClipboardDocumentListIcon, roles: ['Owner'], moduleColor: '#aed581', moduleId: 'cleaning' },
  { name: 'Sessions', href: '/owner/sessions', icon: CalendarIcon, roles: ['Owner'], moduleColor: '#9ccc65', moduleId: 'cleaning' },
  { name: 'Historique', href: '/owner/history', icon: ClockIcon, roles: ['Owner'], moduleColor: '#c5e1a5', moduleId: 'cleaning', isAnimated: true },
]

// ============================================================================
// MODULE HACCP (39€/mois) - Traçabilité alimentaire
// ============================================================================
const haccpNavigation: NavItem[] = [
  { name: 'Enfants', href: '/owner/haccp/children', icon: UserGroupIcon, roles: ['Owner'], moduleColor: '#f4c2c2', moduleId: 'haccp' },
  { name: 'Repas', href: '/owner/haccp/meals', icon: ClipboardDocumentCheckIcon, roles: ['Owner'], moduleColor: '#ffcba4', moduleId: 'haccp' },
  { name: 'Produits', href: '/owner/haccp/products', icon: ShoppingBagIcon, roles: ['Owner'], moduleColor: '#c5e1a5', moduleId: 'haccp' },
  { name: 'Fournisseurs', href: '/owner/haccp/suppliers', icon: TruckIcon, roles: ['Owner'], moduleColor: '#80cbc4', moduleId: 'haccp' },
  { name: 'Températures', href: '/owner/haccp/temperatures', icon: BeakerIcon, roles: ['Owner'], moduleColor: '#81c995', moduleId: 'haccp' },
  { name: 'Équipements', href: '/owner/haccp/equipment', icon: WrenchIcon, roles: ['Owner'], moduleColor: '#b39ddb', moduleId: 'haccp' },
  { name: 'Documents', href: '/owner/haccp/documents', icon: DocumentTextIcon, roles: ['Owner'], moduleColor: '#9fa8da', moduleId: 'haccp' },
  { name: 'Non-conformités', href: '/owner/haccp/non-compliances', icon: ExclamationTriangleIcon, roles: ['Owner'], moduleColor: '#f4c2c2', moduleId: 'haccp' },
]

// ============================================================================
// MODULE ENFANTS (29€/mois) - Gestion des enfants et familles
// ============================================================================
const childrenNavigation: NavItem[] = [
  { name: 'Enfants', href: '/owner/children', icon: UserGroupIcon, roles: ['Owner'], moduleColor: '#f4c2c2', moduleId: 'children' },
  { name: 'Familles', href: '/owner/families', icon: UserGroupIcon, roles: ['Owner'], moduleColor: '#e8b4d4', moduleId: 'children' },
  { name: 'Sections', href: '/owner/sections', icon: BuildingOfficeIcon, roles: ['Owner'], moduleColor: '#d4a5d4', moduleId: 'children' },
]

// ============================================================================
// MODULE PRÉSENCES (39€/mois) - Activités quotidiennes
// ============================================================================
const attendanceNavigation: NavItem[] = [
  { name: 'Activités', href: '/owner/activities', icon: PuzzlePieceIcon, roles: ['Owner'], moduleColor: '#ffe5b4', moduleId: 'attendance' },
  { name: 'Observations', href: '/owner/observations', icon: EyeIcon, roles: ['Owner'], moduleColor: '#ffd4a3', moduleId: 'attendance', isAnimated: true },
]

// ============================================================================
// MODULE PERSONNEL (49€/mois) - RH & Planning
// ============================================================================
const staffNavigation: NavItem[] = [
  { name: 'Personnel', href: '/owner/staff', icon: BriefcaseIcon, roles: ['Owner'], moduleColor: '#c8a8e9', moduleId: 'staff' },
  { name: 'Planning', href: '/owner/planning', icon: CalendarDaysIcon, roles: ['Owner'], moduleColor: '#d4b5f0', moduleId: 'staff', isAnimated: true },
  { name: 'Absences', href: '/owner/absences', icon: XCircleIcon, roles: ['Owner'], moduleColor: '#e0c4f5', moduleId: 'staff' },
  { name: 'Conformité', href: '/owner/compliance', icon: ShieldCheckIcon, roles: ['Owner'], moduleColor: '#b3a8e9', moduleId: 'staff', isAnimated: true },
]

// ============================================================================
// MODULE INSCRIPTIONS (39€/mois) - Inscriptions & Contrats
// ============================================================================
const enrollmentNavigation: NavItem[] = [
  { name: 'Candidatures', href: '/owner/applications', icon: ClipboardDocumentCheckIcon, roles: ['Owner'], moduleColor: '#a8d5ba', moduleId: 'enrollment' },
  { name: 'Liste d\'attente', href: '/owner/waiting-list', icon: QueueListIcon, roles: ['Owner'], moduleColor: '#b5e7c7', moduleId: 'enrollment' },
  { name: 'Admissions', href: '/owner/admissions', icon: UserPlusIcon, roles: ['Owner'], moduleColor: '#c2f0d4', moduleId: 'enrollment' },
  { name: 'Contrats', href: '/owner/contracts', icon: DocumentTextIcon, roles: ['Owner'], moduleColor: '#a8cba5', moduleId: 'enrollment' },
  { name: 'Grilles tarifaires', href: '/owner/rate-grids', icon: CurrencyEuroIcon, roles: ['Owner'], moduleColor: '#b8d9b5', moduleId: 'enrollment' },
]

// ============================================================================
// MODULE FACTURATION (59€/mois) - Facturation & Finances
// ============================================================================
const invoicingNavigation: NavItem[] = [
  { name: 'Facturation', href: '/owner/invoicing', icon: CurrencyEuroIcon, roles: ['Owner'], moduleColor: '#ffd4a3', moduleId: 'billing' },
]

// ============================================================================
// MODULE PORTAIL PARENTS (39€/mois) - Communication avec les familles
// ============================================================================
const parentPortalNavigation: NavItem[] = [
  { name: 'Portail Parents', href: '/owner/portal', icon: SparklesIcon, roles: ['Owner'], moduleColor: '#e8b4d4', moduleId: 'parent_portal', isAnimated: true },
]

// ============================================================================
// MODULE STATISTIQUES (29€/mois) - Analytics & Rapports
// ============================================================================
const analyticsNavigation: NavItem[] = [
  { name: 'Statistiques', href: '/owner/analytics', icon: ChartPieIcon, roles: ['Owner'], moduleColor: '#9fa8da', moduleId: 'analytics' },
]

// ============================================================================
// DEVELOPER NAVIGATION
// ============================================================================
const developerNavigation: NavItem[] = [
  { name: 'Analytics', href: '/developer/dashboard', icon: ChartBarIcon, roles: ['Developer'], moduleColor: '#9fa8da' },
  { name: 'Permissions', href: '/developer/permissions', icon: LockClosedIcon, roles: ['Developer'], moduleColor: '#b39ddb' },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { role, enterprise } = useAuth()
  const { accessibleModules } = useNursery()

  // Check if Owner has access to a module (now per-nursery)
  const hasModuleAccess = (moduleId?: string) => {
    if (!moduleId) return true // No module required
    if (role !== 'Owner') return true // Only Owners are filtered
    return accessibleModules.includes(moduleId)
  }

  // Filter navigation based on role
  const filterNav = (items: NavItem[]) =>
    items.filter(item => !item.roles || item.roles.includes(role as any))

  const filteredBaseNav = filterNav(baseNavigation)
  const filteredCleaningNav = filterNav(cleaningNavigation)
  const filteredHaccpNav = filterNav(haccpNavigation)
  const filteredChildrenNav = filterNav(childrenNavigation)
  const filteredAttendanceNav = filterNav(attendanceNavigation)
  const filteredStaffNav = filterNav(staffNavigation)
  const filteredEnrollmentNav = filterNav(enrollmentNavigation)
  const filteredInvoicingNav = filterNav(invoicingNavigation)
  const filteredParentPortalNav = filterNav(parentPortalNavigation)
  const filteredAnalyticsNav = filterNav(analyticsNavigation)
  const filteredDeveloperNav = filterNav(developerNavigation)

  // Helper to render a navigation group
  const renderNavGroup = (items: NavItem[], label: string, showSeparator: boolean = true) => {
    if (items.length === 0) return null

    return (
      <>
        {showSeparator && <SidebarSeparator />}
        <SidebarGroup className="px-2">
          <SidebarGroupLabel>{label}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isLocked = !hasModuleAccess(item.moduleId)
                const isActive = !isLocked && (item.href === '/owner/dashboard'
                  ? pathname === '/owner/dashboard'
                  : pathname === item.href || pathname?.startsWith(item.href + '/'))
                const Icon = item.icon
                const targetHref = isLocked ? `/owner/locked/${item.moduleId}` : item.href

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.name}
                      className={`
                        rounded-md transition-all duration-300
                        ${isActive ? 'text-white shadow-lg font-semibold' : isLocked ? 'opacity-60' : ''}
                        ${!isActive && !isLocked ? 'hover:bg-neutral-50 hover:shadow-sm hover:scale-[1.02]' : ''}
                      `}
                      style={isActive && item.moduleColor ? {
                        background: `linear-gradient(135deg, ${item.moduleColor}f0, ${item.moduleColor}cc)`,
                        filter: 'brightness(0.85) saturate(1.2)',
                      } : {}}
                    >
                      <Link href={targetHref} className="flex items-center gap-3 relative group/item">
                        {item.isAnimated ? (
                          <AnimatedIconWrapper icon={<Icon />} size={20} />
                        ) : (
                          <Icon className="w-5 h-5 transition-all duration-300 group-hover/item:scale-110 group-hover/item:text-primary-600" />
                        )}
                        <span className="font-medium">{item.name}</span>
                        {isLocked && (
                          <Badge variant="outline" size="sm" className="ml-auto">
                            <LockClosedIcon className="w-3 h-3" />
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </>
    )
  }

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
        {/* BASE MODULE - Always first (gratuit) */}
        {renderNavGroup(filteredBaseNav, 'Configuration de Base', false)}

        {/* CLEANING MODULE - Nettoyage (29€/mois) */}
        {renderNavGroup(filteredCleaningNav, 'Nettoyage')}

        {/* HACCP MODULE - Traçabilité (39€/mois) */}
        {renderNavGroup(filteredHaccpNav, 'HACCP Traçabilité')}

        {/* CHILDREN MODULE - Enfants (29€/mois) */}
        {renderNavGroup(filteredChildrenNav, 'Enfants & Familles')}

        {/* ATTENDANCE MODULE - Présences (39€/mois) */}
        {renderNavGroup(filteredAttendanceNav, 'Présences & Activités')}

        {/* STAFF MODULE - Personnel (49€/mois) */}
        {renderNavGroup(filteredStaffNav, 'Personnel & Planning')}

        {/* ENROLLMENT MODULE - Inscriptions (39€/mois) */}
        {renderNavGroup(filteredEnrollmentNav, 'Inscriptions & Contrats')}

        {/* INVOICING MODULE - Facturation (49€/mois) */}
        {renderNavGroup(filteredInvoicingNav, 'Facturation & Finances')}

        {/* PARENT PORTAL MODULE - Portail Parents (39€/mois) */}
        {renderNavGroup(filteredParentPortalNav, 'Portail Parents')}

        {/* ANALYTICS MODULE - Statistiques (29€/mois) */}
        {renderNavGroup(filteredAnalyticsNav, 'Statistiques & Rapports')}

        {/* DEVELOPER NAVIGATION */}
        {renderNavGroup(filteredDeveloperNav, 'Administration', role === 'Developer')}
      </SidebarContent>

      <SidebarFooter className="border-t border-neutral-200 bg-gradient-to-br from-neutral-50 to-white px-2">
        <SidebarMenu>
          {role === 'Owner' && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Abonnements" className="rounded-md">
                <Link href="/owner/billing" className="flex items-center gap-2">
                  <AnimatedIconWrapper icon={<EuroIcon />} size={20} />
                  <span>Abonnements</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Mon Profil" className="rounded-md">
              <Link href="/owner/profile" className="flex items-center gap-2">
                <AnimatedIconWrapper icon={<SettingsIcon />} size={20} />
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
