import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { $api } from '@/api/client'
import type { Schemas } from '@/api/types'
import { ActionError } from '@/components/action-error'

import { ChildNotes } from './child-notes'

const NOTES = '/api/v2/nurseries/{nursery_id}/notes'
// Relues comme le tableau du jour : les transmissions des collègues arrivent sans geste.
const REFRESH_MS = 30_000

type Note = Schemas['NoteOut']
type Child = { id: string; name: string }

/**
 * Enfants dont on parle aujourd'hui : ceux du tableau du jour, dans son ordre, puis ceux
 * qui n'ont plus de présence mais une transmission (présence retirée par la direction).
 */
export function childrenOfDay(presences: Schemas['AttendanceOut'][], notes: Note[]): Child[] {
  const children = new Map<string, string>()
  for (const presence of presences) children.set(presence.child_id, presence.child_name)
  for (const note of notes) if (!children.has(note.child_id)) children.set(note.child_id, note.child_name)
  return [...children].map(([id, name]) => ({ id, name }))
}

type DayNotesProps = { nurseryId: string; presences: Schemas['AttendanceOut'][] }

/** Transmissions du jour (LUN-146), sous chaque enfant de « Présences du jour ». Direction et employés. */
export function DayNotes({ nurseryId, presences }: DayNotesProps) {
  const notes = $api.useQuery(
    'get',
    NOTES,
    { params: { path: { nursery_id: nurseryId } } },
    {
      refetchInterval: REFRESH_MS,
    },
  )

  if (notes.isPending) return <p className="text-muted-foreground">Chargement des transmissions…</p>
  if (notes.isError) return <ActionError error={notes.error} onRetry={() => void notes.refetch()} />
  const children = childrenOfDay(presences, notes.data)
  if (children.length === 0) {
    return <p className="text-muted-foreground">Les transmissions s’ajoutent sur les enfants arrivés aujourd’hui.</p>
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {children.map((child) => (
        <AddNote
          key={child.id}
          nurseryId={nurseryId}
          child={child}
          notes={notes.data.filter((note) => note.child_id === child.id)}
        />
      ))}
    </div>
  )
}

function AddNote({ nurseryId, child, notes }: { nurseryId: string; child: Child; notes: Note[] }) {
  const queryClient = useQueryClient()
  // Formulaire vidé après un envoi réussi (remonté) ; gardé tel quel après un échec.
  const [sent, setSent] = useState(0)
  const add = $api.useMutation('post', '/api/v2/nurseries/{nursery_id}/children/{child_id}/notes', {
    onSuccess: async () => {
      setSent((count) => count + 1)
      await queryClient.invalidateQueries({ queryKey: ['get', NOTES] })
    },
  })
  const send = (text: string) =>
    add.mutate({ params: { path: { nursery_id: nurseryId, child_id: child.id } }, body: { text } })

  return (
    <ChildNotes
      key={sent}
      childName={child.name}
      notes={notes}
      onSubmit={send}
      pending={add.isPending}
      error={add.error}
      onRetry={add.variables === undefined ? undefined : () => add.mutate(add.variables)}
    />
  )
}
