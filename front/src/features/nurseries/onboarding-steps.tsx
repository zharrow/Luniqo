import { CircleCheck, CircleDashed } from 'lucide-react'
import type { ReactNode } from 'react'

import type { Schemas } from '@/api/types'
import { ActionError } from '@/components/action-error'
import { formatDate } from '@/lib/dates'
import { cn } from '@/lib/utils'

type Milestone = Schemas['Milestone']

type OnboardingStepsProps = {
  onboarding: Schemas['NurseryOnboarding'] | undefined
  pending: boolean
  error: unknown
  /** Nouvel essai de la lecture, proposé sur une panne du serveur ou du réseau. */
  onRetry?: (() => void) | undefined
  /** Lien vers l'écran qui permet d'obtenir un succès manquant, fourni par la route. */
  howTo?: Partial<Record<Milestone, ReactNode>> | undefined
}

/** Textes de chaque succès, dans l'ordre renvoyé par l'API (LUN-128). */
const STEPS: Record<Milestone, { title: string; done: string; todo: string }> = {
  staff: {
    title: 'Personnel',
    done: 'Un employé a accès à cette crèche.',
    // Pas encore de lien : l'écran Personnel (LUN-64) n'existe pas.
    todo: 'Donnez à un employé l’accès à cette crèche.',
  },
  tablet: {
    title: 'Tablette',
    done: 'Une tablette est enrôlée pour le pointage.',
    todo: 'Enrôlez une tablette pour que l’équipe pointe les enfants.',
  },
  first_attendance: {
    title: 'Premier pointage',
    done: 'Un premier enfant a été pointé.',
    todo: 'Pointez l’arrivée d’un enfant depuis la tablette.',
  },
}

/** Succès de mise en route d'une crèche, avec ses états de chargement et d'erreur (CLAUDE.md, règle 5). */
export function OnboardingSteps({ onboarding, pending, error, onRetry, howTo }: OnboardingStepsProps) {
  if (pending) {
    return (
      <p role="status" className="text-muted-foreground">
        Chargement de la mise en route…
      </p>
    )
  }
  if (error !== null && error !== undefined) {
    return (
      <div className="grid gap-2">
        <p className="font-medium">Impossible de charger la mise en route.</p>
        <ActionError error={error} onRetry={onRetry} />
      </div>
    )
  }
  if (onboarding === undefined) return null

  const achieved = onboarding.steps.filter((step) => step.achieved).length
  const total = onboarding.steps.length

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <p className="text-lg font-medium" id="progression">
          {achieved === total ? 'Mise en route terminée : ' : ''}
          {achieved} succès sur {total}
        </p>
        <progress
          aria-labelledby="progression"
          value={achieved}
          max={total}
          className="h-2 w-full overflow-hidden rounded-full bg-muted [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary"
        />
      </div>
      <ol className="grid gap-3">
        {onboarding.steps.map((step) => {
          const text = STEPS[step.milestone]
          const link = howTo?.[step.milestone]
          return (
            <li
              key={step.milestone}
              aria-label={`${text.title} : ${step.achieved ? 'obtenu' : 'à obtenir'}`}
              className={cn(
                'grid min-w-0 grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-lg border p-4',
                step.achieved ? 'border-primary/40 bg-primary/5' : 'border-dashed',
              )}
            >
              {step.achieved ? (
                <CircleCheck aria-hidden="true" className="mt-0.5 size-5 text-primary" />
              ) : (
                <CircleDashed aria-hidden="true" className="mt-0.5 size-5 text-muted-foreground" />
              )}
              <div className="grid min-w-0 gap-1">
                <h3 className="font-medium break-words">{text.title}</h3>
                {step.achieved ? (
                  <>
                    <p className="break-words">{text.done}</p>
                    {step.achieved_at !== null && (
                      <p className="text-sm text-muted-foreground">Obtenu le {formatDate(step.achieved_at)}</p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="break-words">{text.todo}</p>
                    {link}
                  </>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
