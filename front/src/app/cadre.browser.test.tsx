import { createMemoryHistory } from '@tanstack/react-router'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'

import type { Session } from '@/api/types'

import { employee, nursery, nurserySummary, owner } from '../../test/fixtures'
import { test, type worker as Worker } from '../../test/msw'
import { App, createApp } from './app'

/**
 * Cadre de l'espace connecté (LUN-150) : seuls les éléments du cadre sont vérifiés
 * (menu, entrée active, adresse, choix de la crèche) ; le contenu des pages a ses propres tests.
 */

const south = { ...nursery, id: '00000000-0000-4000-8000-0000000000c2', name: 'Micro-crèche Démo Sud' }
const director: Session = { ...owner, mfa: 'verified' }
const guardian: Session = {
  ...owner,
  id: '00000000-0000-4000-8000-000000000005',
  role: 'guardian',
  mfa: 'not_required',
}
const developer: Session = { ...owner, id: '00000000-0000-4000-8000-000000000006', role: 'developer', mfa: 'verified' }

async function start(path: string) {
  const instance = createApp(createMemoryHistory({ initialEntries: [path] }))
  return { screen: await render(<App instance={instance} />), router: instance.router }
}

/** Session, crèches accessibles et ce que lisent l'accueil et les présences de chacune. */
function serve(worker: typeof Worker, session: Session, nurseries: (typeof nursery)[]) {
  worker.use(
    http.get('/api/v2/auth/me', () => HttpResponse.json(session)),
    http.get('/api/v2/nurseries', () => HttpResponse.json(nurseries)),
    ...nurseries.flatMap((n) => [
      http.get(`/api/v2/nurseries/${n.id}`, () => HttpResponse.json(n)),
      http.get(`/api/v2/nurseries/${n.id}/summary`, () => HttpResponse.json(nurserySummary)),
      http.get(`/api/v2/nurseries/${n.id}/attendance`, () => HttpResponse.json([])),
    ]),
  )
}

function noHorizontalScroll() {
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth)
}

beforeEach(() => {
  localStorage.clear()
})

