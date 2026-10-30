import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { RefreshCw } from 'lucide-react'

import { $api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { DayBoard } from '@/features/attendance/day-board'
import { formatTime } from '@/lib/dates'

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
        <h1 className="text-2xl font-semibold">
          Présences du jour{nursery.data === undefined ? '' : ` · ${nursery.data.name}`}
        </h1>
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
      </div>
      <DayBoard presences={presences.data} pending={presences.isPending} error={presences.error ?? nursery.error} />
    </div>
  )
}
