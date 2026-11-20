import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { History, RefreshCw } from 'lucide-react'

import { $api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { AddPresence, CorrectPresence } from '@/features/attendance/corrections'
import { DayBoard } from '@/features/attendance/day-board'
import { DayNotes } from '@/features/notes/day-notes'
import { formatTime, todayInParis } from '@/lib/dates'
import { retryFailed } from '@/lib/retry-failed'

/** Présences du jour d'une crèche, pour la direction et les employés qui y ont accès. */
export const Route = createFileRoute('/_app/creches/$nurseryId/presences')({
  beforeLoad: ({ context }) => {
    // Affichage seulement : l'API refuse de toute façon (403) aux familles.
    if (context.session.role !== 'owner' && context.session.role !== 'employee') throw redirect({ to: '/accueil' })
  },
  component: PresencesPage,
})

// Tableau suivi pendant la journée : relu régulièrement, sans geste.
const REFRESH_MS = 30_000

function PresencesPage() {
  const { nurseryId } = Route.useParams()
  const { session } = Route.useRouteContext()
  const manager = session.role === 'owner'
  const today = todayInParis()
  const params = { params: { path: { nursery_id: nurseryId } } }
  const nursery = $api.useQuery('get', '/api/v2/nurseries/{nursery_id}', params)
  const presences = $api.useQuery('get', '/api/v2/nurseries/{nursery_id}/attendance', params, {
    refetchInterval: REFRESH_MS,
  })

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <Link to="/accueil" className="text-sm text-primary underline underline-offset-4">
          Vos crèches
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <h1 className="text-2xl font-semibold">
            Présences du jour{nursery.data === undefined ? '' : ` · ${nursery.data.name}`}
          </h1>
          {manager && nursery.isSuccess && presences.isSuccess && (
            <AddPresence nurseryId={nurseryId} today={today} defaultDay={today} />
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        {presences.dataUpdatedAt > 0 && (
          <span aria-live="polite">Mis à jour à {formatTime(new Date(presences.dataUpdatedAt).toISOString())}</span>
        )}
        <Button
          variant="outline"
          className="h-11"
          disabled={presences.isFetching}
          onClick={() => void presences.refetch()}
        >
          <RefreshCw aria-hidden="true" />
          Actualiser
        </Button>
        <Link
          to="/creches/$nurseryId/presences/historique"
          params={{ nurseryId }}
          className="inline-flex min-h-11 items-center gap-2 text-primary underline underline-offset-4"
        >
          <History aria-hidden="true" className="size-4" />
          Historique et export
        </Link>
      </div>
      <DayBoard
        presences={presences.data}
        pending={presences.isPending}
        error={presences.error ?? nursery.error}
        onRetry={retryFailed(presences, nursery)}
        action={manager ? (presence) => <CorrectPresence nurseryId={nurseryId} presence={presence} /> : undefined}
      />
      {presences.isSuccess && (
        <section aria-labelledby="transmissions" className="grid gap-3">
          <h2 id="transmissions" className="text-lg font-medium">
            Transmissions du jour
          </h2>
          <DayNotes nurseryId={nurseryId} presences={presences.data} />
        </section>
      )}
    </div>
  )
}
