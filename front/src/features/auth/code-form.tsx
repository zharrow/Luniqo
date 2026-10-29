import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Field } from '@/components/field'
import { FormError } from '@/components/form-error'
import { Button } from '@/components/ui/button'

const schema = z.object({
  code: z.string().trim().min(1, 'Saisissez le code.').max(32, 'Code trop long.'),
})

export type CodeValues = z.infer<typeof schema>

type CodeFormProps = {
  onSubmit: (values: CodeValues) => void
  label?: string
  submitLabel?: string
  pending?: boolean
  error?: string | null
}

/** Code de l'application d'authentification (6 chiffres) ou code de secours. */
export function CodeForm({
  onSubmit,
  label = 'Code à 6 chiffres ou code de secours',
  submitLabel = 'Valider',
  pending = false,
  error = null,
}: CodeFormProps) {
  const form = useForm<CodeValues>({ resolver: zodResolver(schema), defaultValues: { code: '' } })

  return (
    <form className="grid gap-4" noValidate onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}>
      <FormError message={error} />
      <Field
        label={label}
        autoComplete="one-time-code"
        spellCheck={false}
        error={form.formState.errors.code?.message}
        {...form.register('code')}
      />
      <Button type="submit" size="lg" className="h-11" disabled={pending}>
        {pending ? 'Vérification…' : submitLabel}
      </Button>
    </form>
  )
}
