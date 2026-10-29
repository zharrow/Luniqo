import { setupWorker } from 'msw/browser'
import { test as base } from 'vitest'

/**
 * API simulée pour les tests de composants (mode navigateur de Vitest) :
 * chaque test déclare les réponses dont il a besoin avec `worker.use(...)`.
 * Une requête sans réponse prévue fait échouer le test.
 */
export const worker = setupWorker()
let started: Promise<unknown> | null = null

export const test = base.extend<{ worker: typeof worker }>({
  worker: [
    // eslint-disable-next-line no-empty-pattern -- Vitest exige un motif de déstructuration ici.
    async ({}, use) => {
      // MSW 3 refuse un second start() : démarré une fois, réinitialisé après chaque test.
      started ??= worker.start({ quiet: true, onUnhandledFrame: 'error' })
      await started
      await use(worker)
      worker.resetHandlers()
    },
    { auto: true },
  ],
})
