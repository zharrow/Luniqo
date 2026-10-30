import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { CircleCheck } from 'lucide-react'

import { $api } from '@/api/client'
import { errorMessage } from '@/api/errors'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PinForm } from '@/features/pin/pin-form'

/** PIN de tablette de l'employé : il s'identifie avec sur la tablette de sa crèche. */
export const Route = createFileRoute('/_app/mon-pin')({
  beforeLoad: ({ context }) => {
    // Affichage seulement : l'API refuse de toute façon (403) aux autres rôles.
    if (context.session.role !== 'employee') throw redirect({ to: '/accueil' })
  },
  component: MyPinPage,
})

function MyPinPage() {
  const save = $api.useMutation('put', '/api/v2/auth/me/pin')

  return (
    <div className="grid max-w-md gap-6">
      <div className="grid gap-1">
        <Link to="/accueil" className="text-sm text-primary underline underline-offset-4">
          Accueil
        </Link>
        <h1 className="text-2xl font-semibold">Mon PIN de tablette</h1>
      </div>
      <p className="text-muted-foreground">
        Sur la tablette de la crèche, vous choisissez votre nom puis tapez ce PIN pour pointer. Ne le communiquez à
        personne. Un nouveau PIN débloque aussi un PIN bloqué après trois erreurs.
      </p>
      {save.isSuccess && (
        <Alert>
          <CircleCheck aria-hidden="true" />
          <AlertDescription>PIN enregistré : utilisez-le dès maintenant sur la tablette.</AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>{save.isSuccess ? 'Changer à nouveau' : 'Choisir ou changer mon PIN'}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PinForm
            // Formulaire vidé après l'enregistrement : le PIN ne reste pas affiché.
            key={save.isSuccess ? save.submittedAt : 0}
            onSubmit={({ pin, password }) => save.mutate({ body: { pin, password } })}
            pending={save.isPending}
            error={save.isError ? errorMessage(save.error) : null}
          />
        </CardContent>
      </Card>
    </div>
  )
}
