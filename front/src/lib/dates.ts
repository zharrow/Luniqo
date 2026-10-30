// Heure de Paris : celle des crèches, quel que soit le fuseau de l'appareil (même règle que l'API).
const dateTime = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'Europe/Paris',
})

const date = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'Europe/Paris' })

/** « 30 octobre 2026 à 10:27 » */
export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso))
}

/** « 30 octobre 2026 » */
export function formatDate(iso: string): string {
  return date.format(new Date(iso))
}