describe('direction', () => {
  test('menu latéral visible en 1280 × 800, entrée de la page en cours marquée', async ({ worker }) => {
    serve(worker, director, [nursery, south])
    await page.viewport(1280, 800)
    const { screen } = await start(`/creches/${nursery.id}/presences`)
    const menu = screen.getByRole('navigation', { name: 'Menu principal' })
    await expect.element(menu).toBeVisible()
    await expect.element(menu.getByRole('link', { name: 'Présences' })).toHaveAttribute('aria-current', 'page')
    await expect.element(menu.getByRole('link', { name: 'Accueil' })).not.toHaveAttribute('aria-current')
  })

  test('« Aller au contenu » est le premier élément atteint au clavier', async ({ worker }) => {
    serve(worker, director, [nursery])
    await page.viewport(1280, 800)
    const { screen } = await start(`/creches/${nursery.id}/presences`)
    await expect.element(screen.getByRole('navigation', { name: 'Menu principal' })).toBeVisible()
    ;(document.activeElement as HTMLElement | null)?.blur()
    await userEvent.tab()
    const skip = screen.getByRole('link', { name: 'Aller au contenu' })
    await expect.element(skip).toHaveFocus()
    await skip.click()
    expect(document.activeElement?.id).toBe('contenu')
  })

  test('changer de crèche garde la page', async ({ worker }) => {
    serve(worker, director, [nursery, south])
    await page.viewport(1280, 800)
    const { screen, router } = await start(`/creches/${nursery.id}/presences`)
    const choice = screen.getByRole('combobox', { name: 'Crèche' })
    await expect.element(choice).toHaveValue(nursery.id)
    await choice.selectOptions(south.id)
    await expect.poll(() => router.state.location.pathname).toBe(`/creches/${south.id}/presences`)
    await expect.element(choice).toHaveValue(south.id)
    expect(localStorage.getItem('luniqo.creche')).toBe(south.id)
  })

  test('« Tout le groupe » sélectionné sur l’accueil, choisi ailleurs il ramène à l’accueil', async ({ worker }) => {
    serve(worker, director, [nursery, south])
    await page.viewport(1280, 800)
    const { screen, router } = await start(`/creches/${south.id}/presences`)
    const choice = screen.getByRole('combobox', { name: 'Crèche' })
    await choice.selectOptions('group')
    await expect.poll(() => router.state.location.pathname).toBe('/accueil')
    await expect.element(choice).toHaveValue('group')
  })

  test('un groupe replié s’ouvre, son entrée mène à la page « bientôt »', async ({ worker }) => {
    serve(worker, director, [nursery])
    await page.viewport(1280, 800)
    const { screen, router } = await start(`/creches/${nursery.id}/presences`)
    const menu = screen.getByRole('navigation', { name: 'Menu principal' })
    const places = menu.getByRole('button', { name: /Lieux et hygiène/ })
    await expect.element(places).toHaveAttribute('aria-expanded', 'false')
    await places.click()
    await expect.element(places).toHaveAttribute('aria-expanded', 'true')
    expect(JSON.parse(localStorage.getItem('luniqo.groupes') ?? 'null')).not.toContain('places')
    await menu.getByRole('link', { name: /^HACCP/ }).click()
    await expect.element(screen.getByRole('heading', { level: 1, name: 'HACCP' })).toBeVisible()
    expect(router.state.location.pathname).toBe(`/creches/${nursery.id}/bientot/haccp`)
    await expect.element(menu.getByRole('link', { name: /^HACCP/ })).toHaveAttribute('aria-current', 'page')
  })

  test('le menu masqué en grand écran le reste (choix retenu)', async ({ worker }) => {
    serve(worker, director, [nursery])
    await page.viewport(1280, 800)
    const { screen } = await start(`/creches/${nursery.id}/presences`)
    await screen.getByRole('button', { name: 'Fermer le menu' }).click()
    await expect.element(screen.getByRole('navigation', { name: 'Menu principal' })).not.toBeInTheDocument()
    expect(localStorage.getItem('luniqo.menu')).not.toBeNull()
    await screen.unmount()
    const again = (await start(`/creches/${nursery.id}/presences`)).screen
    await expect.element(again.getByRole('button', { name: 'Ouvrir le menu' })).toBeVisible()
    await expect.element(again.getByRole('navigation', { name: 'Menu principal' })).not.toBeInTheDocument()
  })

  test('sans crèche : ni choix de la crèche ni entrée « Présences »', async ({ worker }) => {
    serve(worker, director, [])
    await page.viewport(1280, 800)
    const { screen } = await start('/accueil')
    const menu = screen.getByRole('navigation', { name: 'Menu principal' })
    await expect.element(menu.getByRole('link', { name: 'Accueil' })).toBeVisible()
    await expect.element(screen.getByRole('heading', { level: 1 })).toBeVisible()
    await expect.element(screen.getByRole('combobox', { name: 'Crèche' })).not.toBeInTheDocument()
    await expect.element(menu.getByRole('link', { name: 'Présences' })).not.toBeInTheDocument()
  })

  test('une crèche retenue inconnue est ignorée : la première de la liste sert', async ({ worker }) => {
    localStorage.setItem('luniqo.creche', 'inconnue')
    serve(worker, director, [nursery, south])
    await page.viewport(1280, 800)
    const { screen } = await start('/accueil')
    const menu = screen.getByRole('navigation', { name: 'Menu principal' })
    await expect
      .element(menu.getByRole('link', { name: 'Présences' }))
      .toHaveAttribute('href', `/creches/${nursery.id}/presences`)
  })

  test('stockage du navigateur indisponible : le cadre s’affiche', async ({ worker }) => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Stockage refusé')
    })
    try {
      serve(worker, director, [nursery])
      await page.viewport(1280, 800)
      const { screen } = await start(`/creches/${nursery.id}/presences`)
      const menu = screen.getByRole('navigation', { name: 'Menu principal' })
      await expect.element(menu).toBeVisible()
      await expect.element(menu.getByRole('link', { name: 'Présences' })).toHaveAttribute('aria-current', 'page')
    } finally {
      getItem.mockRestore()
    }
  })

  for (const [width, height] of [
    [800, 600],
    [375, 700],
  ] as const) {
    test(`en ${width} × ${height} : menu caché, ouvert par-dessus la page, refermé`, async ({ worker }) => {
      serve(worker, director, [nursery, south])
      await page.viewport(width, height)
      const { screen, router } = await start(`/creches/${nursery.id}/presences`)
      const toggle = screen.getByRole('button', { name: 'Ouvrir le menu' })
      await expect.element(toggle).toBeVisible()
      await expect.element(screen.getByRole('navigation', { name: 'Menu principal' })).not.toBeInTheDocument()
      noHorizontalScroll()

      await toggle.click()
      const menu = screen.getByRole('navigation', { name: 'Menu principal' })
      await expect.element(menu).toBeVisible()
      noHorizontalScroll()
      await userEvent.keyboard('{Escape}')
      await expect.element(menu).not.toBeInTheDocument()
      await expect.element(screen.getByRole('button', { name: 'Ouvrir le menu' })).toHaveFocus()

      await screen.getByRole('button', { name: 'Ouvrir le menu' }).click()
      await menu.getByRole('link', { name: 'Accueil' }).click()
      await expect.poll(() => router.state.location.pathname).toBe('/accueil')
      await expect.element(screen.getByRole('navigation', { name: 'Menu principal' })).not.toBeInTheDocument()
    })
  }

  test('le voile referme le menu ouvert sur petit écran', async ({ worker }) => {
    serve(worker, director, [nursery])
    await page.viewport(800, 600)
    const { screen } = await start(`/creches/${nursery.id}/presences`)
    await screen.getByRole('button', { name: 'Ouvrir le menu' }).click()
    await expect.element(screen.getByRole('navigation', { name: 'Menu principal' })).toBeVisible()
    document.querySelector<HTMLElement>('[data-testid="voile"]')?.click()
    await expect.element(screen.getByRole('navigation', { name: 'Menu principal' })).not.toBeInTheDocument()
  })
})

