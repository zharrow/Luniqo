import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Link, Outlet, type ErrorComponentProps } from '@tanstack/react-router'

import { errorMessage } from '@/api/errors'
import { FormError } from '@/components/form-error'
import { Creature } from '@/features/shell/creature'
import { ConnectivityBanner } from '@/components/offline-banner'
import type { Connectivity } from '@/lib/connectivity'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient; connectivity: Connectivity }>()({
  component: Root,
  notFoundComponent: NotFound,
  errorComponent: RootError,
})

/** Toutes les pages : bannière hors ligne en haut, tablette et connexion comprises. */
function Root() {
  const { connectivity } = Route.useRouteContext()
  return (
    <>
      <ConnectivityBanner connectivity={connectivity} />
      <Outlet />
    </>
  )
}

function NotFound() {
  return (
    <main className="mx-auto grid max-w-md gap-4 p-6">
      <Creature family="today" size={120} hop />
      <h1 className="text-2xl font-semibold">Page introuvable</h1>
      <Link to="/accueil" className="text-primary underline underline-offset-4">
        Revenir à l&apos;accueil
      </Link>
    </main>
  )
}

function RootError({ error }: ErrorComponentProps) {
  return (
    <main className="mx-auto grid max-w-md gap-4 p-6">
      <h1 className="text-2xl font-semibold">Un problème est survenu</h1>
      <FormError message={errorMessage(error)} />
    </main>
  )
}
