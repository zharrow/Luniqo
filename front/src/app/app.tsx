import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, type RouterHistory, RouterProvider } from '@tanstack/react-router'

import { ApiError } from '@/api/errors'
import { routeTree } from '@/routeTree.gen'

/**
 * Application : cache des données et routeur. `history` permet aux tests de
 * démarrer sur une adresse donnée (historique en mémoire).
 */
export function createApp(history?: RouterHistory) {
  /**
   * Erreurs communes traitées à un seul endroit (ADR-002 § 4) : session expirée
   * (401) → connexion ; second facteur à présenter (403) → écran du second
   * facteur. Les autres erreurs restent aux écrans, qui les affichent.
   */
  function onApiError(error: Error, meta: Record<string, unknown> | undefined) {
    if (!(error instanceof ApiError) || meta?.handlesAuthErrors === true) return
    const { pathname, href } = router.state.location
    if (pathname.startsWith('/connexion')) return
    if (error.status === 401) {
      queryClient.removeQueries({ queryKey: ['session'] })
      void router.navigate({ to: '/connexion', search: { redirect: href } })
    } else if (error.status === 403 && error.message === 'Second facteur requis') {
      void router.navigate({ to: '/connexion/second-facteur' })
    }
  }

  const queryClient = new QueryClient({
    queryCache: new QueryCache({ onError: (error, query) => onApiError(error, query.meta) }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => onApiError(error, mutation.meta),
    }),
    defaultOptions: {
      queries: {
        // Une erreur 4xx ne se corrige pas en réessayant.
        retry: (failures, error) => !(error instanceof ApiError && error.status < 500) && failures < 2,
      },
    },
  })

  const router = createRouter({
    routeTree,
    context: { queryClient },
    ...(history === undefined ? {} : { history }),
    defaultPreload: 'intent',
    // Le cache des données est celui de TanStack Query, pas celui du routeur.
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
  })

  return { queryClient, router }
}

type AppRouter = ReturnType<typeof createApp>['router']

declare module '@tanstack/react-router' {
  interface Register {
    router: AppRouter
  }
}

const app = createApp()

export function App({ instance = app }: { instance?: ReturnType<typeof createApp> }) {
  return (
    <QueryClientProvider client={instance.queryClient}>
      <RouterProvider router={instance.router} />
    </QueryClientProvider>
  )
}
