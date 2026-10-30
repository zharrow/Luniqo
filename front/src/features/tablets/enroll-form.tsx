import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Field } from '@/components/field'
import { FormError } from '@/components/form-error'
import { Button } from '@/components/ui/button'

// Mêmes bornes que l'API (TabletCreate) ; l'API reste la référence.
const schema = z.object({
  label: z.string().trim().min(1, 'Donnez un nom à la tablette.').max(100, 'Nom trop long (100 caractères au plus).'),
})

export type EnrollValues = z.infer<typeof schema>

type EnrollFormProps = {
  onSubmit: (values: EnrollValues) => void
  pending?: boolean
  error?: string | null
}

/**
 * Enrôle l'appareil sur lequel la page est ouverte : l'API pose le cookie
 * d'appareil sur ce navigateur. D'où l'avertissement, avant le bouton.
 */
export function EnrollForm({ onSubmit, pending = false, error = null }: EnrollFormProps) {
  const form = useForm<EnrollValues>({ resolver: zodResolver(schema), defaultValues: { label: '' } })
  const { errors } = form.formState

  return (
    <form className="grid gap-4" noValidate onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}>
      <p className="text-sm text-muted-foreground">
        Ouvrez cette page <strong className="text-foreground">sur la tablette elle-même</strong>, enrôlez-la, puis
        déconnectez-vous : elle reste reconnue 90 jours et les employés s&apos;y identifient avec leur PIN.
      </p>
      <FormError message={error} />
      <Field
        label="Nom de la tablette"
        placeholder="Tablette de l'entrée"
        autoComplete="off"
        error={errors.label?.message}
        {...form.register('label')}
      />
      <Button type="submit" size="lg" className="h-11 justify-self-start" disabled={pending}>
        {pending ? 'Enrôlement…' : 'Enrôler cet appareil'}
      </Button>
    </form>
  )
}
