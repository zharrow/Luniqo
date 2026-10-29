import { createFileRoute } from '@tanstack/react-router'

import { $api } from '@/api/client'
import { NurseryList } from '@/features/nurseries/nursery-list'

export const Route = createFileRoute('/_app/accueil')({
  component: HomePage,
})

const STAFF_ROLES = new Set(['owner', 'employee'])

function HomePage() {
  const { session } = Route.useRouteContext()
  const isStaff = STAFF_ROLES.has(session.role)
  const nurseries = $api.useQuery('get', '/api/v2/nurseries', {}, { enabled: isStaff })

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Bonjour {session.first_name}</h1>
      {isStaff ? (
        <section aria-labelledby="creches" className="grid gap-3">
          <h2 id="creches" className="text-lg font-medium">
            Vos crèches
          </h2>
          <NurseryList nurseries={nurseries.data} pending={nurseries.isPending} error={nurseries.error} />
        </section>
      ) : (
        <p className="text-muted-foreground">Votre espace arrive bientôt.</p>
      )}
    </div>
  )
}
