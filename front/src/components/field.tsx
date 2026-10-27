import { useId } from 'react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type FieldProps = Omit<React.ComponentProps<typeof Input>, 'id'> & {
  label: string
  error?: string | undefined
}

/** Champ de formulaire : libellé relié, erreur annoncée et reliée au champ. */
export function Field({ label, error, ...input }: FieldProps) {
  const id = useId()
  const errorId = `${id}-erreur`
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        aria-invalid={error !== undefined}
        aria-describedby={error === undefined ? undefined : errorId}
        className="h-11"
        {...input}
      />
      {error !== undefined && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
