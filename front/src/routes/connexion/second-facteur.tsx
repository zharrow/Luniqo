import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { $api } from '@/api/client'
import { errorMessage } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CodeForm } from '@/features/auth/code-form'
import { requireStep } from '@/features/auth/guards'
import { stepHref } from '@/features/auth/next-step'
import { redirectSearch, sessionQuery } from '@/features/auth/session'
import { useLogout } from '@/features/auth/use-logout'

export const Route = createFileRoute('/connexion/second-facteur')({
  validateSearch: redirectSearch,
  beforeLoad: ({ context, search }) => requireStep(context.queryClient, '/connexion/second-facteur', search.redirect),
  component: SecondFactorPage,
})

function SecondFactorPage() {
  const { redirect: target } = Route.useSearch()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const logout = useLogout()
  const verify = $api.useMutation('post', '/api/v2/auth/mfa/verify', {
    onSuccess: (session) => {
      queryClient.setQueryData(sessionQuery.queryKey, session)
      void navigate({ href: stepHref(session.mfa, target) })
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1>Second facteur</h1>
        </CardTitle>
        <CardDescription>
          Saisissez le code affiché par votre application d&apos;authentification, ou l&apos;un de vos codes de secours.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <CodeForm
          onSubmit={(body) => verify.mutate({ body })}
          pending={verify.isPending}
          error={verify.isError ? errorMessage(verify.error) : null}
        />
        <Button variant="link" onClick={() => logout.mutate({})} disabled={logout.isPending}>
          Utiliser un autre compte
        </Button>
      </CardContent>
    </Card>
  )
}
