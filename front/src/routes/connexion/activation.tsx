import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { $api } from '@/api/client'
import { errorMessage } from '@/api/errors'
import { FormError } from '@/components/form-error'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BackupCodes } from '@/features/auth/backup-codes'
import { CodeForm } from '@/features/auth/code-form'
import { requireStep } from '@/features/auth/guards'
import { stepHref } from '@/features/auth/next-step'
import { redirectSearch, sessionQuery } from '@/features/auth/session'
import { TotpSecret } from '@/features/auth/totp-secret'

export const Route = createFileRoute('/connexion/activation')({
  validateSearch: redirectSearch,
  beforeLoad: ({ context, search }) => requireStep(context.queryClient, '/connexion/activation', search.redirect),
  component: ActivationPage,
})

/**
 * Première connexion de la direction : enregistrer une application
 * d'authentification (ADR-004), en trois temps : clé, premier code, codes de secours.
 */
function ActivationPage() {
  const { redirect: target } = Route.useSearch()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null)

  const start = $api.useMutation('post', '/api/v2/auth/mfa/totp')
  const confirm = $api.useMutation('post', '/api/v2/auth/mfa/totp/confirm', {
    onSuccess: async ({ backup_codes }) => {
      if (backup_codes === null) await finish()
      else setBackupCodes(backup_codes)
    },
  })

  async function finish() {
    const session = await queryClient.query({ ...sessionQuery, staleTime: 0 })
    await navigate({ href: stepHref(session.mfa, target) })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1>Sécuriser votre compte</h1>
        </CardTitle>
        <CardDescription>
          Votre rôle exige un second facteur : un code à 6 chiffres donné par une application d&apos;authentification
          (Google Authenticator, Microsoft Authenticator, 2FAS…).
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        {backupCodes !== null ? (
          <BackupCodes codes={backupCodes} onDone={() => void finish()} />
        ) : start.data === undefined ? (
          <div className="grid gap-4">
            <FormError message={start.isError ? errorMessage(start.error) : null} />
            <Button size="lg" className="h-11" onClick={() => start.mutate({})} disabled={start.isPending}>
              {start.isPending ? 'Préparation…' : 'Commencer'}
            </Button>
          </div>
        ) : (
          <>
            <TotpSecret secret={start.data.secret} uri={start.data.otpauth_uri} />
            <CodeForm
              label="Code affiché par l'application"
              submitLabel="Activer"
              onSubmit={(body) => confirm.mutate({ body })}
              pending={confirm.isPending}
              error={confirm.isError ? errorMessage(confirm.error) : null}
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}
