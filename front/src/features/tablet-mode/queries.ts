import { queryOptions } from '@tanstack/react-query'

import { fetchClient } from '@/api/client'
import { ApiError } from '@/api/errors'
import type { Schemas } from '@/api/types'

/**
 * Session d'action en cours sur la tablette (`GET /api/v2/tablet/session`), ou
 * `null` s'il n'y en a pas : une 401 est ici la réponse normale (PIN à saisir).
 */
export const actorQuery = queryOptions({
  queryKey: ['tablet', 'session'],
  queryFn: async (): Promise<Schemas['TabletActorOut'] | null> => {
    try {
      const { data } = await fetchClient.GET('/api/v2/tablet/session')
      return data ?? null
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null
      throw error
    }
  },
  retry: false,
})
