import { useId, useState } from 'react'

import type { Schemas } from '@/api/types'
import { FormError } from '@/components/form-error'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Child = Schemas['TabletChild']
type Guardian = Schemas['TabletGuardian']

type PresenceFormProps = {
  child: Child
  /** Arrivée : responsable qui dépose l'enfant, facultatif. Départ : responsable autorisé, obligatoire. */
  onSubmit: (guardianId: string | null) => void
  onCancel: () => void
  pending?: boolean
  error?: string | null
}

const NOT_SPECIFIED = 'non-precise'

/**
 * Pointage d'un enfant : départ s'il est présent, arrivée sinon. L'heure est
 * celle du serveur ; l'autorisation de venir chercher l'enfant est vérifiée
 * par l'API, l'écran ne fait que l'annoncer.
 */
export function PresenceForm({ child, onSubmit, onCancel, pending = false, error = null }: PresenceFormProps) {
  const departure = child.presence === 'present'
  const [choice, setChoice] = useState<string | null>(departure ? null : NOT_SPECIFIED)
  const name = `${child.first_name} ${child.last_name}`

  return (
    <form
      className="mx-auto grid w-full max-w-xl gap-5"
      onSubmit={(event) => {
        event.preventDefault()
        if (choice !== null) onSubmit(choice === NOT_SPECIFIED ? null : choice)
      }}
    >
      <h3 className="text-2xl font-semibold">
        {departure ? 'Départ' : 'Arrivée'} de {name}
      </h3>
      <fieldset className="grid gap-3">
        <legend className="mb-2 text-lg">
          {departure ? "Qui vient chercher l'enfant ?" : "Qui amène l'enfant ? (facultatif)"}
        </legend>
        {child.guardians.map((guardian) => (
          <Choice
            key={guardian.id}
            value={guardian.id}
            label={guardian.display_name}
            hint={
              departure && !guardian.is_authorized_pickup
                ? 'Non autorisé·e : prévenir la direction'
                : relation(guardian)
            }
            disabled={pending || (departure && !guardian.is_authorized_pickup)}
            checked={choice === guardian.id}
            onChange={setChoice}
          />
        ))}
        {!departure && (
          <Choice
            value={NOT_SPECIFIED}
            label="Ne pas préciser"
            disabled={pending}
            checked={choice === NOT_SPECIFIED}
            onChange={setChoice}
          />
        )}
        {departure && child.guardians.length === 0 && (
          <p className="text-muted-foreground">Aucun responsable enregistré : prévenir la direction.</p>
        )}
      </fieldset>
      <FormError message={error} />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="lg" className="h-16 flex-1 text-xl" disabled={pending || choice === null}>
          {pending ? 'Envoi…' : departure ? 'Pointer le départ' : "Pointer l'arrivée"}
        </Button>
        <Button type="button" variant="outline" size="lg" className="h-16 text-xl" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </form>
  )
}

type ChoiceProps = {
  value: string
  label: string
  hint?: string
  disabled: boolean
  checked: boolean
  onChange: (value: string) => void
}

/** Bouton radio à grande zone tactile : toute la ligne se touche. */
function Choice({ value, label, hint, disabled, checked, onChange }: ChoiceProps) {
  const id = useId()
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex min-h-16 cursor-pointer items-center gap-4 rounded-lg border bg-card px-5 py-3 text-xl',
        'has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50',
        checked && 'border-primary bg-accent',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <input
        id={id}
        type="radio"
        name="responsable"
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange(value)}
        className="size-6 accent-primary"
      />
      <span className="grid">
        {label}
        {hint !== undefined && <span className="text-sm text-muted-foreground">{hint}</span>}
      </span>
    </label>
  )
}

const RELATIONS: Record<Guardian['relationship'], string> = {
  parent: 'Parent',
  legal_guardian: 'Tuteur ou tutrice',
  other: 'Proche',
}

function relation(guardian: Guardian): string {
  return RELATIONS[guardian.relationship]
}
