import { createFileRoute, Link } from '@tanstack/react-router'
import { ClipboardList, KeyRound, Tablet, Trophy } from 'lucide-react'

import { $api } from '@/api/client'
import { NurseryList } from '@/features/nurseries/nursery-list'
import { NurserySummary } from '@/features/nurseries/nursery-summary'
import { RouterLink } from '@/features/shell/app-shell'
import { PageHeader } from '@/features/shell/page-header'
import { ToDoSection, useToDo } from '@/features/todo/todo-section'
import { toDoTitle } from '@/features/todo/todo-text'
import { formatLongDay, todayInParis } from '@/lib/dates'

export const Route = createFileRoute('/_app/accueil')({
  component: HomePage,
})

const STAFF_ROLES = new Set(['owner', 'employee'])

const LINK = 'inline-flex min-h-11 items-center gap-2 text-primary underline underline-offset-4'

function HomePage() {
  const { session } = Route.useRouteContext()
  const isStaff = STAFF_ROLES.has(session.role)
  const isOwner = session.role === 'owner'
  const nurseries = $api.useQuery('get', '/api/v2/nurseries', {}, { enabled: isStaff })
  // Même requête que la section « À traiter » : lue une fois, partagée par le titre.
  const toDo = useToDo(isOwner)
  const total = toDo.data?.total ?? 0

  return (
    <div className="grid gap-6">
      <PageHeader
        title={session.role === 'employee' ? 'Ma journée' : isOwner && total > 0 ? toDoTitle(total) : 'Accueil'}
        kicker={isOwner ? formatLongDay(todayInParis()) : undefined}
        link={RouterLink}
      />
      {isOwner && <ToDoSection link={RouterLink} />}
      {isStaff && (
        <section aria-labelledby="creches" className="grid gap-3">
          <h2 id="creches" className="text-lg font-medium">
            {isOwner ? 'Vos crèches maintenant' : 'Vos crèches'}
          </h2>
          <NurseryList
            nurseries={nurseries.data}
            pending={nurseries.isPending}
            error={nurseries.error}
            onRetry={() => void nurseries.refetch()}
            summary={(nursery) => <NurserySummary nurseryId={nursery.id} />}
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
                {isOwner && (
                  <>
                    <Link
                      to="/creches/$nurseryId/tablettes"
                      params={{ nurseryId: nursery.id }}
                      aria-label={`Tablettes de ${nursery.name}`}
                      className={LINK}
                    >
                      <Tablet aria-hidden="true" className="size-4" />
                      Tablettes
                    </Link>
                    <Link
                      to="/creches/$nurseryId/mise-en-route"
                      params={{ nurseryId: nursery.id }}
                      aria-label={`Mise en route de ${nursery.name}`}
                      className={LINK}
                    >
                      <Trophy aria-hidden="true" className="size-4" />
                      Mise en route
                    </Link>
                  </>
                )}
              </div>
            )}
          />
        </section>
      )}
      {session.role === 'employee' && (
        <section aria-labelledby="tablette" className="grid gap-2">
          <h2 id="tablette" className="text-lg font-medium">
            Tablette
          </h2>
          <Link to="/mon-pin" className={LINK}>
            <KeyRound aria-hidden="true" className="size-4" />
            Choisir ou changer mon PIN de tablette
          </Link>
        </section>
      )}
      {!isStaff && <p className="text-muted-foreground">Votre espace arrive bientôt.</p>}
    </div>
  )
}
