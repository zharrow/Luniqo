import { createFileRoute, Link, redirect } from '@tanstack/react-router'

import { $api } from '@/api/client'
import { OnboardingSteps } from '@/features/nurseries/onboarding-steps'
import { retryFailed } from '@/lib/retry-failed'

/** Mise en route d'une crèche : succès obtenus et ce qu'il reste à faire (LUN-128). Direction seulement. */
export const Route = createFileRoute('/_app/creches/$nurseryId/mise-en-route')({
  beforeLoad: ({ context }) => {
    // Affichage seulement : l'API refuse de toute façon (403) à un autre rôle.
    if (context.session.role !== 'owner') throw redirect({ to: '/accueil' })
  },
  component: OnboardingPage,
})

const LINK = 'inline-flex min-h-11 items-center text-primary underline underline-offset-4'

function OnboardingPage() {
  const { nurseryId } = Route.useParams()
  const params = { params: { path: { nursery_id: nurseryId } } }
  const nursery = $api.useQuery('get', '/api/v2/nurseries/{nursery_id}', params)
  const onboarding = $api.useQuery('get', '/api/v2/nurseries/{nursery_id}/onboarding', params)

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <Link to="/accueil" className="text-sm text-primary underline underline-offset-4">
          Vos crèches
        </Link>
        <h1 className="text-2xl font-semibold break-words">
          Mise en route{nursery.data === undefined ? '' : ` · ${nursery.data.name}`}
        </h1>
        <p className="text-muted-foreground">
          Chaque étape franchie devient un succès. Un succès se perd si sa condition disparaît.
        </p>
      </div>
      <section aria-label="Succès de mise en route">
        <OnboardingSteps
          onboarding={onboarding.data}
          pending={onboarding.isPending}
          error={onboarding.error ?? nursery.error}
          onRetry={retryFailed(onboarding, nursery)}
          howTo={{
            tablet: (
              <Link to="/creches/$nurseryId/tablettes" params={{ nurseryId }} className={LINK}>
                Aller aux tablettes
              </Link>
            ),
            first_attendance: (
              <Link to="/creches/$nurseryId/presences" params={{ nurseryId }} className={LINK}>
                Aller aux présences du jour
              </Link>
            ),
          }}
        />
      </section>
    </div>
  )
}
