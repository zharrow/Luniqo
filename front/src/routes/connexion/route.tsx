import { createFileRoute, Outlet } from '@tanstack/react-router'

import { LogoMark } from '@/features/shell/creature'

/** Mise en page des écrans de connexion : une carte centrée. */
export const Route = createFileRoute('/connexion')({
  component: ConnexionLayout,
})

function ConnexionLayout() {
  return (
    <main className="grid min-h-svh place-items-center bg-gradient-to-br from-secondary/40 via-background to-accent/40 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <LogoMark size={56} />
          <p className="text-2xl font-semibold text-primary">Luniqo</p>
        </div>
        <Outlet />
      </div>
    </main>
  )
}
