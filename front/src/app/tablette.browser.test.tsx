import { createMemoryHistory } from '@tanstack/react-router'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'
import { render } from 'vitest-browser-react'

import type { Schemas } from '@/api/types'

import { employee, tabletActor, tabletInfo } from '../../test/fixtures'
import { test } from '../../test/msw'
import { App, createApp } from './app'

async function start() {
  const app = createApp(createMemoryHistory({ initialEntries: ['/tablette'] }))
  return { app, screen: await render(<App instance={app} />) }
}

const noActionSession = http.get('/api/v2/tablet/session', () =>
  HttpResponse.json({ detail: 'Session de tablette absente ou expirée : saisir le PIN' }, { status: 401 }),
)

describe('mode tablette', () => {
  test("tablette non enrôlée : explication, et pas de renvoi vers l'écran de connexion", async ({ worker }) => {
    worker.use(
      http.get('/api/v2/tablet', () =>
        HttpResponse.json({ detail: 'Tablette non enrôlée, expirée ou révoquée' }, { status: 401 }),
      ),
      noActionSession,
    )
    const { app, screen } = await start()
    await expect.element(screen.getByRole('heading', { name: 'Tablette non enrôlée' })).toBeVisible()
    expect(app.router.state.location.pathname).toBe('/tablette')
  })

  test('PIN refusé puis accepté, puis fin de session', async ({ worker }) => {
    let actor: Schemas['TabletActorOut'] | null = null
    const sent: unknown[] = []
    worker.use(
      http.get('/api/v2/tablet', () => HttpResponse.json(tabletInfo)),
      http.get('/api/v2/tablet/session', () =>
        actor === null ? HttpResponse.json({ detail: 'x' }, { status: 401 }) : HttpResponse.json(actor),
      ),
      http.post('/api/v2/tablet/session', async ({ request }) => {
        const body = (await request.json()) as { pin: string }
        sent.push(body)
        if (body.pin !== '4826') return HttpResponse.json({ detail: 'PIN incorrect' }, { status: 401 })
        actor = { ...tabletActor, expires_at: new Date(Date.now() + 120_000).toISOString() }
        return HttpResponse.json(actor, { status: 201 })
      }),
      http.delete('/api/v2/tablet/session', () => {
        actor = null
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { app, screen } = await start()
    await expect.element(screen.getByRole('heading', { name: /Crèche Démo Nord/ })).toBeVisible()
    await screen.getByRole('button', { name: 'Lucas B.' }).click()

    await screen.getByLabelText('PIN de Lucas B.').fill('1111')
    await expect.element(screen.getByRole('alert')).toHaveTextContent('PIN incorrect')
    // Saisie refusée effacée, et la 401 du PIN ne renvoie pas vers la connexion.
    await expect.element(screen.getByLabelText('PIN de Lucas B.')).toHaveValue('')
    expect(app.router.state.location.pathname).toBe('/tablette')

    await screen.getByLabelText('PIN de Lucas B.').fill('4826')
    await expect.element(screen.getByRole('heading', { name: 'Bonjour Lucas B.' })).toBeVisible()
    expect(sent).toEqual([
      { user_id: employee.id, pin: '1111' },
      { user_id: employee.id, pin: '4826' },
    ])

    await screen.getByRole('button', { name: 'Terminer' }).click()
    await expect.element(screen.getByRole('heading', { name: 'Qui êtes-vous ?' })).toBeVisible()
  })

  test("PIN bloqué : retour à la liste avec le message de l'API, liste relue", async ({ worker }) => {
    let info = tabletInfo
    worker.use(
      http.get('/api/v2/tablet', () => HttpResponse.json(info)),
      noActionSession,
      http.post('/api/v2/tablet/session', () => {
        info = {
          ...tabletInfo,
          staff: tabletInfo.staff.map((member) =>
            member.id === employee.id ? { ...member, pin_locked: true } : member,
          ),
        }
        return HttpResponse.json(
          { detail: 'PIN bloqué après 3 erreurs : demandez à la direction de le débloquer' },
          { status: 423 },
        )
      }),
    )
    const { screen } = await start()
    await screen.getByRole('button', { name: 'Lucas B.' }).click()
    await screen.getByLabelText('PIN de Lucas B.').fill('9999')

    await expect
      .element(screen.getByText('PIN bloqué après 3 erreurs : demandez à la direction de le débloquer'))
      .toBeVisible()
    await expect.element(screen.getByRole('button', { name: /Lucas B\./ })).toBeDisabled()
  })

  test("fin des 2 minutes : retour à la liste sans geste de l'employé", async ({ worker }) => {
    let actor: Schemas['TabletActorOut'] | null = {
      ...tabletActor,
      expires_at: new Date(Date.now() + 1_000).toISOString(),
    }
    worker.use(
      http.get('/api/v2/tablet', () => HttpResponse.json(tabletInfo)),
      http.get('/api/v2/tablet/session', () => {
        if (actor !== null && new Date(actor.expires_at).getTime() <= Date.now()) actor = null
        return actor === null ? HttpResponse.json({ detail: 'x' }, { status: 401 }) : HttpResponse.json(actor)
      }),
    )
    const { screen } = await start()
    // Session déjà ouverte au chargement : l'employé identifié est affiché.
    await expect.element(screen.getByRole('heading', { name: 'Bonjour Lucas B.' })).toBeVisible()
    await expect.element(screen.getByRole('heading', { name: 'Qui êtes-vous ?' })).toBeVisible()
  })
})
