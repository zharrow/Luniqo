import { createMemoryHistory } from '@tanstack/react-router'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-react'

import type { Schemas } from '@/api/types'

import { dayAttendance, dayNotes, employee, nursery } from '../../test/fixtures'
import { apiErrors, networkError, reply } from '../../test/handlers/errors'
import { test } from '../../test/msw'
import { App, createApp } from './app'

const BASE = `/api/v2/nurseries/${nursery.id}`
const LEO = dayAttendance[0]?.child_id ?? ''
const WRITE = `${BASE}/children/${LEO}/notes`
const TEXT = 'A bien mangé, sieste de 13 h à 15 h'

/** Page « Présences du jour » d'une employée, transmissions servies par `notes`. */
function start(notes: () => Schemas['NoteOut'][]) {
  return {
    handlers: [
      http.get('/api/v2/auth/me', () => HttpResponse.json(employee)),
      http.get(BASE, () => HttpResponse.json(nursery)),
      http.get(`${BASE}/attendance`, () => HttpResponse.json(dayAttendance)),
      http.get(`${BASE}/notes`, () => HttpResponse.json(notes())),
    ],
    render: () =>
      render(
        <App instance={createApp(createMemoryHistory({ initialEntries: [`/creches/${nursery.id}/presences`] }))} />,
      ),
  }
}

function created(text: string): Schemas['NoteOut'] {
  return {
    id: '00000000-0000-4000-8000-0000000000e9',
    child_id: LEO,
    child_name: 'Léo Garnier',
    day: '2026-10-30',
    text,
    author: 'Lucas B.',
    created_at: '2026-10-30T15:00:00Z',
  }
}

describe('transmissions du jour (LUN-146)', () => {
  test('les transmissions du jour, sous chaque enfant, les plus récentes d’abord, lisibles en 800 × 600', async ({
    worker,
  }) => {
    const app = start(() => dayNotes)
    worker.use(...app.handlers)
    await page.viewport(800, 600)
    const screen = await app.render()

    const leo = screen.getByRole('region', { name: 'Transmissions de Léo Garnier' })
    const emma = screen.getByRole('region', { name: 'Transmissions de Emma Lambert' })
    await expect.element(leo.getByText(TEXT)).toBeVisible()
    await expect.element(leo.getByText('Arrivé de bonne humeur')).toBeVisible()
    await expect.element(emma.getByText('Un peu fatiguée, à dire aux parents')).toBeVisible()
    await expect.element(leo.getByText('Un peu fatiguée, à dire aux parents')).not.toBeInTheDocument()
    const items = leo.getByRole('listitem').elements()
    expect(items.map((item) => item.textContent)).toEqual([
      `15:05 · Inès M.${TEXT}`,
      '09:00 · Lucas B.Arrivé de bonne humeur',
    ])
    // Jules n'a pas encore de transmission : il a quand même son formulaire.
    await expect
      .element(
        screen
          .getByRole('region', { name: 'Transmissions de Jules Lambert' })
          .getByText('Aucune transmission aujourd’hui.'),
      )
      .toBeVisible()

    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth)
    for (const element of document.querySelectorAll(
      'section[aria-label^="Transmissions"], section[aria-label^="Transmissions"] *',
    )) {
      expect(element.scrollWidth).toBeLessThanOrEqual(element.clientWidth)
    }
  })

  test('ajout : seul le texte part, la transmission apparaît sous Léo et le champ se vide', async ({ worker }) => {
    let notes: Schemas['NoteOut'][] = []
    const sent: unknown[] = []
    const app = start(() => notes)
    worker.use(
      ...app.handlers,
      http.post(WRITE, async ({ request }) => {
        const body = (await request.json()) as { text: string }
        sent.push(body)
        notes = [created(body.text)]
        return HttpResponse.json(notes[0], { status: 201 })
      }),
    )
    const screen = await app.render()
    const leo = screen.getByRole('region', { name: 'Transmissions de Léo Garnier' })
    const field = leo.getByLabelText('Nouvelle transmission pour Léo Garnier')
    await field.fill(`  ${TEXT}  `)
    await leo.getByRole('button', { name: 'Ajouter la transmission' }).click()

    await expect.element(leo.getByText(TEXT)).toBeVisible()
    await expect.element(leo.getByText('16:00 · Lucas B.')).toBeVisible()
    await expect.element(field).toHaveValue('')
    // Heure, jour et auteur : fixés par le serveur, jamais envoyés.
    expect(sent).toEqual([{ text: TEXT }])
  })

  test('saisie refusée par l’API : message sous le champ, saisie gardée', async ({ worker }) => {
    const app = start(() => [])
    worker.use(
      ...app.handlers,
      http.post(WRITE, () => reply(apiErrors.validation({ text: 'Au plus 500 caractères' }))),
    )
    const screen = await app.render()
    const leo = screen.getByRole('region', { name: 'Transmissions de Léo Garnier' })
    const field = leo.getByLabelText('Nouvelle transmission pour Léo Garnier')
    await field.fill(TEXT)
    await leo.getByRole('button', { name: 'Ajouter la transmission' }).click()

    await expect.element(leo.getByText('Au plus 500 caractères')).toBeVisible()
    await expect.element(field).toHaveAttribute('aria-invalid', 'true')
    await expect.element(field).toHaveValue(TEXT)
  })

  test.for([
    { cas: 'panne du serveur (500)', failure: () => reply(apiErrors.serverError('reference-transmission')) },
    { cas: 'coupure réseau', failure: () => networkError() },
  ])(
    '$cas : message sous le formulaire, jamais renvoyée seule, « Réessayer » renvoie la saisie',
    async ({ failure }, { worker }) => {
      let notes: Schemas['NoteOut'][] = []
      let down = true
      const sent: unknown[] = []
      const app = start(() => notes)
      worker.use(
        ...app.handlers,
        http.post(WRITE, async ({ request }) => {
          const body = (await request.json()) as { text: string }
          sent.push(body)
          if (down) return failure()
          notes = [created(body.text)]
          return HttpResponse.json(notes[0], { status: 201 })
        }),
      )
      const screen = await app.render()
      const leo = screen.getByRole('region', { name: 'Transmissions de Léo Garnier' })
      const field = leo.getByLabelText('Nouvelle transmission pour Léo Garnier')
      await field.fill(TEXT)
      await leo.getByRole('button', { name: 'Ajouter la transmission' }).click()

      await expect.element(leo.getByRole('alert')).toBeVisible()
      await expect.element(field).toHaveValue(TEXT)
      // Une écriture n'est jamais rejouée automatiquement (app.tsx) : on laisse le temps d'un éventuel renvoi.
      await new Promise((resolve) => setTimeout(resolve, 1500))
      expect(sent).toHaveLength(1)

      down = false
      await leo.getByRole('button', { name: 'Réessayer' }).click()
      await expect.element(leo.getByText(TEXT, { exact: true })).toBeVisible()
      expect(sent).toEqual([{ text: TEXT }, { text: TEXT }])
    },
  )
})
