import type { MfaState } from '@/api/types'
import { safeRedirect } from '@/lib/safe-redirect'

/** Écran où mène une session selon l'état de son second facteur (ADR-004). */
export type AuthStep = '/connexion/second-facteur' | '/connexion/activation' | 'app'

export function nextStep(mfa: MfaState): AuthStep {
  switch (mfa) {
    case 'required':
      return '/connexion/second-facteur'
    case 'setup_required':
      return '/connexion/activation'
    case 'not_required':
    case 'verified':
      return 'app'
  }
}

/**
 * Adresse où envoyer la session : l'étape du second facteur qui lui manque
 * (en gardant l'adresse de retour), sinon l'adresse de retour elle-même.
 */
export function stepHref(mfa: MfaState, redirect: string | undefined): string {
  const step = nextStep(mfa)
  if (step === 'app') return safeRedirect(redirect)
  if (redirect === undefined) return step
  return `${step}?${new URLSearchParams({ redirect })}`
}
