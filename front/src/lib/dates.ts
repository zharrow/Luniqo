// Heure de Paris : celle des crèches, quel que soit le fuseau de l'appareil (même règle que l'API).
const dateTime = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'Europe/Paris',
})

const date = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'Europe/Paris' })

const time = new Intl.DateTimeFormat('fr-FR', { timeStyle: 'short', timeZone: 'Europe/Paris' })

/** « 30 octobre 2026 à 10:27 » */
export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso))
}

/** « 30 octobre 2026 » */
export function formatDate(iso: string): string {
  return date.format(new Date(iso))
}

/** « 10:27 » */
export function formatTime(iso: string): string {
  return time.format(new Date(iso))
}

// Jours du calendrier (« 2026-10-30 »), comme l'API les échange : calculés en UTC,
// où un jour dure toujours 24 heures, ils ne dépendent ni du fuseau ni de l'heure d'été.
const DAY_MS = 86_400_000

const parisDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const longDay = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeZone: 'UTC' })

const calendarDay = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'UTC' })

/** Jour qu'il est à Paris (« 2026-10-30 »), même si l'appareil est réglé sur un autre fuseau. */
export function todayInParis(now: Date = new Date()): string {
  const parts = Object.fromEntries(parisDay.formatToParts(now).map((part) => [part.type, part.value]))
  return `${parts.year ?? ''}-${parts.month ?? ''}-${parts.day ?? ''}`
}

/** Jour décalé de `count` jours (négatif pour reculer). */
export function addDays(day: string, count: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + count * DAY_MS).toISOString().slice(0, 10)
}

/** Nombre de jours de `from` à `to` (0 pour le même jour). */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS)
}

/** « vendredi 30 octobre 2026 » */
export function formatLongDay(day: string): string {
  return longDay.format(new Date(`${day}T00:00:00Z`))
}

/** « 30 octobre 2026 » */
export function formatDay(day: string): string {
  return calendarDay.format(new Date(`${day}T00:00:00Z`))
}
