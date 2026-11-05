import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'

import { ApiError } from '@/api/errors'

import { periodAttendance } from '../../../test/fixtures'
import { HistoryBoard } from './history-board'

const meta = {
  title: 'Présences/Historique',
  component: HistoryBoard,
  args: { presences: periodAttendance, today: '2026-10-30', pending: false, error: null },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof HistoryBoard>

export default meta
type Story = StoryObj<typeof meta>

/** Vu le 30 octobre : Léo n'est pas reparti le 28 (oubli), Léo et Emma sont encore là le 30 (présents). */
export const Periode: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Enfants accueillis').nextElementSibling).toHaveTextContent('3')
    await expect(canvas.getByText('Départs non pointés').nextElementSibling).toHaveTextContent('1')
    const days = canvas.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)
    await expect(days).toEqual(['Mercredi 28 octobre 2026', 'Jeudi 29 octobre 2026', 'Vendredi 30 octobre 2026'])
    const wednesday = canvas.getByRole('region', { name: 'Mercredi 28 octobre 2026' })
    await expect(wednesday.querySelector('tbody')).toHaveTextContent('Départ non pointé')
    const friday = canvas.getByRole('region', { name: 'Vendredi 30 octobre 2026' })
    await expect(friday.querySelector('tbody')).not.toHaveTextContent('Départ non pointé')
    await expect(friday.querySelector('tbody')).toHaveTextContent('Présent·e')
  },
}

export const Chargement: Story = { args: { presences: undefined, pending: true } }

export const AucunePresence: Story = { args: { presences: [] } }

export const Erreur: Story = {
  args: { presences: undefined, error: new ApiError(422, 'Période limitée à 366 jours par requête') },
}
