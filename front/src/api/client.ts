import createFetchClient, { type Middleware } from 'openapi-fetch'
import createClient from 'openapi-react-query'

import { toApiError } from './errors'
import type { paths } from './schema'

/**
 * Toute réponse en erreur devient une `ApiError` levée : TanStack Query la
 * reçoit telle quelle, en-tête Retry-After compris.
 */
const throwOnError: Middleware = {
  async onResponse({ response }) {
    if (response.ok) return undefined
    const body: unknown = await response
      .clone()
      .json()
      .catch(() => null)
    throw toApiError(response.status, body, response.headers.get('Retry-After'))
  },
}

/**
 * Même origine que le front (passerelle nginx) : le cookie de session
 * `HttpOnly` part de lui-même, aucun jeton n'est manipulé par le JavaScript,
 * et le navigateur envoie l'en-tête Origin que l'API exige sur les écritures.
 */
export const fetchClient = createFetchClient<paths>({ baseUrl: '', credentials: 'same-origin' })
fetchClient.use(throwOnError)

/** Requêtes et mutations typées par le contrat de l'API. */
export const $api = createClient(fetchClient)
