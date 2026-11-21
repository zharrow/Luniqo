import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'

import { TODO_NOW, toDoItems } from '../../../test/fixtures'
import { apiErrors, networkFailure, raised } from '../../../test/handlers/errors'
import { rowKey, ToDoList } from './todo-list'

const pin = toDoItems[0]

const meta = {
  title: 'Accueil/À traiter',
  component: ToDoList,
  args: { items: undefined, pending: false, error: null, onUnlock: fn(), now: TODO_NOW },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof ToDoList>

export default meta
type Story = StoryObj<typeof meta>

export const Chargement: Story = {
  args: { pending: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('status')).toHaveTextContent('Chargement de ce qui reste à régler…')
  },
}

/** Rien à régler : ce qui apparaîtra ici, et la créature d'« Aujourd'hui ». */
export const RienARegler: Story = {
  args: { items: [] },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Rien à régler pour l’instant')).toBeVisible()
    await expect(canvas.queryAllByRole('button')).toHaveLength(0)
  },
}

/** Quatre éléments : tous visibles, un seul bouton par ligne. */
export const QuelquesElements: Story = {
  args: { items: toDoItems.slice(0, 4) },
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('listitem')).toHaveLength(4)
    await expect(canvas.getByRole('button', { name: 'Débloquer le PIN de Lucas Bernard' })).toBeVisible()
    await expect(canvas.getByRole('link', { name: /Départ non pointé hier.*Corriger/ })).toHaveAttribute(
      'href',
      '/creches/00000000-0000-4000-8000-0000000000c1/presences/historique?du=2026-11-20&au=2026-11-20',
    )
    await expect(canvas.queryByRole('button', { name: /Voir/ })).toBeNull()
  },
}

/** Sept éléments : cinq lignes, puis « Voir les 2 autres ». */
export const ListeLongue: Story = {
  args: { items: toDoItems },
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('listitem')).toHaveLength(5)
    const more = canvas.getByRole('button', { name: 'Voir les 2 autres' })
    await expect(more).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(more)
    await expect(canvas.getAllByRole('listitem')).toHaveLength(7)
    await expect(canvas.getByRole('button', { name: 'Réduire la liste' })).toHaveAttribute('aria-expanded', 'true')
  },
}

export const DeblocageEnCours: Story = {
  args: { items: toDoItems.slice(0, 3), unlocking: pin?.subject_id ?? null },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Débloquer le PIN de Lucas Bernard' })).toBeDisabled()
    await expect(canvas.getByRole('status')).toHaveTextContent('Déblocage…')
  },
}

export const DeblocageRefuse: Story = {
  args: {
    items: toDoItems.slice(0, 3),
    unlockError: pin === undefined ? null : { key: rowKey(pin), error: raised(apiErrors.serverError()) },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('alert')).toHaveTextContent('Une erreur est survenue de notre côté.')
    await expect(canvas.getByRole('button', { name: 'Débloquer le PIN de Lucas Bernard' })).toBeEnabled()
  },
}

export const ErreurServeur: Story = {
  args: { error: raised(apiErrors.serverError()), onRetry: fn() },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Impossible de charger ce qui reste à régler.')).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Réessayer' })).toBeVisible()
  },
}

export const HorsLigne: Story = {
  args: { error: networkFailure(), onRetry: fn() },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('alert')).toHaveTextContent('Connexion au serveur impossible. Vérifiez le réseau.')
    await expect(canvas.getByRole('button', { name: 'Réessayer' })).toBeVisible()
  },
}
