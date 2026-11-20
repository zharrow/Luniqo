import { CircleHelp } from 'lucide-react'
import type { ReactNode } from 'react'

import { LogoMark } from './creature'
import { AnchorLink, type NavLinkComponent } from './nav-link'
import type { Navigation } from './navigation'
import { AccountMenu } from './top-bar'

interface Props {
  navigation: Navigation
  activeId: string | null
  switcher?: ReactNode
  user: { name: string; roleLabel: string }
  onLogout: () => void
  logoutPending: boolean
  link?: NavLinkComponent
}

export function EmployeeHeader({
  navigation,
  activeId,
  switcher,
  user,
  onLogout,
  logoutPending,
  link: Link = AnchorLink,
}: Props) {
  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-shell-border bg-shell px-4 py-2">
      <span className="flex items-center gap-2">
        <LogoMark size={32} />
        <span className="text-lg font-bold text-[#1e2430]">Luniqo</span>
      </span>
      {switcher}
      <nav aria-label="Menu principal" className="flex flex-1 flex-wrap items-center gap-1">
        {navigation.flat.map((item) => {
          const active = item.id === activeId
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={
                active
                  ? 'inline-flex min-h-11 items-center rounded-[10px] bg-[#2459d6] px-3.5 text-[15px] font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-[#1e2430] focus-visible:ring-offset-2'
                  : 'inline-flex min-h-11 items-center rounded-[10px] px-3.5 text-[15px] text-[#3a4150] outline-none hover:bg-[#f3ede0] focus-visible:ring-2 focus-visible:ring-[#1e2430]'
              }
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
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
