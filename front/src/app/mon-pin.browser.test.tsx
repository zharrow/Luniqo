import { createMemoryHistory } from '@tanstack/react-router'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'
import { render } from 'vitest-browser-react'

import { employee, nursery, nurserySummary, owner } from '../../test/fixtures'
import { apiErrors, reply } from '../../test/handlers/errors'
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
      http.get(`/api/v2/nurseries/${nursery.id}/summary`, () => HttpResponse.json(nurserySummary)),
      http.put('/api/v2/auth/me/pin', async ({ request }) => {
        sent = await request.json()
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { screen } = await start('/accueil')
    await screen.getByRole('link', { name: 'Choisir ou changer mon PIN de tablette' }).click()
    await expect.element(screen.getByRole('heading', { name: 'Mon compte', level: 1 })).toBeVisible()

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
      http.put('/api/v2/auth/me/pin', () => reply(apiErrors.pinPolicy())),
    )
    const { screen } = await start('/mon-pin')
    await screen.getByLabelText('Nouveau PIN (4 chiffres)').fill('1234')
    await screen.getByLabelText('Nouveau PIN, une seconde fois').fill('1234')
    await screen.getByLabelText('Mot de passe actuel').fill('mot de passe')
    await screen.getByRole('button', { name: 'Enregistrer mon PIN' }).click()
    await expect.element(screen.getByText('Ce PIN est trop prévisible (suite de chiffres).')).toBeVisible()
  })

  test("erreur par champ de l'API : sous le champ concerné, résumé en haut du formulaire", async ({ worker }) => {
    worker.use(
      http.get('/api/v2/auth/me', () => HttpResponse.json(employee)),
      http.put('/api/v2/auth/me/pin', () =>
        reply(apiErrors.validation({ password: 'Au plus 128 caractères', nursery_id: 'Identifiant invalide' })),
      ),
    )
    const { screen } = await start('/mon-pin')
    await screen.getByLabelText('Nouveau PIN (4 chiffres)').fill('4826')
    await screen.getByLabelText('Nouveau PIN, une seconde fois').fill('4826')
    await screen.getByLabelText('Mot de passe actuel').fill('mot de passe')
    await screen.getByRole('button', { name: 'Enregistrer mon PIN' }).click()

    await expect.element(screen.getByRole('alert')).toHaveTextContent('Certains champs sont invalides.')
    const password = screen.getByLabelText('Mot de passe actuel')
    await expect.element(password).toHaveAttribute('aria-invalid', 'true')
    await expect.element(password).toHaveAccessibleDescription('Au plus 128 caractères')
    // Un champ que le formulaire n'affiche pas reste dans le résumé, sans erreur ailleurs.
    await expect.element(screen.getByLabelText('Nouveau PIN (4 chiffres)')).toHaveAttribute('aria-invalid', 'false')
  })

  test("direction : pas de lien, et l'adresse directe renvoie à l'accueil", async ({ worker }) => {
    worker.use(
      http.get('/api/v2/auth/me', () => HttpResponse.json({ ...owner, mfa: 'verified' })),
      http.get('/api/v2/nurseries', () => HttpResponse.json([nursery])),
      http.get(`/api/v2/nurseries/${nursery.id}/summary`, () => HttpResponse.json(nurserySummary)),
    )
    const { app, screen } = await start('/mon-pin')
    await expect.element(screen.getByRole('heading', { name: 'Accueil', level: 1 })).toBeVisible()
    expect(app.router.state.location.pathname).toBe('/accueil')
    await expect
      .element(screen.getByRole('link', { name: 'Choisir ou changer mon PIN de tablette' }))
      .not.toBeInTheDocument()
  })
})
