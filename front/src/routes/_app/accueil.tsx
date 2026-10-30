import { createFileRoute, Link } from '@tanstack/react-router'
import { ClipboardList, Tablet } from 'lucide-react'

import { $api } from '@/api/client'
import { NurseryList } from '@/features/nurseries/nursery-list'

export const Route = createFileRoute('/_app/accueil')({
  component: HomePage,
})

const STAFF_ROLES = new Set(['owner', 'employee'])

const LINK = 'inline-flex min-h-11 items-center gap-2 text-primary underline underline-offset-4'

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
          <NurseryList
            nurseries={nurseries.data}
            pending={nurseries.isPending}
            error={nurseries.error}
            actions={(nursery) => (
              <div className="flex flex-wrap gap-x-5">
                <Link
                  to="/creches/$nurseryId/presences"
                  params={{ nurseryId: nursery.id }}
                  aria-label={`Présences de ${nursery.name}`}
                  className={LINK}
                >
                  <ClipboardList aria-hidden="true" className="size-4" />
                  Présences
                </Link>
                {session.role === 'owner' && (
                  <Link
                    to="/creches/$nurseryId/tablettes"
                    params={{ nurseryId: nursery.id }}
                    aria-label={`Tablettes de ${nursery.name}`}
                    className={LINK}
                  >
                    <Tablet aria-hidden="true" className="size-4" />
                    Tablettes
                  </Link>
                )}
              </div>
            )}
          />
        </section>
      ) : (
        <p className="text-muted-foreground">Votre espace arrive bientôt.</p>
      )}
    </div>
  )
}
