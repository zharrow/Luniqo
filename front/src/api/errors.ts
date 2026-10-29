/**
 * Erreurs de l'API, en une seule forme pour tout le front.
 *
 * L'API renvoie `{"detail": "message en français"}`, affichable tel quel, sauf
 * pour les erreurs de validation de FastAPI (422), où `detail` est une liste
 * d'erreurs par champ.
 */

export class ApiError extends Error {
  readonly status: number
  /** Erreurs de validation par champ (422 de FastAPI), clé = nom du champ. */
  readonly fields: Record<string, string>
  /** Secondes à attendre (en-tête Retry-After d'un 429). */
  readonly retryAfter: number | null

  constructor(status: number, message: string, fields: Record<string, string> = {}, retryAfter: number | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields
    this.retryAfter = retryAfter
  }
}

type ValidationItem = { loc?: unknown[]; msg?: unknown }

const UNEXPECTED = 'Une erreur inattendue est survenue. Réessayez dans un instant.'

/** Construit l'erreur à partir de la réponse de l'API et de son corps déjà lu. */
export function toApiError(status: number, body: unknown, retryAfterHeader: string | null): ApiError {
  const retryAfter = parseRetryAfter(retryAfterHeader)
  const detail = typeof body === 'object' && body !== null ? (body as { detail?: unknown }).detail : undefined
  if (typeof detail === 'string') {
    return new ApiError(status, withDelay(detail, retryAfter), {}, retryAfter)
  }
  if (Array.isArray(detail)) {
    const fields: Record<string, string> = {}
    for (const item of detail as ValidationItem[]) {
      const field = item.loc?.at(-1)
      if (typeof field === 'string' && typeof item.msg === 'string') fields[field] = item.msg
    }
    return new ApiError(status, 'Certains champs sont invalides.', fields)
  }
  if (status >= 500)
    return new ApiError(status, 'Le service est momentanément indisponible. Réessayez dans un instant.')
  return new ApiError(status, UNEXPECTED)
}

function parseRetryAfter(header: string | null): number | null {
  if (header === null || !/^\d+$/.test(header)) return null
  return Number(header)
}

function withDelay(message: string, retryAfter: number | null): string {
  if (retryAfter === null) return message
  const minutes = Math.ceil(retryAfter / 60)
  return `${message} (dans ${minutes} minute${minutes > 1 ? 's' : ''})`
}

/** Message à afficher pour n'importe quelle erreur (réseau compris). */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof TypeError) return 'Connexion au serveur impossible. Vérifiez le réseau.'
  return UNEXPECTED
}
