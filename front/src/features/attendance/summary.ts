import type { Schemas } from '@/api/types'

export type DaySummary = {
  /** Enfants arrivés et pas encore partis. */
  present: number
  /** Arrivées pointées dans la journée (un enfant revenu compte deux fois). */
  arrivals: number
  /** Départs pointés dans la journée. */
  departures: number
}

/** Chiffres du jour, à partir des présences renvoyées par l'API. */
export function summarize(presences: Schemas['AttendanceOut'][]): DaySummary {
  const departures = presences.filter((presence) => presence.departed_at !== null).length
  return { present: presences.length - departures, arrivals: presences.length, departures }
}
