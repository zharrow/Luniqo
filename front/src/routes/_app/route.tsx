import { createFileRoute, Outlet } from '@tanstack/react-router'

import { requireStep } from '@/features/auth/guards'
import { useLogout } from '@/features/auth/use-logout'
import { AppShell } from '@/features/shell/app-shell'

/**
 * Espace connecté : session complète exigée (second facteur présenté s'il est requis).
 * Les écrans enfants reçoivent la session dans leur contexte ; le cadre dépend du rôle.
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
    <AppShell session={session} onLogout={() => logout.mutate({})} logoutPending={logout.isPending}>
      <Outlet />
    </AppShell>
  )
}
