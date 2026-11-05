import { createMemoryHistory } from '@tanstack/react-router'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, vi } from 'vitest'
import { render } from 'vitest-browser-react'

import { lastDays, previousMonth } from '@/features/attendance/period'
import { todayInParis } from '@/lib/dates'

import { employee, nursery, owner, periodAttendance } from '../../test/fixtures'
import { test } from '../../test/msw'
import { App, createApp } from './app'

const director = { ...owner, mfa: 'verified' as const }
const HISTORY = `/api/v2/nurseries/${nursery.id}/attendance/history`
const PAGE = `/creches/${nursery.id}/presences/historique`

async function start(url: string) {
  const app = createApp(createMemoryHistory({ initialEntries: [url] }))
  return { app, screen: await render(<App instance={app} />) }
}

/** Période demandée à l'API, lue dans l'adresse de la requête. */
function periodOf(request: Request) {
  const query = new URL(request.url).searchParams
  return { from: query.get('from'), to: query.get('to') }
}

/** Fichier proposé au navigateur : intercepté, pour ne rien télécharger pendant le test. */
function catchDownload() {
  const saved: { name: string; blob: Blob | null } = { name: '', blob: null }
  vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
    saved.blob = blob as Blob
    return 'blob:luniqo-test'
  })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    saved.name = this.download
  })
  return saved
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('historique des présences', () => {
  test('employé : des présences du jour aux 7 derniers jours, par défaut', async ({ worker }) => {
    const asked: ReturnType<typeof periodOf>[] = []
    worker.use(
      http.get('/api/v2/auth/me', () => HttpResponse.json(employee)),
      http.get(`/api/v2/nurseries/${nursery.id}`, () => HttpResponse.json(nursery)),
      http.get(`/api/v2/nurseries/${nursery.id}/attendance`, () => HttpResponse.json([])),
      http.get(HISTORY, ({ request }) => {
        asked.push(periodOf(request))
        return HttpResponse.json(periodAttendance)
      }),
    )
    const { screen } = await start(`/creches/${nursery.id}/presences`)
    await screen.getByRole('link', { name: 'Historique et export' }).click()

    await expect
      .element(screen.getByRole('heading', { name: 'Historique des présences · Crèche Démo Nord' }))
      .toBeVisible()
    // Même période par défaut que l'API, calculée sur le jour de Paris.
    expect(asked).toEqual([lastDays(todayInParis())])
    await expect
      .element(screen.getByRole('button', { name: '7 derniers jours' }))
      .toHaveAttribute('aria-pressed', 'true')
    await expect.element(screen.getByRole('heading', { name: 'Mercredi 28 octobre 2026' })).toBeVisible()
    const thursday = screen.getByRole('region', { name: 'Jeudi 29 octobre 2026' })
    await expect.element(thursday.getByRole('row', { name: /Emma Lambert/ })).toBeVisible()
    // Le 28, Léo n'est jamais reparti : départ oublié, que la direction devra corriger.
    const wednesday = screen.getByRole('region', { name: 'Mercredi 28 octobre 2026' })
    await expect.element(wednesday.getByText('Départ non pointé')).toBeVisible()
  })

  test("raccourci « Mois précédent » : la période passe dans l'adresse et part à l'API", async ({ worker }) => {
    const asked: ReturnType<typeof periodOf>[] = []
    worker.use(
      http.get('/api/v2/auth/me', () => HttpResponse.json(director)),
      http.get(`/api/v2/nurseries/${nursery.id}`, () => HttpResponse.json(nursery)),
      http.get(HISTORY, ({ request }) => {
        asked.push(periodOf(request))
        return HttpResponse.json([])
      }),
    )
    const { app, screen } = await start(PAGE)
    await expect.element(screen.getByText('Aucune arrivée pointée sur cette période.')).toBeVisible()
    await screen.getByRole('button', { name: 'Mois précédent' }).click()

    const month = previousMonth(todayInParis())
    await expect.poll(() => app.router.state.location.search).toEqual({ du: month.from, au: month.to })
    expect(asked.at(-1)).toEqual(month)
    // Le formulaire reprend la période choisie.
    await expect.element(screen.getByLabelText('Du')).toHaveValue(month.from)
    await expect.element(screen.getByLabelText('Au')).toHaveValue(month.to)
  })

  test("période saisie à l'envers : refusée sans appeler l'API", async ({ worker }) => {
    const asked: ReturnType<typeof periodOf>[] = []
    worker.use(
      http.get('/api/v2/auth/me', () => HttpResponse.json(director)),
      http.get(`/api/v2/nurseries/${nursery.id}`, () => HttpResponse.json(nursery)),
      http.get(HISTORY, ({ request }) => {
        asked.push(periodOf(request))
        return HttpResponse.json(periodAttendance)
      }),
    )
    const { app, screen } = await start(`${PAGE}?du=2026-10-24&au=2026-10-30`)
    await expect.element(screen.getByRole('heading', { name: 'Jeudi 29 octobre 2026' })).toBeVisible()
    await screen.getByLabelText('Du').fill('2026-11-02')
    await screen.getByRole('button', { name: 'Afficher' }).click()

    await expect.element(screen.getByText('La date de début suit la date de fin')).toBeVisible()
    expect(app.router.state.location.search).toEqual({ du: '2026-10-24', au: '2026-10-30' })
    expect(asked).toEqual([{ from: '2026-10-24', to: '2026-10-30' }])
  })

  test("export CSV : le fichier de l'API, pour la période affichée", async ({ worker }) => {
    let exported: ReturnType<typeof periodOf> | null = null
    worker.use(
      http.get('/api/v2/auth/me', () => HttpResponse.json(director)),
      http.get(`/api/v2/nurseries/${nursery.id}`, () => HttpResponse.json(nursery)),
      http.get(HISTORY, () => HttpResponse.json(periodAttendance)),
      http.get(`${HISTORY}.csv`, ({ request }) => {
        exported = periodOf(request)
        return new HttpResponse('\uFEFFJour;Enfant\r\n28/10/2026;Léo Garnier\r\n', {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attachment; filename="presences_2026-10-24_2026-10-30.csv"',
          },
        })
      }),
    )
    const saved = catchDownload()
    const { screen } = await start(`${PAGE}?du=2026-10-24&au=2026-10-30`)
    await expect.element(screen.getByText('Du 24 octobre 2026 au 30 octobre 2026')).toBeVisible()
    await screen.getByRole('button', { name: 'Exporter en CSV' }).click()

    await expect.poll(() => saved.name).toBe('presences_2026-10-24_2026-10-30.csv')
    expect(exported).toEqual({ from: '2026-10-24', to: '2026-10-30' })
    expect(await saved.blob?.text()).toContain('28/10/2026;Léo Garnier')
  })

  test('export refusé (session expirée) : message affiché, aucun fichier', async ({ worker }) => {
    worker.use(
      http.get('/api/v2/auth/me', () => HttpResponse.json(director)),
      http.get(`/api/v2/nurseries/${nursery.id}`, () => HttpResponse.json(nursery)),
      http.get(HISTORY, () => HttpResponse.json(periodAttendance)),
      http.get(`${HISTORY}.csv`, () =>
        HttpResponse.json({ detail: 'Action non autorisée pour ce rôle' }, { status: 403 }),
      ),
    )
    const saved = catchDownload()
    const { screen } = await start(`${PAGE}?du=2026-10-24&au=2026-10-30`)
    await screen.getByRole('button', { name: 'Exporter en CSV' }).click()

    await expect.element(screen.getByText('Action non autorisée pour ce rôle')).toBeVisible()
    expect(saved.name).toBe('')
  })

  test("famille : l'adresse directe renvoie à l'accueil", async ({ worker }) => {
    worker.use(http.get('/api/v2/auth/me', () => HttpResponse.json({ ...employee, role: 'guardian' })))
    const { app, screen } = await start(PAGE)
    await expect.element(screen.getByText('Votre espace arrive bientôt.')).toBeVisible()
    expect(app.router.state.location.pathname).toBe('/accueil')
  })
})
