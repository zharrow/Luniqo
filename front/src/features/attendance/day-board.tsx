import { errorMessage } from '@/api/errors'
import type { Schemas } from '@/api/types'
import { FormError } from '@/components/form-error'
import { formatTime } from '@/lib/dates'

import { summarize } from './summary'

type Presence = Schemas['AttendanceOut']

type DayBoardProps = {
  presences: Presence[] | undefined
  pending: boolean
  error: unknown
}

/**
 * Présences du jour d'une crèche : chiffres, puis une ligne par arrivée, avec
 * qui a pointé et qui a amené ou cherché l'enfant (traçabilité du pointage).
 */
export function DayBoard({ presences, pending, error }: DayBoardProps) {
  if (pending) return <p className="text-muted-foreground">Chargement des présences…</p>
  if (error !== null && error !== undefined) return <FormError message={errorMessage(error)} />
  if (presences === undefined || presences.length === 0) {
    return <p className="text-muted-foreground">Aucune arrivée pointée aujourd&apos;hui.</p>
  }
  const summary = summarize(presences)

  return (
    <div className="grid gap-4">
      <dl className="grid grid-cols-3 gap-3">
        <Figure label="Présents en ce moment" value={summary.present} />
        <Figure label="Arrivées" value={summary.arrivals} />
        <Figure label="Départs" value={summary.departures} />
      </dl>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <caption className="sr-only">Présences du jour, par heure d&apos;arrivée</caption>
          <thead className="border-b bg-muted/50 text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Enfant
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Arrivée
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Départ
              </th>
            </tr>
          </thead>
          <tbody>
            {presences.map((presence) => (
              <tr key={presence.id} className="border-b last:border-0">
                <th scope="row" className="px-4 py-3 font-medium">
                  {presence.child_name}
                  {presence.departed_at === null && (
                    <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">
                      Présent·e
                    </span>
                  )}
                </th>
                <td className="px-4 py-3">
                  <Moment
                    at={presence.arrived_at}
                    by={presence.arrival_by}
                    with={presence.dropped_off_by}
                    verb="amené·e par"
                  />
                </td>
                <td className="px-4 py-3">
                  {presence.departed_at === null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <Moment
                      at={presence.departed_at}
                      by={presence.departure_by}
                      with={presence.picked_up_by}
                      verb="parti·e avec"
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid gap-1 rounded-lg border bg-card p-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-3xl font-semibold">{value}</dd>
    </div>
  )
}

type MomentProps = { at: string; by: string | null; with: string | null; verb: string }

/** Heure (Paris), puis qui a pointé et la personne de la famille, s'ils sont connus. */
function Moment({ at, by, with: guardian, verb }: MomentProps) {
  return (
    <span className="grid">
      <span className="font-medium">{formatTime(at)}</span>
      {guardian !== null && (
        <span>
          {verb} {guardian}
        </span>
      )}
      {by !== null && <span className="text-muted-foreground">pointé par {by}</span>}
    </span>
  )
}
