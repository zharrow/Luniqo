import { createFileRoute, redirect } from '@tanstack/react-router'
import { RefreshCw } from 'lucide-react'

import { $api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { AddPresence, CorrectPresence } from '@/features/attendance/corrections'
import { DayBoard } from '@/features/attendance/day-board'
import { DayNotes } from '@/features/notes/day-notes'
import { RouterLink } from '@/features/shell/app-shell'
import { PageHeader } from '@/features/shell/page-header'
import { formatLongDay, formatTime, todayInParis } from '@/lib/dates'
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
      <PageHeader
        title="Présences"
        kicker={formatLongDay(today)}
        breadcrumb={nursery.data === undefined ? ['Présences'] : [nursery.data.name, 'Présences']}
        link={RouterLink}
        actions={
          manager && nursery.isSuccess && presences.isSuccess ? (
            <AddPresence nurseryId={nurseryId} today={today} defaultDay={today} />
          ) : undefined
        }
        tabs={[
          { label: "Aujourd'hui", href: `/creches/${nurseryId}/presences`, current: true },
          { label: 'Historique', href: `/creches/${nurseryId}/presences/historique`, current: false },
        ]}
      />
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
