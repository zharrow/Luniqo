import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { fieldErrorsOf } from '@/api/errors'
import type { Schemas } from '@/api/types'
import { ActionError } from '@/components/action-error'
import { TextareaField } from '@/components/field'
import { Button } from '@/components/ui/button'
import { formatTime } from '@/lib/dates'
import { type FieldMap, useServerFieldErrors } from '@/lib/server-field-errors'

type Note = Schemas['NoteOut']

export const NOTE_MAX_LENGTH = 500
/** Même rappel que l'API : les données de santé relèvent de LUN-57. */
export const NO_HEALTH_DATA = 'Pas d’information médicale (allergies, traitements).'

// Mêmes règles que l'API ; elle reste juge (422 affichée sous le champ).
const noteSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, 'La transmission ne peut pas être vide')
    .max(NOTE_MAX_LENGTH, `Au plus ${NOTE_MAX_LENGTH} caractères`),
})
type NoteValues = z.infer<typeof noteSchema>
const FIELDS: FieldMap<NoteValues> = { text: 'text' }

type ChildNotesProps = {
  childName: string
  /** Transmissions de l'enfant ce jour-là, les plus récentes d'abord (ordre de l'API). */
  notes: Note[]
  onSubmit: (text: string) => void
  pending?: boolean
  /** Erreur de l'envoi : affichée sous le formulaire, la saisie est gardée. */
  error?: unknown
  /** Renvoi de la même transmission, à la demande seulement (jamais automatique). */
  onRetry?: (() => void) | undefined
}

/** Transmissions du jour d'un enfant, puis le formulaire pour en ajouter une. */
export function ChildNotes({ childName, notes, onSubmit, pending = false, error = null, onRetry }: ChildNotesProps) {
  const form = useForm<NoteValues>({ resolver: zodResolver(noteSchema), defaultValues: { text: '' } })
  useServerFieldErrors(form, fieldErrorsOf(error), FIELDS)
  const { errors } = form.formState

  return (
    <section aria-label={`Transmissions de ${childName}`} className="grid min-w-0 gap-3 rounded-lg border bg-card p-4">
      <h3 className="font-medium break-words">{childName}</h3>
      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune transmission aujourd’hui.</p>
      ) : (
        <ol className="grid gap-2">
          {notes.map((note) => (
            <li key={note.id} className="grid min-w-0 gap-0.5 border-l-2 border-primary/40 pl-3">
              <p className="text-sm text-muted-foreground">
                {formatTime(note.created_at)} · {note.author}
              </p>
              <p className="break-words whitespace-pre-line">{note.text}</p>
            </li>
          ))}
        </ol>
      )}
      <form
        className="grid gap-3"
        noValidate
        onSubmit={(event) => void form.handleSubmit((values) => onSubmit(values.text))(event)}
      >
        <TextareaField
          label={`Nouvelle transmission pour ${childName}`}
          hint={`${NO_HEALTH_DATA} ${NOTE_MAX_LENGTH} caractères au plus.`}
          maxLength={NOTE_MAX_LENGTH}
          error={errors.text?.message}
          {...form.register('text')}
        />
        <ActionError error={error} onRetry={onRetry} />
        <Button type="submit" className="h-11 justify-self-start" disabled={pending}>
          {pending ? 'Envoi…' : 'Ajouter la transmission'}
        </Button>
      </form>
    </section>
  )
}
