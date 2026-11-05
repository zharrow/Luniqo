import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'

import { PeriodForm } from './period-form'

const meta = {
  title: 'Présences/Choix de la période',
  component: PeriodForm,
  args: { period: { from: '2026-10-24', to: '2026-10-30' }, today: '2026-10-30', onChange: fn() },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof PeriodForm>

export default meta
type Story = StoryObj<typeof meta>

/** Les 7 derniers jours : le raccourci correspondant est enfoncé. */
export const SeptDerniersJours: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: '7 derniers jours' })).toHaveAttribute('aria-pressed', 'true')
    await expect(canvas.getByRole('button', { name: 'Mois précédent' })).toHaveAttribute('aria-pressed', 'false')
  },
}

/** Un raccourci change la période sans passer par les dates. */
export const MoisPrecedent: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Mois précédent' }))
    await expect(args.onChange).toHaveBeenCalledWith({ from: '2026-09-01', to: '2026-09-30' })
  },
}

export const DatesChoisies: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.clear(canvas.getByLabelText('Du'))
    await userEvent.type(canvas.getByLabelText('Du'), '2026-10-01')
    await userEvent.click(canvas.getByRole('button', { name: 'Afficher' }))
    await expect(args.onChange).toHaveBeenCalledWith({ from: '2026-10-01', to: '2026-10-30' }, expect.anything())
  },
}

/** Plus de 366 jours : refusé avant l'envoi, avec le message de l'API. */
export const PeriodeTropLongue: Story = {
  args: { period: { from: '2025-01-01', to: '2026-10-30' } },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Afficher' }))
    await expect(await canvas.findByText('Période limitée à 366 jours par requête')).toBeVisible()
    await expect(args.onChange).not.toHaveBeenCalled()
  },
}
