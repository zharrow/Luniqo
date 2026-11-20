import { createMemoryHistory } from '@tanstack/react-router'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'
import { render } from 'vitest-browser-react'

import { employee, nursery, nurserySummary, owner } from '../../test/fixtures'
import { apiErrors, reply } from '../../test/handlers/errors'
import { test } from '../../test/msw'
import { App, createApp } from './app'

function start(url: string) {
  return render(<App instance={createApp(createMemoryHistory({ initialEntries: [url] }))} />)
}

const noSession = http.get('/api/v2/auth/me', () => reply(apiErrors.authRequired()))

describe('connexion', () => {
  test("sans session, l'espace connecté renvoie vers la connexion", async ({ worker }) => {
    worker.use(noSession)
    const screen = await start('/accueil')
    await expect.element(screen.getByRole('heading', { name: 'Connexion' })).toBeVisible()
  })

  test("affiche le refus de l'API", async ({ worker }) => {
    worker.use(
      noSession,
      http.post('/api/v2/auth/login', () => reply(apiErrors.invalidCredentials())),
    )
    const screen = await start('/connexion')
    await screen.getByLabelText('Adresse e-mail').fill('employe@demo.test')
    await screen.getByLabelText('Mot de passe').fill('mauvais')
    await screen.getByRole('button', { name: 'Se connecter' }).click()
    await expect.element(screen.getByRole('alert')).toHaveTextContent('Identifiants invalides')
  })

  test('trop de tentatives : compte à rebours, connexion désactivée jusqu’au bout', async ({ worker }) => {
    worker.use(
      noSession,
      http.post('/api/v2/auth/login', () => reply(apiErrors.tooManyAttempts(2))),
    )
    const screen = await start('/connexion')
    await screen.getByLabelText('Adresse e-mail').fill('employe@demo.test')
    await screen.getByLabelText('Mot de passe').fill('x')
    const submit = screen.getByRole('button', { name: 'Se connecter' })
    await submit.click()

    await expect.element(screen.getByText('Trop de tentatives, réessayez plus tard', { exact: true })).toBeVisible()
    await expect.element(screen.getByRole('timer')).toBeVisible()
    await expect.element(submit).toBeDisabled()
    // Fin du délai de Retry-After (2 s) : le compte à rebours disparaît, la connexion est de nouveau possible.
    await expect.element(screen.getByRole('timer'), { timeout: 5_000 }).not.toBeInTheDocument()
    await expect.element(submit).toBeEnabled()
  })

  test("valide la saisie avant d'appeler l'API", async ({ worker }) => {
    worker.use(noSession)
    const screen = await start('/connexion')
    await screen.getByRole('button', { name: 'Se connecter' }).click()
    await expect.element(screen.getByText('Saisissez votre adresse e-mail.')).toBeVisible()
    await expect.element(screen.getByLabelText('Adresse e-mail')).toHaveAttribute('aria-invalid', 'true')
  })

  test('direction : second facteur, puis accueil avec ses crèches', async ({ worker }) => {
    let session: typeof owner | null = null
    worker.use(
      http.get('/api/v2/auth/me', () =>
        session === null ? reply(apiErrors.authRequired()) : HttpResponse.json(session),
      ),
      http.post('/api/v2/auth/login', () => {
        session = owner
        return HttpResponse.json(owner)
      }),
      http.post('/api/v2/auth/mfa/verify', async ({ request }) => {
        const { code } = (await request.json()) as { code: string }
        if (code !== '123456') return reply(apiErrors.invalidCode())
        session = { ...owner, mfa: 'verified' }
        return HttpResponse.json(session)
      }),
      http.get('/api/v2/nurseries', () => HttpResponse.json([nursery])),
      http.get(`/api/v2/nurseries/${nursery.id}/summary`, () => HttpResponse.json(nurserySummary)),
    )
    const screen = await start('/connexion')
    await screen.getByLabelText('Adresse e-mail').fill('direction@demo.test')
    await screen.getByLabelText('Mot de passe').fill('bon mot de passe')
    await screen.getByRole('button', { name: 'Se connecter' }).click()

    await expect.element(screen.getByRole('heading', { name: 'Second facteur' })).toBeVisible()
    await screen.getByLabelText('Code à 6 chiffres ou code de secours').fill('000000')
    await screen.getByRole('button', { name: 'Valider' }).click()
    await expect.element(screen.getByRole('alert')).toHaveTextContent('Code invalide')

    await screen.getByLabelText('Code à 6 chiffres ou code de secours').fill('123456')
    await screen.getByRole('button', { name: 'Valider' }).click()
    await expect.element(screen.getByRole('heading', { name: 'Accueil', level: 1 })).toBeVisible()
    await expect.element(screen.getByText('Crèche Démo Nord')).toBeVisible()
  })

  test("n'envoie jamais vers un autre site après la connexion", async ({ worker }) => {
    let connected = false
    worker.use(
      http.get('/api/v2/auth/me', () => (connected ? HttpResponse.json(employee) : reply(apiErrors.authRequired()))),
      http.post('/api/v2/auth/login', () => {
        connected = true
        return HttpResponse.json(employee)
      }),
      http.get('/api/v2/nurseries', () => HttpResponse.json([])),
    )
    const app = createApp(createMemoryHistory({ initialEntries: ['/connexion?redirect=//exemple.com'] }))
    const screen = await render(<App instance={app} />)
    await screen.getByLabelText('Adresse e-mail').fill('employe@demo.test')
    await screen.getByLabelText('Mot de passe').fill('x')
    await screen.getByRole('button', { name: 'Se connecter' }).click()
    await expect.element(screen.getByText('Aucune crèche accessible pour le moment.')).toBeVisible()
    expect(app.router.state.location.pathname).toBe('/accueil')
  })
})
