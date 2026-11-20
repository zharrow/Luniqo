import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'

import { dayNotes } from '../../../test/fixtures'
import { apiErrors, networkFailure, raised } from '../../../test/handlers/errors'
import { ChildNotes } from './child-notes'

const leo = dayNotes.filter((note) => note.child_name === 'Léo Garnier')

const meta = {
  title: 'Transmissions/Transmissions d’un enfant',
  component: ChildNotes,
  args: { childName: 'Léo Garnier', notes: [], onSubmit: fn(), pending: false, error: null },
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ChildNotes>

export default meta
type Story = StoryObj<typeof meta>

export const Aucune: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Aucune transmission aujourd’hui.')).toBeVisible()
    // Rappel des données de santé (LUN-57), relié au champ.
    await expect(canvas.getByLabelText('Nouvelle transmission pour Léo Garnier')).toHaveAccessibleDescription(
      'Pas d’information médicale (allergies, traitements). 500 caractères au plus.',
    )
  },
}

/** Les plus récentes d'abord, avec l'heure (Paris) et l'auteur. */
export const Plusieurs: Story = {
  args: { notes: leo },
  play: async ({ canvas }) => {
    const items = canvas.getAllByRole('listitem')
    await expect(items).toHaveLength(2)
    await expect(items[0]).toHaveTextContent('15:05 · Inès M.')
    await expect(items[0]).toHaveTextContent('A bien mangé, sieste de 13 h à 15 h')
    await expect(items[1]).toHaveTextContent('09:00 · Lucas B.')
  },
}

/** Saisie vide (espaces compris) : refusée avant l'envoi, message sous le champ. */
export const SaisieVide: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.type(canvas.getByLabelText('Nouvelle transmission pour Léo Garnier'), '   ')
    await userEvent.click(canvas.getByRole('button', { name: 'Ajouter la transmission' }))
    await expect(canvas.getByText('La transmission ne peut pas être vide')).toBeVisible()
    await expect(args.onSubmit).not.toHaveBeenCalled()
  },
}

/** Saisie refusée par l'API (422) : message sous le champ, saisie gardée. */
export const SaisieRefusee: Story = {
  args: { error: raised(apiErrors.validation({ text: 'Au plus 500 caractères' })) },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Nouvelle transmission pour Léo Garnier')).toHaveAccessibleDescription(
      /Au plus 500 caractères/,
    )
    await expect(canvas.queryByRole('button', { name: 'Réessayer' })).toBeNull()
  },
}

export const Envoi: Story = {
  args: { notes: leo, pending: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Envoi…' })).toBeDisabled()
  },
}

/** Exception imprévue côté serveur (500) : message et « Réessayer », jamais de renvoi automatique. */
export const ErreurServeur: Story = {
  args: { notes: leo, error: raised(apiErrors.serverError()), onRetry: fn() },
  play: async ({ args, canvas }) => {
    await expect(canvas.getByRole('alert')).toHaveTextContent('Une erreur est survenue de notre côté.')
    await userEvent.click(canvas.getByRole('button', { name: 'Réessayer' }))
    await expect(args.onRetry).toHaveBeenCalledOnce()
  },
}

/** Coupure réseau : aucune réponse de l'API. */
export const HorsLigne: Story = {
  args: { notes: leo, error: networkFailure(), onRetry: fn() },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('alert')).toHaveTextContent('Connexion au serveur impossible. Vérifiez le réseau.')
    await expect(canvas.getByRole('button', { name: 'Réessayer' })).toBeVisible()
  },
}
