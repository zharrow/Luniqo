import { useMutation } from '@tanstack/react-query'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { Download } from 'lucide-react'
import { z } from 'zod'

import { $api } from '@/api/client'
import { errorMessage } from '@/api/errors'
import { FormError } from '@/components/form-error'
import { Button } from '@/components/ui/button'
import { downloadAttendanceCsv } from '@/features/attendance/export-csv'
import { HistoryBoard } from '@/features/attendance/history-board'
import { lastDays, type Period, periodError } from '@/features/attendance/period'
import { PeriodForm } from '@/features/attendance/period-form'
import { formatDay, todayInParis } from '@/lib/dates'

// Période dans l'adresse : un historique se garde en favori et se partage. Une valeur mal formée est ignorée.
const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .catch(undefined)
const search = z.object({ du: day, au: day })

/** Présences d'une crèche sur une période et export CSV, pour la direction et les employés qui y ont accès. */
export const Route = createFileRoute('/_app/creches/$nurseryId/presences_/historique')({
  validateSearch: search,
  beforeLoad: ({ context }) => {
    // Affichage seulement : l'API refuse de toute façon (403) aux familles.
    if (context.session.role !== 'owner' && context.session.role !== 'employee') throw redirect({ to: '/accueil' })
  },
  component: HistoryPage,
})

function HistoryPage() {
  const { nurseryId } = Route.useParams()
  const { du, au } = Route.useSearch()
  const navigate = Route.useNavigate()
  const today = todayInParis()
  // Bornes absentes de l'adresse : complétées comme le fait l'API (7 jours jusqu'à aujourd'hui).
  const to = au ?? today
  const period: Period = { from: du ?? lastDays(to).from, to }
  const invalid = periodError(period)

  const path = { nursery_id: nurseryId }
  const nursery = $api.useQuery('get', '/api/v2/nurseries/{nursery_id}', { params: { path } })
  const presences = $api.useQuery(
    'get',
    '/api/v2/nurseries/{nursery_id}/attendance/history',
    { params: { path, query: period } },
    { enabled: invalid === null },
  )
  const exportCsv = useMutation({ mutationFn: () => downloadAttendanceCsv(nurseryId, period) })

  function show(next: Period) {
    exportCsv.reset()
    void navigate({ search: { du: next.from, au: next.to } })
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <Link
          to="/creches/$nurseryId/presences"
          params={{ nurseryId }}
          className="text-sm text-primary underline underline-offset-4"
        >
          Présences du jour
        </Link>
        <h1 className="text-2xl font-semibold">
          Historique des présences{nursery.data === undefined ? '' : ` · ${nursery.data.name}`}
        </h1>
      </div>
      <PeriodForm key={`${period.from}_${period.to}`} period={period} today={today} onChange={show} />
      {invalid !== null ? (
        <FormError message={invalid} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <p aria-live="polite" className="text-muted-foreground">
              Du {formatDay(period.from)} au {formatDay(period.to)}
            </p>
            <Button
              variant="outline"
              className="h-11"
              disabled={exportCsv.isPending}
              onClick={() => exportCsv.mutate()}
            >
              <Download aria-hidden="true" />
              {exportCsv.isPending ? 'Export en cours…' : 'Exporter en CSV'}
            </Button>
          </div>
          {exportCsv.isError && <FormError message={errorMessage(exportCsv.error)} />}
          <HistoryBoard
            presences={presences.data}
            today={today}
            pending={presences.isPending}
            error={presences.error ?? nursery.error}
          />
        </>
      )}
    </div>
  )
}
