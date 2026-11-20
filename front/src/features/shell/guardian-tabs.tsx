import { AnchorLink, type NavLinkComponent } from './nav-link'
import type { Navigation } from './navigation'

interface Props {
  navigation: Navigation
  activeId: string | null
  link?: NavLinkComponent
}

/** Fixée en bas de l'écran sous 768 px, en haut du contenu au-delà. */
export function GuardianTabs({ navigation, activeId, link: Link = AnchorLink }: Props) {
  return (
    <nav
      aria-label="Menu principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-shell-border bg-shell md:static md:border-t-0 md:border-b"
    >
      <ul className="mx-auto flex max-w-3xl list-none p-0">
        {navigation.flat.map((item) => {
          const active = item.id === activeId
          const Icon = item.icon
          return (
            <li key={item.id} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1e2430] ${
                  active ? 'font-bold text-[#2459d6]' : 'text-[#3a4150]'
                }`}
              >
                <Icon aria-hidden="true" className="size-6" />
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
