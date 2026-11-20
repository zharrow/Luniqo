import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'

import { LogoMark } from './creature'
import type { FamilyId } from './families'
import { AnchorLink, type NavLinkComponent } from './nav-link'
import type { NavItem, Navigation } from './navigation'

interface Props {
  navigation: Navigation
  activeId: string | null
  collapsed: ReadonlySet<FamilyId>
  onToggle: (family: FamilyId) => void
  switcher?: ReactNode
  link?: NavLinkComponent
  onNavigate?: () => void
  version: string
}

/** Classes complètes, pour que Tailwind les voie. */
const ACTIVE: Record<FamilyId, string> = {
  today: 'bg-family-today',
  children: 'bg-family-children',
  team: 'bg-family-team',
  places: 'bg-family-places',
  admin: 'bg-family-admin',
}
const INK: Record<FamilyId, string> = {
  today: 'text-family-today-ink',
  children: 'text-family-children-ink',
  team: 'text-family-team-ink',
  places: 'text-family-places-ink',
  admin: 'text-family-admin-ink',
}
const SWATCH: Record<FamilyId, string> = ACTIVE
const HOVER: Record<FamilyId, string> = {
  today: 'hover:bg-family-today-tint',
  children: 'hover:bg-family-children-tint',
  team: 'hover:bg-family-team-tint',
  places: 'hover:bg-family-places-tint',
  admin: 'hover:bg-family-admin-tint',
}

export function Sidebar({
  navigation,
  activeId,
  collapsed,
  onToggle,
  switcher,
  link: Link = AnchorLink,
  onNavigate,
  version,
}: Props) {
  const entry = (item: NavItem, family: FamilyId) => {
    const active = item.id === activeId
    const Icon = item.icon
    return (
      <li key={item.id}>
        <Link
          href={item.href}
          aria-current={active ? 'page' : undefined}
          onClick={onNavigate}
          className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#1e2430] ${
            active ? `${ACTIVE[family]} font-bold text-white` : `${HOVER[family]} text-[#1e2430]`
          }`}
        >
          <Icon aria-hidden="true" className={`size-5 shrink-0 ${active ? 'text-white' : INK[family]}`} />
          <span className="flex-1 truncate">{item.label}</span>
          {item.soon && (
            <span className={`text-[11px] font-normal ${active ? 'text-white' : 'text-[#5c6270]'}`}>bientôt</span>
          )}
        </Link>
      </li>
    )
  }

  return (
    <nav
      aria-label="Menu principal"
      className="flex h-full flex-col gap-4 overflow-y-auto border-r border-shell-border bg-shell p-3"
    >
      <div className="flex items-center gap-2 px-1 pt-1">
        <LogoMark size={32} />
        <span className="text-lg font-bold text-[#1e2430]">Luniqo</span>
      </div>
      {switcher}
      <div className="flex flex-1 flex-col gap-2">
        {navigation.groups.map((group) => {
          const isCollapsed = group.label !== '' && collapsed.has(group.family)
          return (
            <section key={`${group.family}-${group.label}`}>
              {group.label !== '' && (
                <button
                  type="button"
                  aria-expanded={!isCollapsed}
                  onClick={() => onToggle(group.family)}
                  className="flex h-9 w-full items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#1e2430] outline-none hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-[#1e2430]"
                >
                  <span aria-hidden="true" className={`size-2.5 rounded-sm ${SWATCH[group.family]}`} />
                  <span className="flex-1 text-left">{group.label}</span>
                  {isCollapsed && <span className="text-xs font-normal text-[#5c6270]">{group.items.length}</span>}
                  <ChevronDown
                    aria-hidden="true"
                    className={`size-4 text-[#5c6270] ${isCollapsed ? '-rotate-90' : ''}`}
                  />
                </button>
              )}
              {!isCollapsed && (
                <ul className="mt-1 flex flex-col gap-0.5">{group.items.map((item) => entry(item, group.family))}</ul>
              )}
            </section>
          )
        })}
      </div>
      <div className="border-t border-shell-border pt-2">
        {navigation.footer.length > 0 && (
          <ul className="flex flex-col gap-0.5">{navigation.footer.map((item) => entry(item, 'admin'))}</ul>
        )}
        <p className="px-3 pt-2 text-xs text-[#5c6270]">Version {version}</p>
      </div>
    </nav>
  )
}
