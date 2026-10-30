import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { $api } from '@/api/client'
import { ApiError, errorMessage } from '@/api/errors'
import type { Schemas } from '@/api/types'
import { FormError } from '@/components/form-error'
import { Button } from '@/components/ui/button'
import { ActorPanel } from '@/features/tablet-mode/actor-panel'
import { PinPad } from '@/features/tablet-mode/pin-pad'
import { actorQuery } from '@/features/tablet-mode/queries'
import { StaffPicker } from '@/features/tablet-mode/staff-picker'

/**
 * Mode tablette : hors de l'espace connecté. La tablette est reconnue par son
 * cookie d'appareil (enrôlement par la direction), l'employé par son PIN.
 */
export const Route = createFileRoute('/tablette')({
  component: TabletPage,
})

// Refus qui renvoient à la liste : l'état de l'employé a changé (PIN bloqué, ou plus de PIN).
const BACK_TO_LIST = new Set([409, 423])

function TabletPage() {
  const queryClient = useQueryClient()
  const info = $api.useQuery('get', '/api/v2/tablet')
  const actor = useQuery(actorQuery)
  const [member, setMember] = useState<Schemas['TabletStaffMember'] | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const open = $api.useMutation('post', '/api/v2/tablet/session', {
    onSuccess: (data) => {
      queryClient.setQueryData(actorQuery.queryKey, data)
      setMember(null)
    },
    onError: (error) => {
      if (error instanceof ApiError && BACK_TO_LIST.has(error.status)) {
        setNotice(error.message)
        setMember(null)
        void info.refetch()
      }
    },
  })
  const end = $api.useMutation('delete', '/api/v2/tablet/session', {
    onSettled: () => queryClient.setQueryData(actorQuery.queryKey, null),
  })

  // Fin de la session d'action (2 minutes) : retour à la liste sans geste de l'employé.
  const expiresAt = actor.data?.expires_at
  useEffect(() => {
    if (expiresAt === undefined) return
    const timer = setTimeout(
      () => void queryClient.invalidateQueries({ queryKey: actorQuery.queryKey }),
      Math.max(0, new Date(expiresAt).getTime() - Date.now()),
    )
    return () => clearTimeout(timer)
  }, [expiresAt, queryClient])

  function select(next: Schemas['TabletStaffMember']) {
    open.reset()
    setNotice(null)
    setMember(next)
  }

  if (info.isPending || actor.isPending) return <Screen>Chargement…</Screen>
  if (info.error instanceof ApiError && info.error.status === 401) return <NotEnrolled />
  if (info.isError) {
    return (
      <Screen>
        <FormError message={errorMessage(info.error)} />
        <Button size="lg" className="h-14 justify-self-center" onClick={() => void info.refetch()}>
          Réessayer
        </Button>
      </Screen>
    )
  }

  return (
    <Screen title={info.data.nursery_name} subtitle={info.data.label}>
      {actor.data ? (
        <ActorPanel actor={actor.data} onEnd={() => end.mutate({})} ending={end.isPending} />
      ) : member === null ? (
        <section aria-labelledby="qui" className="grid gap-5">
          <h2 id="qui" className="text-2xl font-semibold">
            Qui êtes-vous ?
          </h2>
          <FormError message={notice} />
          <StaffPicker staff={info.data.staff} onSelect={select} />
        </section>
      ) : (
        <PinPad
          // Nouveau pavé à chaque envoi : la saisie refusée est effacée.
          key={open.submittedAt}
          name={member.display_name}
          onSubmit={(pin) => open.mutate({ body: { user_id: member.id, pin } })}
          onCancel={() => setMember(null)}
          pending={open.isPending}
          error={open.isError ? errorMessage(open.error) : null}
        />
      )}
    </Screen>
  )
}

function Screen({ title, subtitle, children }: { title?: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-svh">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b bg-card px-6 py-4">
        <p className="text-lg font-semibold text-primary">Luniqo</p>
        {title !== undefined && (
          <h1 className="text-xl font-semibold">
            {title}
            {subtitle !== undefined && <span className="ml-2 text-base text-muted-foreground">· {subtitle}</span>}
          </h1>
        )}
      </header>
      <main className="mx-auto grid max-w-4xl gap-6 p-6 text-lg">{children}</main>
    </div>
  )
}

function NotEnrolled() {
  return (
    <Screen>
      <h1 className="text-2xl font-semibold">Tablette non enrôlée</h1>
      <p>
        Cet appareil n&apos;est pas reconnu comme une tablette de crèche, ou son enrôlement a expiré ou a été révoqué.
        La direction l&apos;enrôle en se connectant sur l&apos;appareil : Accueil, puis « Tablettes » de la crèche.
      </p>
      <Link to="/connexion" className="text-primary underline underline-offset-4">
        Se connecter (direction)
      </Link>
    </Screen>
  )
}