describe('éditeur', () => {
  test('cadre de la direction sans choix de crèche ni lecture des crèches', async ({ worker }) => {
    // Aucune réponse prévue pour GET /api/v2/nurseries : un appel ferait échouer le test.
    worker.use(http.get('/api/v2/auth/me', () => HttpResponse.json(developer)))
    await page.viewport(1280, 800)
    const { screen } = await start('/accueil')
    const menu = screen.getByRole('navigation', { name: 'Menu principal' })
    await expect.element(menu.getByRole('link', { name: /^Entreprises/ })).toBeVisible()
    await expect.element(screen.getByRole('combobox', { name: 'Crèche' })).not.toBeInTheDocument()
  })
})

describe('employée', () => {
  test('en-tête à trois entrées, sans menu latéral', async ({ worker }) => {
    serve(worker, { ...employee }, [nursery])
    await page.viewport(1280, 800)
    const { screen } = await start('/accueil')
    const menu = screen.getByRole('navigation', { name: 'Menu principal' })
    await expect.element(menu.getByRole('link', { name: 'Ma journée' })).toHaveAttribute('aria-current', 'page')
    await expect
      .element(menu.getByRole('link', { name: 'Présences' }))
      .toHaveAttribute('href', `/creches/${nursery.id}/presences`)
    await expect.element(menu.getByRole('link', { name: 'Mon compte' })).toBeVisible()
    await expect.element(screen.getByRole('button', { name: 'Ouvrir le menu' })).not.toBeInTheDocument()
    await expect.element(screen.getByRole('button', { name: 'Fermer le menu' })).not.toBeInTheDocument()
    // Une seule crèche : pas de choix.
    await expect.element(screen.getByRole('combobox', { name: 'Crèche' })).not.toBeInTheDocument()
  })

  test('plusieurs crèches : choix sans « Tout le groupe »', async ({ worker }) => {
    serve(worker, { ...employee }, [nursery, south])
    await page.viewport(1280, 800)
    const { screen } = await start(`/creches/${south.id}/presences`)
    const choice = screen.getByRole('combobox', { name: 'Crèche' })
    await expect.element(choice).toHaveValue(south.id)
    expect(choice.element().querySelector('option[value="group"]')).toBeNull()
  })

  test('« Mon PIN de tablette » dans les réglages', async ({ worker }) => {
    serve(worker, { ...employee }, [nursery])
    await page.viewport(1280, 800)
    const { screen } = await start('/reglages')
    await expect.element(screen.getByRole('heading', { level: 1, name: 'Réglages' })).toBeVisible()
    await expect.element(screen.getByRole('heading', { name: 'Mon compte' })).toBeVisible()
    await expect.element(screen.getByRole('heading', { name: 'La crèche' })).toBeVisible()
    await expect.element(screen.getByRole('heading', { name: "L'entreprise" })).toBeVisible()
    await expect.element(screen.getByRole('link', { name: 'Mon PIN de tablette' })).toHaveAttribute('href', '/mon-pin')
  })
})

