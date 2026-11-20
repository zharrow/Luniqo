import { CircleHelp, LogOut, Menu, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import { useId } from 'react'

import { AnchorLink, type NavLinkComponent } from './nav-link'
import type { Navigation } from './navigation'
import { ScreenSearch } from './screen-search'

interface AccountMenuProps {
  user: { name: string; roleLabel: string }
  onLogout: () => void
  logoutPending: boolean
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('')
}

export function AccountMenu({ user, onLogout, logoutPending }: AccountMenuProps) {
  const id = useId()
  return (
    <div className="relative">
      <button
        type="button"
        popoverTarget={id}
        className="flex h-11 items-center gap-3 rounded-lg px-2 text-left outline-none hover:bg-[#f3ede0] focus-visible:ring-2 focus-visible:ring-[#1e2430]"
      >
        <span
          aria-hidden="true"
          className="grid size-8 place-items-center rounded-full bg-family-today-tint text-xs font-bold text-family-today-ink"
        >
          {initials(user.name)}
        </span>
        <span className="sr-only">Mon compte, </span>
        <span className="flex flex-col leading-tight max-sm:sr-only">
          <span className="text-sm font-bold text-[#1e2430]">{user.name}</span>
          <span className="text-xs text-[#5c6270]">{user.roleLabel}</span>
        </span>
      </button>
      <div
        id={id}
        popover="auto"
        className="account-popover m-0 w-64 rounded-lg border border-shell-border bg-white p-3 text-[#1e2430] shadow-sm [position-area:bottom_span-left]"
      >
        <p className="text-sm font-bold">{user.name}</p>
        <p className="mb-3 text-xs text-[#5c6270]">{user.roleLabel}</p>
        <button
          type="button"
          disabled={logoutPending}
          onClick={onLogout}
          className="flex h-11 w-full items-center gap-2 rounded-lg border border-shell-border px-3 text-sm outline-none hover:bg-[#f3ede0] focus-visible:ring-2 focus-visible:ring-[#1e2430] disabled:opacity-60"
        >
          <LogOut aria-hidden="true" className="size-4" />
          Se déconnecter
        </button>
      </div>
    </div>
  )
}

interface Props extends AccountMenuProps {
  navigation: Navigation
  onOpen: (href: string) => void
  onToggleMenu: () => void
  menuOpen: boolean
  /** Menu latéral persistant (grand écran) : le bouton le masque ou l'affiche, au lieu de fermer un panneau. */
  persistentMenu?: boolean
  link?: NavLinkComponent
}

export function TopBar({
  navigation,
  onOpen,
  onToggleMenu,
  menuOpen,
  persistentMenu = false,
  user,
  onLogout,
  logoutPending,
  link: Link = AnchorLink,
}: Props) {
  const Toggle = persistentMenu ? (menuOpen ? PanelLeftClose : PanelLeftOpen) : menuOpen ? X : Menu
  const toggleLabel = persistentMenu
    ? menuOpen
      ? 'Masquer le menu'
      : 'Afficher le menu'
    : menuOpen
      ? 'Fermer le menu'
      : 'Ouvrir le menu'
  return (
    <header className="flex h-16 items-center gap-3 border-b border-shell-border bg-shell px-4">
      <button
        type="button"
        aria-label={toggleLabel}
        aria-expanded={menuOpen}
        onClick={onToggleMenu}
        className="grid size-11 place-items-center rounded-lg outline-none hover:bg-[#f3ede0] focus-visible:ring-2 focus-visible:ring-[#1e2430]"
      >
        <Toggle aria-hidden="true" className="size-6 text-[#1e2430]" />
      </button>
      <div className="flex flex-1 justify-center lg:justify-start">
        <ScreenSearch navigation={navigation} onOpen={onOpen} />
      </div>
      <Link
        href="/bientot/aide"
        className="flex h-11 items-center gap-2 rounded-lg px-3 text-sm text-[#1e2430] outline-none hover:bg-[#f3ede0] focus-visible:ring-2 focus-visible:ring-[#1e2430]"
      >
        <CircleHelp aria-hidden="true" className="size-5" />
        Aide
      </Link>
      <AccountMenu user={user} onLogout={onLogout} logoutPending={logoutPending} />
    </header>
  )
}
