import { createFileRoute, redirect } from '@tanstack/react-router'
import { CircleCheck } from 'lucide-react'

import { $api } from '@/api/client'
import { fieldErrorsOf } from '@/api/errors'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PinForm } from '@/features/pin/pin-form'
import { RouterLink } from '@/features/shell/app-shell'
import { PageHeader } from '@/features/shell/page-header'

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
      <PageHeader title="Mon compte" breadcrumb={['Mon compte']} link={RouterLink} />
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
            error={save.error}
            fieldErrors={fieldErrorsOf(save.error)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