describe('parent', () => {
  test('cinq onglets, en bas de l’écran du téléphone, sans masquer le contenu', async ({ worker }) => {
    worker.use(http.get('/api/v2/auth/me', () => HttpResponse.json(guardian)))
    await page.viewport(375, 700)
    const { screen } = await start('/accueil')
    const tabs = screen.getByRole('navigation', { name: 'Menu principal' })
    await expect.element(tabs.getByRole('link', { name: 'Accueil' })).toHaveAttribute('aria-current', 'page')
    expect(tabs.element().querySelectorAll('a')).toHaveLength(5)
    const bar = tabs.element().getBoundingClientRect()
    expect(Math.abs(bar.bottom - window.innerHeight)).toBeLessThanOrEqual(1)
    const main = document.getElementById('contenu')
    expect(main).not.toBeNull()
    expect(Number.parseFloat(getComputedStyle(main as HTMLElement).paddingBottom)).toBeGreaterThanOrEqual(bar.height)
    noHorizontalScroll()
  })
})

describe('pages « bientôt »', () => {
  test('module inconnu : page introuvable', async ({ worker }) => {
    serve(worker, director, [nursery])
    const { screen } = await start('/bientot/inexistant')
    await expect.element(screen.getByRole('heading', { name: 'Page introuvable' })).toBeVisible()
  })

  test('module de l’entreprise sous une crèche : page introuvable', async ({ worker }) => {
    serve(worker, director, [nursery])
    const { screen } = await start(`/creches/${nursery.id}/bientot/facturation`)
    await expect.element(screen.getByRole('heading', { name: 'Page introuvable' })).toBeVisible()
  })

  test('module d’une crèche hors crèche : page introuvable', async ({ worker }) => {
    serve(worker, director, [nursery])
    const { screen } = await start('/bientot/haccp')
    await expect.element(screen.getByRole('heading', { name: 'Page introuvable' })).toBeVisible()
  })

  test('module de l’entreprise : sa page « bientôt »', async ({ worker }) => {
    serve(worker, director, [nursery])
    await page.viewport(1280, 800)
    const { screen } = await start('/bientot/facturation')
    await expect.element(screen.getByRole('heading', { level: 1, name: 'Facturation' })).toBeVisible()
    const menu = screen.getByRole('navigation', { name: 'Menu principal' })
    await expect.element(menu.getByRole('link', { name: /^Facturation/ })).toHaveAttribute('aria-current', 'page')
  })
})
