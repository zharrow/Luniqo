import { LockKeyhole, LogOut, Tablet, Trophy, type LucideIcon } from 'lucide-react'
import { useState } from 'react'

import { ActionError } from '@/components/action-error'
import { cn } from '@/lib/utils'

import { Creature } from '../shell/creature'
import type { FamilyId } from '../shell/families'
import { AnchorLink, type NavLinkComponent } from '../shell/nav-link'
import { toDoHref, toDoText, type ToDoItem, type ToDoKind } from './todo-text'

/** Lignes visibles avant « Voir les N autres » (fiche de recherche, règle 4). */
export const VISIBLE_ROWS = 5

const ICONS: Record<ToDoKind, LucideIcon> = {
  pin_locked: LockKeyhole,
  tablet_expired: Tablet,
  departure_missing: LogOut,
  tablet_expiring: Tablet,
  onboarding_incomplete: Trophy,
}

// Classes écrites en entier : Tailwind ne voit pas les noms construits.
const BADGE: Record<FamilyId, string> = {
  today: 'bg-family-today-tint text-family-today-ink',
  children: 'bg-family-children-tint text-family-children-ink',
  team: 'bg-family-team-tint text-family-team-ink',
  places: 'bg-family-places-tint text-family-places-ink',
  admin: 'bg-family-admin-tint text-family-admin-ink',
}

const ACTION =
  'inline-flex min-h-11 shrink-0 items-center justify-center rounded-[10px] border border-[#c9d6f5] bg-[#f3f6fe] px-4 text-sm font-bold text-[#1a3f99] hover:bg-[#e6edfc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2459d6] disabled:opacity-60'

/** Clé d'une ligne : un genre, une crèche, un sujet (un PIN bloqué apparaît dans chaque crèche de l'employé). */
export function rowKey(item: ToDoItem): string {
  return `${item.kind}:${item.nursery_id}:${item.subject_id}`
}

type ToDoListProps = {
  items: ToDoItem[] | undefined
  pending: boolean
  error: unknown
  onRetry?: (() => void) | undefined
  /** Débloque le PIN de l'employé de la ligne ; la route relit la liste ensuite. */
  onUnlock: (item: ToDoItem) => void
  /** Employé dont le déblocage est en cours (toutes ses lignes attendent). */
  unlocking?: string | null
  /** Échec d'un déblocage, affiché sous sa ligne. */
  unlockError?: { key: string; error: unknown } | null
  /** Instant d'affichage (« hier », « dans 3 jours ») ; maintenant par défaut. */
  now?: Date
  link?: NavLinkComponent
}

/** Section « À traiter » de l'accueil de la direction (LUN-154) : une ligne par geste à faire. */
export function ToDoList({
  items,
  pending,
  error,
  onRetry,
  onUnlock,
  unlocking = null,
  unlockError = null,
  now,
  link,
}: ToDoListProps) {
  const [expanded, setExpanded] = useState(false)
  const Link = link ?? AnchorLink

  if (pending) {
    return (
      <p role="status" className="text-muted-foreground">
        Chargement de ce qui reste à régler…
      </p>
    )
  }
  if (error !== null && error !== undefined) {
    return (
      <div className="grid gap-2">
        <p className="font-medium">Impossible de charger ce qui reste à régler.</p>
        <ActionError error={error} onRetry={onRetry} />
      </div>
    )
  }
  if (items === undefined || items.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-shell-border bg-white py-6 pr-36 pl-6 sm:min-h-40">
        <p className="text-lg font-bold text-[#1e2430]">Rien à régler pour l’instant</p>
        <p className="mt-2 max-w-prose text-[#5c6270]">
          Un PIN bloqué, une tablette à renouveler ou un départ oublié apparaîtront ici, avec le bouton pour le régler.
        </p>
        <Creature family="today" size={110} hop className="absolute right-6 -bottom-1.5" />
      </div>
    )
  }

  const hidden = items.length - VISIBLE_ROWS
  const shown = expanded || hidden <= 0 ? items : items.slice(0, VISIBLE_ROWS)

  return (
    <div className="grid gap-3">
      <ul id="a-traiter-liste" className="overflow-hidden rounded-2xl border border-shell-border bg-white">
        {shown.map((item) => {
          const key = rowKey(item)
          const text = toDoText(item, now)
          const href = toDoHref(item)
          const Icon = ICONS[item.kind]
          const busy = item.kind === 'pin_locked' && unlocking === item.subject_id
          return (
            <li key={key} className="border-t border-[#f2ede3] px-4 py-3.5 first:border-t-0 sm:px-5">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span
                  aria-hidden="true"
                  className={cn('grid size-10 shrink-0 place-items-center rounded-xl', BADGE[text.family])}
                >
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-[1_1_16rem]">
                  <p className="font-bold text-[#1e2430] break-words">{text.title}</p>
                  <p className="text-sm text-[#5c6270] break-words">{text.detail}</p>
                </div>
                <p className="text-xs font-bold text-[#5c6270]">{item.nursery_name}</p>
                {href === null ? (
                  <span className="flex items-center gap-3">
                    {busy && (
                      <span role="status" className="text-sm text-[#5c6270]">
                        Déblocage…
                      </span>
                    )}
                    <button
                      type="button"
                      className={ACTION}
                      disabled={busy}
                      onClick={() => {
                        onUnlock(item)
                      }}
                    >
                      {text.action}
                      <span className="sr-only">{` le PIN de ${item.subject_name}`}</span>
                    </button>
                  </span>
                ) : (
                  <Link href={href} className={ACTION}>
                    <span className="sr-only">{`${text.title}, ${item.nursery_name} : `}</span>
                    {text.action}
                  </Link>
                )}
              </div>
              {unlockError?.key === key && (
                <div className="mt-2 pl-14">
                  <ActionError error={unlockError.error} />
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {hidden > 0 && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls="a-traiter-liste"
          className="inline-flex min-h-11 items-center justify-self-start font-semibold text-[#1a3f99] underline underline-offset-4"
          onClick={() => {
            setExpanded(!expanded)
          }}
        >
          {expanded ? 'Réduire la liste' : `Voir ${hidden === 1 ? 'l’autre' : `les ${String(hidden)} autres`}`}
        </button>
      )}
    </div>
  )
}
