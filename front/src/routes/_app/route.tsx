import { createFileRoute, Outlet } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { requireStep } from '@/features/auth/guards'
import { useLogout } from '@/features/auth/use-logout'

/**
 * Espace connecté : session complète exigée (second facteur présenté s'il est requis).
 * Les écrans enfants reçoivent la session dans leur contexte.
 */
export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context, location }) => ({
    session: await requireStep(context.queryClient, 'app', location.href),
  }),
  component: AppLayout,
})

function AppLayout() {
  const { session } = Route.useRouteContext()
  const logout = useLogout()
  return (
    <div className="min-h-svh">
      <header className="flex items-center justify-between border-b bg-card px-4 py-3">
        <p className="text-lg font-semibold text-primary">Luniqo</p>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {session.first_name} {session.last_name}
          </span>
          <Button variant="outline" onClick={() => logout.mutate({})} disabled={logout.isPending}>
            <LogOut aria-hidden="true" />
            Se déconnecter
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-4xl p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  )
}
