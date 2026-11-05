import type { Schemas } from '@/api/types'
import { addDays, daysBetween } from '@/lib/dates'

type Presence = Schemas['AttendanceOut']

/** Période demandée à l'API, bornes comprises, en jours du calendrier (« 2026-10-30 »). */
export type Period = { from: string; to: string }

// Mêmes valeurs que l'API (api/app/exports.py) : 7 jours par défaut, 366 au plus.
export const DEFAULT_DAYS = 7
export const MAX_DAYS = 366

/** Les `count` derniers jours, aujourd'hui compris. */
export function lastDays(today: string, count: number = DEFAULT_DAYS): Period {
  return { from: addDays(today, -(count - 1)), to: today }
}

/** Du 1er du mois à aujourd'hui. */
export function thisMonth(today: string): Period {
  return { from: `${today.slice(0, 7)}-01`, to: today }
}

/** Le mois précédent en entier (facturation, déclaration mensuelle). */
export function previousMonth(today: string): Period {
  const to = addDays(`${today.slice(0, 7)}-01`, -1)
  return { from: `${to.slice(0, 7)}-01`, to }
}

/**
 * Message si la période n'a pas de sens, sinon null. Confort de saisie : l'API
 * fait la même vérification, avec les mêmes messages.
 */
export function periodError({ from, to }: Period): string | null {
  if (from > to) return 'La date de début suit la date de fin'
  if (daysBetween(from, to) + 1 > MAX_DAYS) return `Période limitée à ${MAX_DAYS} jours par requête`
  return null
}

export type Day = { day: string; presences: Presence[] }

/** Présences regroupées par jour, dans l'ordre de l'API (jour, puis heure d'arrivée). */
export function groupByDay(presences: Presence[]): Day[] {
  const days: Day[] = []
  for (const presence of presences) {
    const last = days.at(-1)
    if (last?.day === presence.day) last.presences.push(presence)
    else days.push({ day: presence.day, presences: [presence] })
  }
  return days
}

export type PeriodSummary = {
  /** Arrivées pointées (un enfant revenu dans la journée compte deux fois). */
  arrivals: number
  /** Enfants différents accueillis. */
  children: number
  /** Jours avec au moins une arrivée. */
  days: number
  /** Arrivées d'un jour passé sans départ pointé : à corriger par la direction. */
  missingDepartures: number
}

/** Chiffres de la période. `today` sert à distinguer un enfant présent d'un départ oublié. */
export function summarizePeriod(presences: Presence[], today: string): PeriodSummary {
  return {
    arrivals: presences.length,
    children: new Set(presences.map((presence) => presence.child_id)).size,
    days: new Set(presences.map((presence) => presence.day)).size,
    missingDepartures: presences.filter((presence) => isMissingDeparture(presence, today)).length,
  }
}

/** Départ jamais pointé : l'enfant n'est pas reparti un jour passé, ce qui ne peut être qu'un oubli. */
export function isMissingDeparture(presence: Presence, today: string): boolean {
  return presence.departed_at === null && presence.day < today
}
