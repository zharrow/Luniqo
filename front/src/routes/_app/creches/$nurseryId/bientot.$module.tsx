import { createFileRoute, notFound } from '@tanstack/react-router'

import { ComingSoon } from '@/features/shell/coming-soon'
import { soonModule } from '@/features/shell/navigation'

/** Module d'une crèche pas encore réécrit : page qui dit ce qu'il contiendra. */
export const Route = createFileRoute('/_app/creches/$nurseryId/bientot/$module')({
  loader: ({ params }) => {
    const module = soonModule(params.module)
    // Les modules de l'entreprise vivent sous /bientot/….
    if (module?.scope !== 'nursery') throw notFound()
    return module
  },
  component: SoonPage,
})

function SoonPage() {
  return <ComingSoon module={Route.useLoaderData()} />
}
