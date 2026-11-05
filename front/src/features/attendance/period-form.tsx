import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Field } from '@/components/field'
import { Button } from '@/components/ui/button'

import { lastDays, type Period, periodError, previousMonth, thisMonth } from './period'

const DAY = /^\d{4}-\d{2}-\d{2}$/

const schema = z
  .object({
    from: z.string().regex(DAY, 'Choisissez le premier jour.'),
    to: z.string().regex(DAY, 'Choisissez le dernier jour.'),
  })
  .superRefine((values, context) => {
    const message = periodError(values)
    if (message !== null) context.addIssue({ code: 'custom', message, path: ['to'] })
  })

type PeriodFormProps = {
  /** Période affichée, valeurs de départ du formulaire (le remonter avec `key` quand elle change). */
  period: Period
  /** Jour qu'il est à Paris, pour les raccourcis. */
  today: string
  onChange: (period: Period) => void
}

/**
 * Choix de la période : deux dates, ou un raccourci (7 derniers jours, mois en
 * cours, mois précédent pour la facturation). L'API vérifie aussi la période.
 */
export function PeriodForm({ period, today, onChange }: PeriodFormProps) {
  const form = useForm<Period>({ resolver: zodResolver(schema), defaultValues: period })
  const { errors } = form.formState
  const shortcuts = [
    { label: '7 derniers jours', period: lastDays(today) },
    { label: 'Ce mois-ci', period: thisMonth(today) },
    { label: 'Mois précédent', period: previousMonth(today) },
  ]

  return (
    <form
      aria-label="Période"
      className="grid gap-4"
      noValidate
      onSubmit={(event) => void form.handleSubmit(onChange)(event)}
    >
      <div className="flex flex-wrap items-end gap-4">
        <Field label="Du" type="date" error={errors.from?.message} {...form.register('from')} />
        <Field label="Au" type="date" error={errors.to?.message} {...form.register('to')} />
        <Button type="submit" className="h-11">
          Afficher
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {shortcuts.map((shortcut) => (
          <Button
            key={shortcut.label}
            type="button"
            variant="outline"
            className="h-11"
            aria-pressed={shortcut.period.from === period.from && shortcut.period.to === period.to}
            onClick={() => onChange(shortcut.period)}
          >
            {shortcut.label}
          </Button>
        ))}
      </div>
    </form>
  )
}
