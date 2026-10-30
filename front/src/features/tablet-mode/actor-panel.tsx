import type { Schemas } from '@/api/types'
import { Button } from '@/components/ui/button'
import { formatTime } from '@/lib/dates'

type ActorPanelProps = {
  actor: Schemas['TabletActorOut']
  onEnd: () => void
  ending?: boolean
}

/** Employé identifié par son PIN, pour une session d'action de 2 minutes. */
export function ActorPanel({ actor, onEnd, ending = false }: ActorPanelProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-card p-4">
      <div className="grid gap-1">
        <h2 className="text-2xl font-semibold">Bonjour {actor.display_name}</h2>
        <p className="text-muted-foreground">Identifié·e jusqu&apos;à {formatTime(actor.expires_at)}</p>
      </div>
      <Button size="lg" className="h-14 px-8 text-lg" disabled={ending} onClick={onEnd}>
        {ending ? 'Fin de session…' : 'Terminer'}
      </Button>
    </div>
  )
}
