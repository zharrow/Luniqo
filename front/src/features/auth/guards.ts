import type { QueryClient } from '@tanstack/react-query'
import { redirect } from '@tanstack/react-router'

import type { Session } from '@/api/types'

import { type AuthStep, nextStep, stepHref } from './next-step'
import { loadSession } from './session'

/**
 * Garde de route : la session doit exister et en être à l'étape `step`, sinon
 * elle est renvoyée là où elle doit aller. N'empêche que l'affichage : chaque
 * appel reste vérifié par l'API.
 */
export async function requireStep(
  queryClient: QueryClient,
  step: AuthStep,
  target: string | undefined,
): Promise<Session> {
  const session = await loadSession(queryClient)
  if (session === null) throw redirect({ to: '/connexion', search: { redirect: target } })
  if (nextStep(session.mfa) !== step) throw redirect({ href: stepHref(session.mfa, target) })
  return session
}
