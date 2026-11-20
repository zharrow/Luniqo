import { useNavigate, useParams, useRouter, useRouterState } from '@tanstack/react-router'
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'

import { version } from '../../../package.json'
import { $api } from '@/api/client'
import type { Session } from '@/api/types'
import logo from '@/assets/luniqo-logo.png'
import { readRememberedNursery, rememberNursery, resolveNurseryId, switchTarget } from './current-nursery'
import { EmployeeHeader } from './employee-header'
import { FAMILIES, type FamilyId } from './families'
import { GuardianTabs } from './guardian-tabs'
import type { NavLinkComponent } from './nav-link'
import { activeItemId, navigationFor, type Navigation } from './navigation'
import { NurserySwitcher } from './nursery-switcher'
import { Sidebar } from './sidebar'
import { AccountMenu, TopBar } from './top-bar'

const ROLE_LABELS: Record<Session['role'], string> = {
  owner: 'Direction',
  employee: 'Employée',
  guardian: 'Parent',
  developer: 'Éditeur',
}

const MENU_KEY = 'luniqo.menu'
const GROUPS_KEY = 'luniqo.groupes'
const WIDE_QUERY = '(min-width: 1200px)'

/** Lien du routeur : vrai `<a href>` (nouvel onglet, copie du lien), navigation sans rechargement au clic simple. */
export const RouterLink: NavLinkComponent = ({ href, onClick, children, ...rest }) => {
  const router = useRouter()
  return (
    <a
      {...rest}
      href={href}
      onClick={(event) => {
        const plain = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
        if (plain && !event.defaultPrevented) {
          event.preventDefault()
          void router.navigate({ href })
        }
        onClick?.()
      }}
    >
      {children}
    </a>
  )
}

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Stockage indisponible : le choix vaut pour cette visite seulement.
  }
}

function readCollapsedGroups(): FamilyId[] | null {
  const raw = readStorage(GROUPS_KEY)
  if (raw === null) return null
  try {
    const value: unknown = JSON.parse(raw)
    if (!Array.isArray(value)) return null
    return value.filter((v): v is FamilyId => typeof v === 'string' && Object.hasOwn(FAMILIES, v))
  } catch {
    return null
  }
}

function subscribeWide(onChange: () => void) {
  const query = window.matchMedia(WIDE_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function useWideScreen(): boolean {
  return useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE_QUERY).matches)
}

/** Groupes repliés : par défaut ceux sans écran, puis le choix retenu ; celui de l'entrée active reste ouvert. */
function useCollapsedGroups(navigation: Navigation, activeId: string | null) {
  const [chosen, setChosen] = useState<FamilyId[] | null>(readCollapsedGroups)
  const base = chosen ?? navigation.groups.filter((g) => g.collapsedByDefault).map((g) => g.family)
  const activeFamily = navigation.groups.find((g) => g.items.some((i) => i.id === activeId))?.family
  const collapsed = new Set(base.filter((family) => family !== activeFamily))
  const toggle = (family: FamilyId) => {
    const next = base.includes(family) ? base.filter((f) => f !== family) : [...base, family]
    setChosen(next)
    writeStorage(GROUPS_KEY, JSON.stringify(next))
  }
  return { collapsed, toggle }
}

function SkipLink() {
  return (
    <a
      href="#contenu"
      onClick={(event) => {
        event.preventDefault()
        document.getElementById('contenu')?.focus()
      }}
      className="sr-only z-50 rounded-lg bg-white px-4 py-3 font-semibold text-[#1e2430] focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:ring-2 focus:ring-[#1e2430]"
    >
      Aller au contenu
    </a>
  )
}

interface AppShellProps {
  session: Session
  /** Déconnexion fournie par la route : un domaine n'importe pas celui de l'authentification. */
  onLogout: () => void
  logoutPending: boolean
  children: ReactNode
}

/**
 * Cadre de l'espace connecté, selon le rôle (LUN-150) : menu latéral et barre du haut pour
 * la direction et l'éditeur, en-tête à trois entrées pour l'employée, onglets pour le parent.
 */
