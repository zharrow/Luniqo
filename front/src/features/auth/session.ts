import { type QueryClient, queryOptions } from '@tanstack/react-query'
import { z } from 'zod'

import { fetchClient } from '@/api/client'
import { ApiError } from '@/api/errors'
import type { Session } from '@/api/types'

/**
 * Session en cours (`GET /api/v2/auth/me`), lue par les gardes de route.
 * Les gardes ne protègent que l'affichage : toute autorisation reste dans l'API.
 */
export const sessionQuery = queryOptions({
  queryKey: ['session'],
  queryFn: async (): Promise<Session> => {
    const { data } = await fetchClient.GET('/api/v2/auth/me')
    if (data === undefined) throw new Error('Réponse vide')
    return data
  },
  staleTime: 30_000,
  retry: false,
  // Une 401 est ici une réponse attendue (pas de session) : la garde la traite.
  meta: { handlesAuthErrors: true },
})

/** Session en cours, ou `null` s'il n'y en a pas (401). */
export async function loadSession(queryClient: QueryClient): Promise<Session | null> {
  try {
    return await queryClient.query(sessionQuery)
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}

/** Paramètre `?redirect=` des écrans de connexion ; une valeur invalide est ignorée. */
export const redirectSearch = z.object({ redirect: z.string().optional().catch(undefined) })
