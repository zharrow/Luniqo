import { ChevronDown } from 'lucide-react'

export interface NurseryOption {
  id: string
  name: string
}

interface Props {
  nurseries: NurseryOption[]
  /** Identifiant d'une crèche, ou 'group' pour tout le groupe. */
  current: string | null
  showGroup: boolean
  onSelect: (id: string) => void
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('')
}

export function NurserySwitcher({ nurseries, current, showGroup, onSelect }: Props) {
  if (nurseries.length === 0) return null

  const selected = nurseries.find((n) => n.id === current)
  const badge = current === 'group' ? 'TG' : selected ? initials(selected.name) : '?'
  const frame =
    'flex h-11 items-center gap-2 rounded-lg border border-shell-border bg-white px-2 text-sm text-[#1e2430]'
  const badgeEl = (
    <span
      aria-hidden="true"
      className="flex size-7 shrink-0 items-center justify-center rounded-md bg-family-today-tint text-xs font-bold text-family-today-ink"
    >
      {badge}
    </span>
  )

  if (nurseries.length === 1 && !showGroup) {
    return (
      <div className={frame}>
        {badgeEl}
        <span className="truncate font-medium">{nurseries[0]?.name}</span>
      </div>
    )
  }

  const missing = current !== null && current !== 'group' && !selected

  return (
    <div className={`${frame} relative`}>
      {badgeEl}
      <label htmlFor="nursery-switcher" className="sr-only">
        Crèche
      </label>
      <select
        id="nursery-switcher"
        value={current ?? ''}
        onChange={(event) => onSelect(event.target.value)}
        className="h-full min-w-0 flex-1 cursor-pointer appearance-none truncate bg-transparent pr-6 font-medium outline-none focus-visible:ring-2 focus-visible:ring-family-today"
      >
        {showGroup && <option value="group">Tout le groupe</option>}
        {missing && (
          <option value={current} disabled>
            Crèche introuvable
          </option>
        )}
        {current === null && (
          <option value="" disabled>
            Choisir une crèche
          </option>
        )}
        {nurseries.map((n) => (
          <option key={n.id} value={n.id}>
            {n.name}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 size-4 text-[#5c6270]" />
    </div>
  )
}
