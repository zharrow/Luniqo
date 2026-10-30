import { createMemoryHistory } from '@tanstack/react-router'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'
import { render } from 'vitest-browser-react'

import type { Schemas } from '@/api/types'

import { employee, nursery, owner, tablet } from '../../test/fixtures'
import { test } from '../../test/msw'
import { App, createApp } from './app'

const director = { ...owner, mfa: 'verified' as const }
const TABLETS = `/api/v2/nurseries/${nursery.id}/tablets`

async function start(url: string) {
  const app = createApp(createMemoryHistory({ initialEntries: [url] }))
  return { app, screen: await render(<App instance={app} />) }
}

describe('tablettes', () => {
  test("direction : de l'accueil aux tablettes, puis enrôlement de l'appareil", async ({ worker }) => {
    const tablets: Schemas['TabletOut'][] = []
    let sent: unknown = null
    worker.use(
      http.get('/api/v2/auth/me', () => HttpResponse.json(director)),
      http.get('/api/v2/nurseries', () => HttpResponse.json([nursery])),
      http.get(`/api/v2/nurseries/${nursery.id}`, () => HttpResponse.json(nursery)),
      http.get(TABLETS, () => HttpResponse.json(tablets)),
      http.post(TABLETS, async ({ request }) => {
        sent = await request.json()
        tablets.push(tablet)
        return HttpResponse.json(tablet, { status: 201 })
      }),
    )
    const { screen } = await start('/accueil')
    await screen.getByRole('link', { name: 'Tablettes de Crèche Démo Nord' }).click()

    await expect.element(screen.getByRole('heading', { name: 'Tablettes de Crèche Démo Nord' })).toBeVisible()
    await expect.element(screen.getByText('Aucune tablette enrôlée pour cette crèche.')).toBeVisible()

    await screen.getByLabelText('Nom de la tablette').fill("Tablette de l'entrée")
    await screen.getByRole('button', { name: 'Enrôler cet appareil' }).click()
    await expect
      .element(
        screen
          .getByRole('alert')
          .getByText(/^« Tablette de l'entrée » est enrôlée sur cet appareil jusqu'au 28 janvier 2027\./),
      )
      .toBeVisible()
    expect(sent).toEqual({ label: "Tablette de l'entrée" })
    // Liste relue après l'enrôlement.
    await expect.element(screen.getByRole('heading', { name: "Tablette de l'entrée" })).toBeVisible()
    await expect.element(screen.getByRole('button', { name: 'Se déconnecter' }).first()).toBeVisible()
  })

  test('direction : révocation confirmée, liste relue', async ({ worker }) => {
    let current = tablet
    let revoked = 0
    worker.use(
      http.get('/api/v2/auth/me', () => HttpResponse.json(director)),
      http.get(`/api/v2/nurseries/${nursery.id}`, () => HttpResponse.json(nursery)),
      http.get(TABLETS, () => HttpResponse.json([current])),
      http.delete(`${TABLETS}/${tablet.id}`, () => {
        revoked += 1
        current = { ...tablet, revoked_at: '2026-10-30T10:00:00Z' }
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { screen } = await start(`/creches/${nursery.id}/tablettes`)
    await screen.getByRole('button', { name: 'Révoquer' }).click()
    await screen.getByRole('button', { name: 'Confirmer la révocation' }).click()
    await expect.element(screen.getByText('Révoquée')).toBeVisible()
    await expect.element(screen.getByRole('button', { name: 'Révoquer' })).not.toBeInTheDocument()
    expect(revoked).toBe(1)
  })

  test("affiche le refus de l'API à l'enrôlement", async ({ worker }) => {
    worker.use(
      http.get('/api/v2/auth/me', () => HttpResponse.json(director)),
      http.get(`/api/v2/nurseries/${nursery.id}`, () => HttpResponse.json(nursery)),
      http.get(TABLETS, () => HttpResponse.json([])),
      http.post(TABLETS, () =>
        HttpResponse.json({ detail: 'Seule la direction peut gérer cette crèche' }, { status: 403 }),
      ),
    )
    const { screen } = await start(`/creches/${nursery.id}/tablettes`)
    await screen.getByLabelText('Nom de la tablette').fill('Tablette')
    await screen.getByRole('button', { name: 'Enrôler cet appareil' }).click()
    await expect.element(screen.getByRole('alert')).toHaveTextContent('Seule la direction peut gérer cette crèche')
  })

  test("employé : pas de lien vers les tablettes, et l'adresse directe renvoie à l'accueil", async ({ worker }) => {
    worker.use(
      http.get('/api/v2/auth/me', () => HttpResponse.json(employee)),
      http.get('/api/v2/nurseries', () => HttpResponse.json([nursery])),
    )
    const { app, screen } = await start(`/creches/${nursery.id}/tablettes`)
    await expect.element(screen.getByRole('heading', { name: 'Bonjour Lucas' })).toBeVisible()
    expect(app.router.state.location.pathname).toBe('/accueil')
    await expect.element(screen.getByText('Crèche Démo Nord')).toBeVisible()
    await expect.element(screen.getByRole('link', { name: /Tablettes/ })).not.toBeInTheDocument()
  })
})
