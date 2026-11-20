import { createFileRoute, notFound } from '@tanstack/react-router'

import { ComingSoon } from '@/features/shell/coming-soon'
import { soonModule } from '@/features/shell/navigation'

/** Module de l'entreprise pas encore réécrit : page qui dit ce qu'il contiendra. */
export const Route = createFileRoute('/_app/bientot/$module')({
  loader: ({ params }) => {
    const module = soonModule(params.module)
    // Les modules propres à une crèche vivent sous /creches/$nurseryId/bientot/….
    if (module?.scope !== 'enterprise') throw notFound()
    return module
  },
  component: SoonPage,
})

function SoonPage() {
  return <ComingSoon module={Route.useLoaderData()} />
}
