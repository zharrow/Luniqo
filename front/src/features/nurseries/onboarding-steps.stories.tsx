import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'

import { nurseryOnboarding } from '../../../test/fixtures'
import { apiErrors, networkFailure, raised } from '../../../test/handlers/errors'
import { OnboardingSteps } from './onboarding-steps'

// Liens fournis par la route dans l'application (TanStack Router) : de simples ancres ici.
const howTo = {
  tablet: <a href="#tablettes">Aller aux tablettes</a>,
  first_attendance: <a href="#presences">Aller aux présences du jour</a>,
}

const none = nurseryOnboarding.steps.map((step) => ({ ...step, achieved: false, achieved_at: null }))

const meta = {
  title: 'Crèches/Mise en route',
  component: OnboardingSteps,
  args: { onboarding: undefined, pending: false, error: null, howTo },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof OnboardingSteps>

export default meta
type Story = StoryObj<typeof meta>

export const Chargement: Story = {
  args: { pending: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('status')).toHaveTextContent('Chargement de la mise en route…')
  },
}

/** Crèche neuve : aucun succès, chaque étape dit comment l'obtenir. */
export const AucunSucces: Story = {
  args: { onboarding: { steps: none } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('0 succès sur 3')).toBeVisible()
    await expect(canvas.getByText('Donnez à un employé l’accès à cette crèche.')).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Aller aux tablettes' })).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Aller aux présences du jour' })).toBeVisible()
  },
}

/** Personnel et tablette obtenus, chacun daté ; il manque le premier pointage. */
export const Partiel: Story = {
  args: { onboarding: nurseryOnboarding },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('2 succès sur 3')).toBeVisible()
    await expect(canvas.getByText('Obtenu le 3 novembre 2026')).toBeVisible()
    await expect(canvas.getByText('Obtenu le 4 novembre 2026')).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Aller aux présences du jour' })).toBeVisible()
    await expect(canvas.queryByRole('link', { name: 'Aller aux tablettes' })).toBeNull()
  },
}

export const TousLesSucces: Story = {
  args: {
    onboarding: {
      steps: nurseryOnboarding.steps.map((step) =>
        step.achieved ? step : { ...step, achieved: true, achieved_at: '2026-11-17T07:45:00Z' },
      ),
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Mise en route terminée : 3 succès sur 3')).toBeVisible()
    await expect(canvas.queryAllByRole('link')).toHaveLength(0)
  },
}

/** Exception imprévue côté serveur (500), après les nouveaux essais automatiques de la lecture. */
export const ErreurServeur: Story = {
  args: { error: raised(apiErrors.serverError()), onRetry: () => undefined },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Impossible de charger la mise en route.')).toBeVisible()
    await expect(canvas.getByRole('alert')).toHaveTextContent('Une erreur est survenue de notre côté.')
    await expect(canvas.getByRole('button', { name: 'Réessayer' })).toBeVisible()
  },
}

/** Coupure réseau : aucune réponse de l'API. */
export const HorsLigne: Story = {
  args: { error: networkFailure(), onRetry: () => undefined },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('alert')).toHaveTextContent('Connexion au serveur impossible. Vérifiez le réseau.')
    await expect(canvas.getByRole('button', { name: 'Réessayer' })).toBeVisible()
  },
}
