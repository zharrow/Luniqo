import { createMemoryHistory } from '@tanstack/react-router'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'
import { render } from 'vitest-browser-react'

import { dayAttendance, employee, nursery } from '../../test/fixtures'
import { test } from '../../test/msw'
import { App, createApp } from './app'

async function start(url: string) {
  const app = createApp(createMemoryHistory({ initialEntries: [url] }))
  return { app, screen: await render(<App instance={app} />) }
}

describe('présences du jour', () => {
  test("employé : de l'accueil au tableau du jour de sa crèche", async ({ worker }) => {
    worker.use(
      http.get('/api/v2/auth/me', () => HttpResponse.json(employee)),
      http.get('/api/v2/nurseries', () => HttpResponse.json([nursery])),
      http.get(`/api/v2/nurseries/${nursery.id}`, () => HttpResponse.json(nursery)),
      http.get(`/api/v2/nurseries/${nursery.id}/attendance`, () => HttpResponse.json(dayAttendance)),
    )
    const { screen } = await start('/accueil')
    // Pas de gestion des tablettes pour un employé, mais le suivi des présences.
    await expect.element(screen.getByRole('link', { name: 'Tablettes de Crèche Démo Nord' })).not.toBeInTheDocument()
    await screen.getByRole('link', { name: 'Présences de Crèche Démo Nord' }).click()

    await expect.element(screen.getByRole('heading', { name: 'Présences du jour · Crèche Démo Nord' })).toBeVisible()
    await expect.element(screen.getByRole('row', { name: /Emma Lambert/ })).toBeVisible()
    await expect.element(screen.getByText(/^Mis à jour à \d{2}:\d{2}$/)).toBeVisible()
  })

  test("refus de l'API (crèche d'une autre entreprise) : message affiché", async ({ worker }) => {
    worker.use(
      http.get('/api/v2/auth/me', () => HttpResponse.json(employee)),
      http.get(`/api/v2/nurseries/${nursery.id}`, () =>
        HttpResponse.json({ detail: 'Crèche introuvable' }, { status: 404 }),
      ),
      http.get(`/api/v2/nurseries/${nursery.id}/attendance`, () =>
        HttpResponse.json({ detail: 'Crèche introuvable' }, { status: 404 }),
      ),
    )
    const { screen } = await start(`/creches/${nursery.id}/presences`)
    await expect.element(screen.getByRole('alert')).toBeVisible()
    await expect.element(screen.getByText('Crèche introuvable')).toBeVisible()
  })

  test("famille : l'adresse directe renvoie à l'accueil", async ({ worker }) => {
    worker.use(http.get('/api/v2/auth/me', () => HttpResponse.json({ ...employee, role: 'guardian' })))
    const { app, screen } = await start(`/creches/${nursery.id}/presences`)
    await expect.element(screen.getByText('Votre espace arrive bientôt.')).toBeVisible()
    expect(app.router.state.location.pathname).toBe('/accueil')
  })
})
