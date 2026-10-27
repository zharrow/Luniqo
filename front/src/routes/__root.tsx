import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Link, Outlet, type ErrorComponentProps } from '@tanstack/react-router'

import { errorMessage } from '@/api/errors'
import { FormError } from '@/components/form-error'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: Outlet,
  notFoundComponent: NotFound,
  errorComponent: RootError,
})

function NotFound() {
  return (
    <main className="mx-auto grid max-w-md gap-4 p-6">
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
