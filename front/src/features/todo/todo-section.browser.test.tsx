import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'
import { render } from 'vitest-browser-react'

import { employee, TODO_NOW, toDoItems } from '../../../test/fixtures'
import { apiErrors, reply } from '../../../test/handlers/errors'
import { test } from '../../../test/msw'
import { ToDoSection } from './todo-section'

const TO_DO = '/api/v2/to-do'
const UNLOCK = `/api/v2/staff/${employee.id}/pin/unlock`
const three = toDoItems.slice(0, 3)

function list(items: typeof toDoItems) {
  return HttpResponse.json({ items, total: items.length })
}

function start() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ToDoSection now={TODO_NOW} />
    </QueryClientProvider>,
  )
}

describe('section « À traiter »', () => {
  test('débloquer un PIN sur place, puis la liste est relue sans la ligne', async ({ worker }) => {
    let reads = 0
    let unlocked = 0
    worker.use(
      http.get(TO_DO, () => {
        reads += 1
        return list(unlocked > 0 ? three.slice(1) : three)
      }),
      http.post(UNLOCK, () => {
        unlocked += 1
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const screen = await start()
    await screen.getByRole('button', { name: 'Débloquer le PIN de Lucas Bernard' }).click()
    await expect.element(screen.getByText('PIN bloqué')).not.toBeInTheDocument()
    await expect.element(screen.getByText('Départ non pointé hier')).toBeVisible()
    expect(unlocked).toBe(1)
    expect(reads).toBe(2)
  })

  test('un déblocage refusé s’affiche sous sa ligne, sans nouvel essai automatique', async ({ worker }) => {
    let unlocks = 0
    worker.use(
      http.get(TO_DO, () => list(three)),
      http.post(UNLOCK, () => {
        unlocks += 1
        return reply(apiErrors.serverError())
      }),
    )
    const screen = await start()
    await screen.getByRole('button', { name: 'Débloquer le PIN de Lucas Bernard' }).click()
    await expect.element(screen.getByRole('alert').getByText(/Une erreur est survenue de notre côté/)).toBeVisible()
    await expect.element(screen.getByText('PIN bloqué')).toBeVisible()
    expect(unlocks).toBe(1)
  })

  test('liste vide : rien à régler', async ({ worker }) => {
    worker.use(http.get(TO_DO, () => list([])))
    const screen = await start()
    await expect.element(screen.getByText('Rien à régler pour l’instant')).toBeVisible()
  })

  test('une panne de lecture peut être réessayée', async ({ worker }) => {
    worker.use(http.get(TO_DO, () => reply(apiErrors.unavailable())))
    const screen = await start()
    await expect.element(screen.getByText('Impossible de charger ce qui reste à régler.')).toBeVisible()
    worker.use(http.get(TO_DO, () => list(three)))
    await screen.getByRole('button', { name: 'Réessayer' }).click()
    await expect.element(screen.getByText('Départ non pointé hier')).toBeVisible()
  })
})
