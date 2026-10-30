import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Field } from '@/components/field'
import { FormError } from '@/components/form-error'
import { Button } from '@/components/ui/button'

// Confort de saisie seulement : l'API refuse aussi les PIN trop prévisibles (ADR-002 § 6).
const schema = z
  .object({
    pin: z.string().regex(/^\d{4}$/, 'Le PIN doit contenir exactement 4 chiffres.'),
    confirmation: z.string(),
    password: z.string().min(1, 'Saisissez votre mot de passe actuel.'),
  })
  .refine((values) => values.pin === values.confirmation, {
    message: 'Les deux PIN ne correspondent pas.',
    path: ['confirmation'],
  })

export type PinValues = z.infer<typeof schema>

type PinFormProps = {
  onSubmit: (values: PinValues) => void
  pending?: boolean
  error?: string | null
}

/** Choix ou changement du PIN de tablette, confirmé par le mot de passe du compte. */
export function PinForm({ onSubmit, pending = false, error = null }: PinFormProps) {
  const form = useForm<PinValues>({
    resolver: zodResolver(schema),
    defaultValues: { pin: '', confirmation: '', password: '' },
  })
  const { errors } = form.formState
  const digits = { type: 'password', inputMode: 'numeric', maxLength: 4, autoComplete: 'off' } as const

  return (
    <form className="grid gap-4" noValidate onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}>
      <FormError message={error} />
      <Field label="Nouveau PIN (4 chiffres)" {...digits} error={errors.pin?.message} {...form.register('pin')} />
      <Field
        label="Nouveau PIN, une seconde fois"
        {...digits}
        error={errors.confirmation?.message}
        {...form.register('confirmation')}
      />
      <Field
        label="Mot de passe actuel"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...form.register('password')}
      />
      <Button type="submit" size="lg" className="h-11 justify-self-start" disabled={pending}>
        {pending ? 'Enregistrement…' : 'Enregistrer mon PIN'}
      </Button>
    </form>
  )
}
