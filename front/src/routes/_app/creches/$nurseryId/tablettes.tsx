import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { CircleCheck, LogOut } from 'lucide-react'

import { $api } from '@/api/client'
import { errorMessage } from '@/api/errors'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLogout } from '@/features/auth/use-logout'
import { EnrollForm } from '@/features/tablets/enroll-form'
import { TabletList } from '@/features/tablets/tablet-list'
import { formatDate } from '@/lib/dates'

/** Tablettes d'une crèche : enrôlement de l'appareil courant, liste, révocation. Direction seulement. */
export const Route = createFileRoute('/_app/creches/$nurseryId/tablettes')({
  beforeLoad: ({ context }) => {
    // Affichage seulement : l'API refuse de toute façon (403) à un autre rôle.
    if (context.session.role !== 'owner') throw redirect({ to: '/accueil' })
  },
  component: TabletsPage,
})

const TABLETS = '/api/v2/nurseries/{nursery_id}/tablets'

function TabletsPage() {
  const { nurseryId } = Route.useParams()
  const params = { params: { path: { nursery_id: nurseryId } } }
  const queryClient = useQueryClient()
  const logout = useLogout()

  const nursery = $api.useQuery('get', '/api/v2/nurseries/{nursery_id}', params)
  const tablets = $api.useQuery('get', TABLETS, params)
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['get', TABLETS] })
  const enroll = $api.useMutation('post', TABLETS, { onSuccess: refresh })
  const revoke = $api.useMutation('delete', '/api/v2/nurseries/{nursery_id}/tablets/{tablet_id}', {
    onSuccess: refresh,
  })

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <Link to="/accueil" className="text-sm text-primary underline underline-offset-4">
          Vos crèches
        </Link>
        <h1 className="text-2xl font-semibold">
          Tablettes{nursery.data === undefined ? '' : ` de ${nursery.data.name}`}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Enrôler cet appareil</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {enroll.isSuccess ? (
            <>
              <Alert>
                <CircleCheck aria-hidden="true" />
                <AlertDescription>
                  « {enroll.data.label} » est enrôlée sur cet appareil jusqu&apos;au{' '}
                  {formatDate(enroll.data.expires_at)}. Déconnectez-vous pour la laisser aux employés.
                </AlertDescription>
              </Alert>
              <Button
                size="lg"
                className="h-11 justify-self-start"
                onClick={() => logout.mutate({})}
                disabled={logout.isPending}
              >
                <LogOut aria-hidden="true" />
                Se déconnecter
              </Button>
            </>
          ) : (
            <EnrollForm
              onSubmit={(body) => enroll.mutate({ ...params, body })}
              pending={enroll.isPending}
              error={enroll.isError ? errorMessage(enroll.error) : null}
            />
          )}
        </CardContent>
      </Card>

      <section aria-labelledby="tablettes" className="grid gap-3">
        <h2 id="tablettes" className="text-lg font-medium">
          Tablettes enrôlées
        </h2>
        <TabletList
          tablets={tablets.data}
          pending={tablets.isPending}
          error={tablets.error ?? nursery.error}
          onRevoke={(tabletId) => revoke.mutate({ params: { path: { nursery_id: nurseryId, tablet_id: tabletId } } })}
          revoking={revoke.isPending ? revoke.variables.params.path.tablet_id : null}
          revokeError={revoke.isError ? errorMessage(revoke.error) : null}
        />
      </section>
    </div>
  )
}
