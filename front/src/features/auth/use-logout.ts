import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'

import { $api } from '@/api/client'

/** Déconnexion : session supprimée par l'API, cache vidé, retour à la connexion. */
export function useLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return $api.useMutation('post', '/api/v2/auth/logout', {
    onSettled: () => {
      queryClient.clear()
      void navigate({ to: '/connexion' })
    },
  })
}
