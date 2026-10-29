import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'

import { $api } from '@/api/client'
import { errorMessage } from '@/api/errors'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoginForm } from '@/features/auth/login-form'
import { stepHref } from '@/features/auth/next-step'
import { loadSession, redirectSearch, sessionQuery } from '@/features/auth/session'

export const Route = createFileRoute('/connexion/')({
  validateSearch: redirectSearch,
  beforeLoad: async ({ context, search }) => {
    const session = await loadSession(context.queryClient)
    if (session !== null) throw redirect({ href: stepHref(session.mfa, search.redirect) })
  },
  component: LoginPage,
})

function LoginPage() {
  const { redirect: target } = Route.useSearch()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const login = $api.useMutation('post', '/api/v2/auth/login', {
    onSuccess: (session) => {
      queryClient.setQueryData(sessionQuery.queryKey, session)
      void navigate({ href: stepHref(session.mfa, target) })
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1>Connexion</h1>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <LoginForm
          onSubmit={(body) => login.mutate({ body })}
          pending={login.isPending}
          error={login.isError ? errorMessage(login.error) : null}
        />
      </CardContent>
    </Card>
  )
}
