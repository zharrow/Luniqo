import { fetchClient } from '@/api/client'

import type { Period } from './period'

/**
 * Télécharge l'export CSV de la période. Lu par `fetch` plutôt que par un
 * simple lien : une session expirée ou un refus de l'API s'affichent dans la
 * page au lieu de donner un fichier contenant l'erreur.
 */
export async function downloadAttendanceCsv(nurseryId: string, period: Period): Promise<void> {
  const { data, response } = await fetchClient.GET('/api/v2/nurseries/{nursery_id}/attendance/history.csv', {
    params: { path: { nursery_id: nurseryId }, query: period },
    parseAs: 'blob',
  })
  const name = fileName(response.headers.get('Content-Disposition')) ?? `presences_${period.from}_${period.to}.csv`
  saveFile(data ?? new Blob([]), name)
}

/** Nom proposé par l'API (`attachment; filename="presences_….csv"`), s'il est sûr. */
export function fileName(disposition: string | null): string | null {
  const name = disposition?.match(/filename="([^"]+)"/)?.[1]
  return name !== undefined && /^[\w.-]+$/.test(name) ? name : null
}

/** Propose le fichier au navigateur, puis libère sa mémoire. */
function saveFile(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
  // Laissé un instant : certains navigateurs lisent l'adresse après le clic.
  setTimeout(() => URL.revokeObjectURL(url), 1_000)
}
