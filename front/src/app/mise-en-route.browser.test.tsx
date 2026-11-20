import { createMemoryHistory } from '@tanstack/react-router'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-react'

import { dayAttendance, employee, nursery, nurseryOnboarding, nurserySummary, owner } from '../../test/fixtures'
import { apiErrors, reply } from '../../test/handlers/errors'
import { test } from '../../test/msw'
import { App, createApp } from './app'

const ONBOARDING = `/api/v2/nurseries/${nursery.id}/onboarding`

function start(url: string) {
  return render(<App instance={createApp(createMemoryHistory({ initialEntries: [url] }))} />)
}

describe('mise en route d’une crèche (LUN-128)', () => {
  test('la direction voit 2 succès sur 3 datés, puis suit le lien du succès manquant, en 800 × 600', async ({
    worker,
  }) => {
    worker.use(
      http.get('/api/v2/auth/me', () => HttpResponse.json({ ...owner, mfa: 'verified' })),
      http.get('/api/v2/nurseries', () => HttpResponse.json([nursery])),
      http.get(`/api/v2/nurseries/${nursery.id}/summary`, () => HttpResponse.json(nurserySummary)),
      http.get(`/api/v2/nurseries/${nursery.id}`, () => HttpResponse.json(nursery)),
      http.get(ONBOARDING, () => HttpResponse.json(nurseryOnboarding)),
      http.get(`/api/v2/nurseries/${nursery.id}/attendance`, () => HttpResponse.json(dayAttendance)),
    )
    await page.viewport(800, 600)
    const screen = await start('/accueil')
    await screen.getByRole('link', { name: `Mise en route de ${nursery.name}` }).click()

    await expect.element(screen.getByRole('heading', { name: `Mise en route · ${nursery.name}` })).toBeVisible()
    await expect.element(screen.getByText('2 succès sur 3')).toBeVisible()
    const staff = screen.getByRole('listitem', { name: 'Personnel : obtenu' })
    const tablet = screen.getByRole('listitem', { name: 'Tablette : obtenu' })
    const first = screen.getByRole('listitem', { name: 'Premier pointage : à obtenir' })
    await expect.element(staff.getByText('Obtenu le 3 novembre 2026')).toBeVisible()
    await expect.element(tablet.getByText('Obtenu le 4 novembre 2026')).toBeVisible()
    await expect.element(first.getByText('Pointez l’arrivée d’un enfant depuis la tablette.')).toBeVisible()

    // Lisible en 800 × 600 : ni la page ni un succès ne défilent horizontalement.
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth)
    for (const element of document.querySelectorAll('li, h1, h3')) {
      expect(element.scrollWidth).toBeLessThanOrEqual(element.clientWidth)
    }

    await first.getByRole('link', { name: 'Aller aux présences du jour' }).click()
    await expect.element(screen.getByRole('heading', { level: 1, name: 'Présences' })).toBeVisible()
    await expect.element(screen.getByRole('navigation', { name: "Fil d'Ariane" }).getByText(nursery.name)).toBeVisible()
  })

  test('une panne de l’API : message, puis « Réessayer » recharge la progression', async ({ worker }) => {
    let attempts = 0
    let down = true
    worker.use(
      http.get('/api/v2/auth/me', () => HttpResponse.json({ ...owner, mfa: 'verified' })),
      http.get(`/api/v2/nurseries/${nursery.id}`, () => HttpResponse.json(nursery)),
      http.get(ONBOARDING, () => {
        attempts += 1
        return down ? reply(apiErrors.serverError('reference-mise-en-route')) : HttpResponse.json(nurseryOnboarding)
      }),
    )
    const screen = await start(`/creches/${nursery.id}/mise-en-route`)
    // Lecture rejouée deux fois sur une 5xx avant l'erreur (app.tsx).
    await expect.element(screen.getByText('Impossible de charger la mise en route.'), { timeout: 10_000 }).toBeVisible()
    await expect.element(screen.getByText(/Référence : reference-mise-en-route/)).toBeVisible()
    expect(attempts).toBe(3)

    down = false
    await screen.getByRole('button', { name: 'Réessayer' }).click()
    await expect.element(screen.getByText('2 succès sur 3')).toBeVisible()
    expect(attempts).toBe(4)
  })

  test('un employé n’a ni lien ni page : retour à l’accueil', async ({ worker }) => {
    let asked = false
    worker.use(
      http.get('/api/v2/auth/me', () => HttpResponse.json(employee)),
      http.get('/api/v2/nurseries', () => HttpResponse.json([nursery])),
      http.get(`/api/v2/nurseries/${nursery.id}/summary`, () => HttpResponse.json(nurserySummary)),
      http.get(ONBOARDING, () => {
        asked = true
        return HttpResponse.json(nurseryOnboarding)
      }),
    )
    const screen = await start(`/creches/${nursery.id}/mise-en-route`)
    await expect.element(screen.getByRole('heading', { level: 1, name: 'Ma journée' })).toBeVisible()
    await expect.element(screen.getByRole('link', { name: `Présences de ${nursery.name}` })).toBeVisible()
    await expect.element(screen.getByRole('link', { name: `Mise en route de ${nursery.name}` })).not.toBeInTheDocument()
    expect(asked).toBe(false)
  })
})
