import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'

import { ApiError } from '@/api/errors'

import { dayAttendance } from '../../../test/fixtures'
import { DayBoard } from './day-board'

const meta = {
  title: 'Présences/Tableau du jour',
  component: DayBoard,
  args: { presences: dayAttendance, pending: false, error: null },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof DayBoard>

export default meta
type Story = StoryObj<typeof meta>

/** Heures de Paris (07:45 UTC = 08:45 en heure d'hiver), personnes de la famille et employés qui ont pointé. */
export const Journee: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Présents en ce moment').nextElementSibling).toHaveTextContent('2')
    const jules = canvas.getByRole('row', { name: /Jules Lambert/ })
    await expect(jules).toHaveTextContent('09:10')
    await expect(jules).toHaveTextContent('12:30parti·e avec Jeanne L.pointé par Lucas B.')
    await expect(canvas.getByRole('row', { name: /Léo Garnier/ })).toHaveTextContent('amené·e par Alice G.')
  },
}

export const Chargement: Story = { args: { presences: undefined, pending: true } }

export const AucunPointage: Story = { args: { presences: [] } }

export const Erreur: Story = {
  args: { presences: undefined, error: new ApiError(404, 'Crèche introuvable') },
}
