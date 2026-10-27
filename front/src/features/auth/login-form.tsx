import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Field } from '@/components/field'
import { FormError } from '@/components/form-error'
import { Button } from '@/components/ui/button'

// Confort de saisie seulement : l'API reste la référence (ADR-002 § 6).
const schema = z.object({
  email: z.string().trim().min(1, 'Saisissez votre adresse e-mail.').includes('@', {
    message: 'Adresse e-mail invalide.',
  }),
  password: z.string().min(1, 'Saisissez votre mot de passe.'),
})

export type LoginValues = z.infer<typeof schema>

type LoginFormProps = {
  onSubmit: (values: LoginValues) => void
  pending?: boolean
  error?: string | null
}

export function LoginForm({ onSubmit, pending = false, error = null }: LoginFormProps) {
  const form = useForm<LoginValues>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } })
  const { errors } = form.formState

  return (
    <form className="grid gap-4" noValidate onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}>
      <FormError message={error} />
      <Field
        label="Adresse e-mail"
        type="email"
        autoComplete="username"
        error={errors.email?.message}
        {...form.register('email')}
      />
      <Field
        label="Mot de passe"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...form.register('password')}
      />
      <Button type="submit" size="lg" className="h-11" disabled={pending}>
        {pending ? 'Connexion…' : 'Se connecter'}
      </Button>
    </form>
  )
}
