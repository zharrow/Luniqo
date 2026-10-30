import type { Schemas } from '@/api/types'
import { Button } from '@/components/ui/button'

// Heure de Paris : celle de la crèche, quel que soit le fuseau de la tablette.
const time = new Intl.DateTimeFormat('fr-FR', { timeStyle: 'short', timeZone: 'Europe/Paris' })

type ActorPanelProps = {
  actor: Schemas['TabletActorOut']
  onEnd: () => void
  ending?: boolean
}

/** Employé identifié par son PIN, pour une session d'action de 2 minutes. */
export function ActorPanel({ actor, onEnd, ending = false }: ActorPanelProps) {
  return (
    <div className="mx-auto grid w-full max-w-md gap-5 text-center">
      <h2 className="text-3xl font-semibold">Bonjour {actor.display_name}</h2>
      <p className="text-lg text-muted-foreground">
        Vous êtes identifié·e jusqu&apos;à {time.format(new Date(actor.expires_at))}. Terminez quand vous avez fini.
      </p>
      <Button size="lg" className="h-16 text-xl" disabled={ending} onClick={onEnd}>
        {ending ? 'Fin de session…' : 'Terminer'}
      </Button>
    </div>
  )
}
