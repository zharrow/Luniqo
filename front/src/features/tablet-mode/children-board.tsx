import type { Schemas } from '@/api/types'
import { Button } from '@/components/ui/button'
import { formatTime } from '@/lib/dates'

type Child = Schemas['TabletChild']

type ChildrenBoardProps = {
  /** Enfants attendus aujourd'hui (`GET /api/v2/tablet/children`). */
  expected: Child[]
  onSelect: (child: Child) => void
}

const GROUPS = [
  { presence: 'absent', title: 'À accueillir' },
  { presence: 'present', title: 'Présents' },
  { presence: 'left', title: 'Partis' },
] as const

/**
 * Enfants attendus aujourd'hui, rangés par état. Un enfant parti peut revenir :
 * l'API ouvre alors une nouvelle présence.
 */
export function ChildrenBoard({ expected, onSelect }: ChildrenBoardProps) {
  if (expected.length === 0) {
    return <p className="text-lg text-muted-foreground">Aucun enfant attendu aujourd&apos;hui.</p>
  }
  return (
    <div className="grid gap-6">
      {GROUPS.map(({ presence, title }) => {
        const group = expected.filter((child) => child.presence === presence)
        if (group.length === 0) return null
        const id = `groupe-${presence}`
        return (
          <section key={presence} aria-labelledby={id} className="grid gap-3">
            <h3 id={id} className="text-xl font-semibold">
              {title} <span className="text-muted-foreground">({group.length})</span>
            </h3>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.map((child) => (
                <li key={child.id}>
                  <Button
                    variant={presence === 'present' ? 'secondary' : 'outline'}
                    className="h-auto min-h-20 w-full flex-col items-start gap-1 px-5 py-4 text-left text-xl whitespace-normal"
                    onClick={() => onSelect(child)}
                  >
                    {child.first_name} {child.last_name}
                    <span className="text-sm font-normal text-muted-foreground">{status(child)}</span>
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

function status(child: Child): string {
  if (child.presence === 'present' && child.arrived_at !== null) return `Arrivé·e à ${formatTime(child.arrived_at)}`
  if (child.presence === 'left' && child.departed_at !== null) return `Parti·e à ${formatTime(child.departed_at)}`
  return 'Pas encore arrivé·e'
}
