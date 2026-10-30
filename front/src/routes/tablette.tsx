import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { CircleCheck } from 'lucide-react'
import { useEffect, useState } from 'react'

import { $api } from '@/api/client'
import { ApiError, errorMessage } from '@/api/errors'
import type { Schemas } from '@/api/types'
import { FormError } from '@/components/form-error'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ActorPanel } from '@/features/tablet-mode/actor-panel'
import { ChildrenBoard } from '@/features/tablet-mode/children-board'
import { PinPad } from '@/features/tablet-mode/pin-pad'
import { PresenceForm } from '@/features/tablet-mode/presence-form'
import { actorQuery } from '@/features/tablet-mode/queries'
import { StaffPicker } from '@/features/tablet-mode/staff-picker'
import { formatTime } from '@/lib/dates'

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
        <ActorWorkspace
          actor={actor.data}
          onEnd={() => end.mutate({})}
          ending={end.isPending}
          onSessionLost={() => {
            setNotice('Session terminée : saisissez à nouveau votre PIN.')
            queryClient.setQueryData(actorQuery.queryKey, null)
          }}
        />
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

type ActorWorkspaceProps = {
  actor: Schemas['TabletActorOut']
  onEnd: () => void
  ending: boolean
  /** La session d'action a expiré côté API (401) : retour au choix de l'employé. */
  onSessionLost: () => void
}

/**
 * Espace de l'employé identifié : pointage des enfants. Démonté à la fin de la
 * session, il n'emporte rien d'un employé au suivant (enfant choisi, message).
 */
function ActorWorkspace({ actor, onEnd, ending, onSessionLost }: ActorWorkspaceProps) {
  const expected = $api.useQuery('get', '/api/v2/tablet/children')
  const [child, setChild] = useState<Schemas['TabletChild'] | null>(null)
  const [done, setDone] = useState<string | null>(null)

  function pointed(message: string) {
    setDone(message)
    setChild(null)
    void expected.refetch()
  }
  function failed(error: unknown) {
    if (error instanceof ApiError && error.status === 401) onSessionLost()
  }
  const arrival = $api.useMutation('post', '/api/v2/tablet/children/{child_id}/arrival', {
    onSuccess: (presence) => pointed(`Arrivée de ${presence.child_name} pointée à ${formatTime(presence.arrived_at)}.`),
    onError: failed,
  })
  const departure = $api.useMutation('post', '/api/v2/tablet/children/{child_id}/departure', {
    onSuccess: (presence) =>
      pointed(`Départ de ${presence.child_name} pointé à ${formatTime(presence.departed_at ?? presence.arrived_at)}.`),
    onError: failed,
  })
  const sending = arrival.isPending || departure.isPending
  const refusal = arrival.error ?? departure.error

  function select(next: Schemas['TabletChild']) {
    arrival.reset()
    departure.reset()
    setDone(null)
    setChild(next)
  }

  function submit(selected: Schemas['TabletChild'], guardianId: string | null) {
    const params = { path: { child_id: selected.id } }
    if (selected.presence === 'present') {
      if (guardianId !== null) departure.mutate({ params, body: { picked_up_by: guardianId } })
    } else {
      arrival.mutate({ params, body: { dropped_off_by: guardianId } })
    }
  }

  return (
    <div className="grid gap-6">
      <ActorPanel actor={actor} onEnd={onEnd} ending={ending} />
      {done !== null && (
        <Alert>
          <CircleCheck aria-hidden="true" />
          <AlertDescription className="text-lg">{done}</AlertDescription>
        </Alert>
      )}
      {child !== null ? (
        <PresenceForm
          child={child}
          onSubmit={(guardianId) => submit(child, guardianId)}
          onCancel={() => setChild(null)}
          pending={sending}
          error={refusal === null ? null : errorMessage(refusal)}
        />
      ) : expected.isPending ? (
        <p>Chargement des enfants…</p>
      ) : expected.isError ? (
        <FormError message={errorMessage(expected.error)} />
      ) : (
        <ChildrenBoard expected={expected.data} onSelect={select} />
      )}
    </div>
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