export function AppShell({ session, onLogout, logoutPending, children }: AppShellProps) {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const { nurseryId: fromUrl } = useParams({ strict: false })

  const staff = session.role === 'owner' || session.role === 'employee'
  const nurseries = $api.useQuery('get', '/api/v2/nurseries', {}, { enabled: staff })
  const list = staff ? (nurseries.data ?? []) : []
  const nurseryId = staff
    ? resolveNurseryId(
        fromUrl,
        readRememberedNursery(),
        list.map((n) => n.id),
      )
    : null

  useEffect(() => {
    if (staff && fromUrl) rememberNursery(fromUrl)
  }, [staff, fromUrl])

  const navigation = navigationFor(session.role, nurseryId)
  const activeId = activeItemId(navigation, pathname)
  const user = { name: `${session.first_name} ${session.last_name}`, roleLabel: ROLE_LABELS[session.role] }
  const go = (href: string) => void navigate({ href })

  const owner = session.role === 'owner'
  const showSwitcher = owner ? list.length > 0 : session.role === 'employee' && list.length >= 2
  const showGroup = owner && list.length >= 2
  const switcher = showSwitcher ? (
    <NurserySwitcher
      nurseries={list}
      current={showGroup && pathname === '/accueil' ? 'group' : nurseryId}
      showGroup={showGroup}
      onSelect={(to) => {
        if (to !== 'group') rememberNursery(to)
        go(switchTarget(pathname, to))
      }}
    />
  ) : undefined

  // Largeur et marges en un seul jeu de classes : deux classes rivales s'ordonnent selon le CSS produit, pas selon l'appel.
  const main = (layout = 'max-w-6xl p-4 sm:p-6') => (
    <main id="contenu" tabIndex={-1} className={`mx-auto w-full min-w-0 outline-none ${layout}`}>
      {children}
    </main>
  )

  if (session.role === 'employee') {
    return (
      <div className="min-h-svh">
        <SkipLink />
        <EmployeeHeader
          navigation={navigation}
          activeId={activeId}
          switcher={switcher}
          user={user}
          onLogout={onLogout}
          logoutPending={logoutPending}
          link={RouterLink}
        />
        {main()}
      </div>
    )
  }

  if (session.role === 'guardian') {
    return (
      <div className="min-h-svh">
        <SkipLink />
        <header className="flex h-16 items-center gap-3 border-b border-shell-border bg-shell px-4">
          <img src={logo} alt="" className="size-8" />
          <span className="flex-1 text-lg font-bold text-[#1e2430]">Luniqo</span>
          <AccountMenu user={user} onLogout={onLogout} logoutPending={logoutPending} />
        </header>
        <GuardianTabs navigation={navigation} activeId={activeId} link={RouterLink} />
        {/* Sous 768 px, les onglets sont fixés en bas : la fin du contenu reste visible au-dessus. */}
        {main('max-w-3xl px-4 pt-4 pb-[calc(3.5rem_+_1rem_+_env(safe-area-inset-bottom))] sm:px-6 sm:pt-6 md:pb-6')}
      </div>
    )
  }

  return (
    <ManagerShell
      navigation={navigation}
      activeId={activeId}
      switcher={switcher}
      user={user}
      onLogout={onLogout}
      logoutPending={logoutPending}
      onOpen={go}
      pathname={pathname}
    >
      {main()}
    </ManagerShell>
  )
}

interface ManagerShellProps {
  navigation: Navigation
  activeId: string | null
  switcher: ReactNode
  user: { name: string; roleLabel: string }
  onLogout: () => void
  logoutPending: boolean
  onOpen: (href: string) => void
  pathname: string
  children: ReactNode
}

/** Direction et éditeur : menu latéral visible dès 1200 px (masquable), par-dessus la page en dessous. */
function ManagerShell({
  navigation,
  activeId,
  switcher,
  user,
  onLogout,
  logoutPending,
  onOpen,
  pathname,
  children,
}: ManagerShellProps) {
  const wide = useWideScreen()
  const [hidden, setHidden] = useState(() => readStorage(MENU_KEY) === 'masque')
  // Menu ouvert sur petit écran : retenu avec l'adresse, il se referme dès qu'on change de page.
  const [openedAt, setOpenedAt] = useState<string | null>(null)
  const overlay = !wide && openedAt === pathname
  const { collapsed, toggle } = useCollapsedGroups(navigation, activeId)
  const bar = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const wasOpen = useRef(false)

  const close = () => setOpenedAt(null)
  const onToggleMenu = () => {
    if (wide) {
      setHidden(!hidden)
      writeStorage(MENU_KEY, hidden ? 'visible' : 'masque')
    } else {
      setOpenedAt(overlay ? null : pathname)
    }
  }

  useEffect(() => {
    if (overlay) {
      panel.current?.querySelector<HTMLElement>('a[href], button, select')?.focus()
      const onKey = (event: KeyboardEvent) => {
        if (event.key === 'Escape') setOpenedAt(null)
      }
      document.addEventListener('keydown', onKey)
      wasOpen.current = true
      return () => document.removeEventListener('keydown', onKey)
    }
    if (wasOpen.current) {
      wasOpen.current = false
      bar.current?.querySelector<HTMLElement>('button[aria-expanded]')?.focus()
    }
    return undefined
  }, [overlay])

  const sidebar = (onNavigate?: () => void) => (
    <Sidebar
      navigation={navigation}
      activeId={activeId}
      collapsed={collapsed}
      onToggle={toggle}
      switcher={switcher}
      link={RouterLink}
      onNavigate={onNavigate}
      version={version}
    />
  )

  return (
    <div className="flex min-h-svh">
      <SkipLink />
      {wide && !hidden && <div className="sticky top-0 h-svh w-68 shrink-0">{sidebar()}</div>}
      {overlay && (
        <div className="fixed inset-0 z-40">
          <div data-testid="voile" aria-hidden="true" className="absolute inset-0 bg-[#1e2430]/40" onClick={close} />
          <div ref={panel} className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-lg">
            {sidebar(close)}
          </div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col" inert={overlay}>
        <div ref={bar}>
          <TopBar
            navigation={navigation}
            onOpen={onOpen}
            onToggleMenu={onToggleMenu}
            menuOpen={wide ? !hidden : overlay}
            user={user}
            onLogout={onLogout}
            logoutPending={logoutPending}
            link={RouterLink}
          />
        </div>
        {children}
      </div>
    </div>
  )
}
