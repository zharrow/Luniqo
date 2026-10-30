import { createMemoryHistory } from '@tanstack/react-router'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'
import { render } from 'vitest-browser-react'

import { employee, nursery, owner } from '../../test/fixtures'
import { test } from '../../test/msw'
import { App, createApp } from './app'

async function start(url: string) {
  const app = createApp(createMemoryHistory({ initialEntries: [url] }))
  return { app, screen: await render(<App instance={app} />) }
}

describe('PIN de tablette', () => {
  test("employé : de l'accueil au PIN enregistré, formulaire vidé", async ({ worker }) => {
    let sent: unknown = null
    worker.use(
      http.get('/api/v2/auth/me', () => HttpResponse.json(employee)),
      http.get('/api/v2/nurseries', () => HttpResponse.json([nursery])),
      http.put('/api/v2/auth/me/pin', async ({ request }) => {
        sent = await request.json()
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { screen } = await start('/accueil')
    await screen.getByRole('link', { name: 'Choisir ou changer mon PIN de tablette' }).click()
    await expect.element(screen.getByRole('heading', { name: 'Mon PIN de tablette' })).toBeVisible()

    await screen.getByLabelText('Nouveau PIN (4 chiffres)').fill('4826')
    await screen.getByLabelText('Nouveau PIN, une seconde fois').fill('4826')
    await screen.getByLabelText('Mot de passe actuel').fill('mot de passe')
    await screen.getByRole('button', { name: 'Enregistrer mon PIN' }).click()

    await expect.element(screen.getByText('PIN enregistré : utilisez-le dès maintenant sur la tablette.')).toBeVisible()
    // La confirmation n'est pas envoyée : l'API ne reçoit que le PIN et le mot de passe.
    expect(sent).toEqual({ pin: '4826', password: 'mot de passe' })
    await expect.element(screen.getByLabelText('Nouveau PIN (4 chiffres)')).toHaveValue('')
    await expect.element(screen.getByLabelText('Mot de passe actuel')).toHaveValue('')
  })

  test("affiche le refus de l'API (PIN trop prévisible)", async ({ worker }) => {
    worker.use(
      http.get('/api/v2/auth/me', () => HttpResponse.json(employee)),
      http.put('/api/v2/auth/me/pin', () =>
        HttpResponse.json({ detail: 'Ce PIN est trop prévisible (suite de chiffres).' }, { status: 422 }),
      ),
    )
    const { screen } = await start('/mon-pin')
    await screen.getByLabelText('Nouveau PIN (4 chiffres)').fill('1234')
    await screen.getByLabelText('Nouveau PIN, une seconde fois').fill('1234')
    await screen.getByLabelText('Mot de passe actuel').fill('mot de passe')
    await screen.getByRole('button', { name: 'Enregistrer mon PIN' }).click()
    await expect.element(screen.getByText('Ce PIN est trop prévisible (suite de chiffres).')).toBeVisible()
  })

  test("direction : pas de lien, et l'adresse directe renvoie à l'accueil", async ({ worker }) => {
    worker.use(
      http.get('/api/v2/auth/me', () => HttpResponse.json({ ...owner, mfa: 'verified' })),
      http.get('/api/v2/nurseries', () => HttpResponse.json([nursery])),
    )
    const { app, screen } = await start('/mon-pin')
    await expect.element(screen.getByRole('heading', { name: 'Bonjour Camille' })).toBeVisible()
    expect(app.router.state.location.pathname).toBe('/accueil')
    await expect
      .element(screen.getByRole('link', { name: 'Choisir ou changer mon PIN de tablette' }))
      .not.toBeInTheDocument()
  })
})
