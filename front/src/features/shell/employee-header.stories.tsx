import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'

import { navigationFor } from './navigation'
import { EmployeeHeader } from './employee-header'

const meta = {
  title: 'Cadre/En-tête de l’employée',
  component: EmployeeHeader,
  args: {
    navigation: navigationFor('employee', 'n1'),
    activeId: 'accueil',
    user: { name: 'Nina Lopez', roleLabel: 'Équipe' },
    onLogout: fn(),
    logoutPending: false,
  },
} satisfies Meta<typeof EmployeeHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Accueil: Story = {
  play: async ({ canvas, userEvent, args }) => {
    const nav = canvas.getByRole('navigation', { name: 'Menu principal' })
    const links = nav.querySelectorAll('a')
    await expect(links).toHaveLength(3)
    for (const a of links) await expect(a.getBoundingClientRect().height).toBeGreaterThanOrEqual(44)
    const active = canvas.getByRole('link', { name: 'Ma journée' })
    await expect(active).toHaveAttribute('aria-current', 'page')
    await expect(canvas.getByRole('link', { name: 'Présences' })).not.toHaveAttribute('aria-current')
    await expect(canvas.getByRole('link', { name: 'Aide' })).toHaveAttribute('href', '/bientot/aide')
    await userEvent.click(canvas.getByRole('button', { name: /Mon compte, Nina Lopez/ }))
    await userEvent.click(await canvas.findByRole('button', { name: 'Se déconnecter' }))
    await expect(args.onLogout).toHaveBeenCalled()
  },
}

export const PlusieursCreches: Story = {
  args: {
    switcher: (
      <label>
        Crèche
        <select defaultValue="n1">
          <option value="n1">Les Lutins</option>
          <option value="n2">Les Étoiles</option>
        </select>
      </label>
    ),
    activeId: 'presences',
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Crèche')).toBeInTheDocument()
    await expect(canvas.getByRole('link', { name: 'Présences' })).toHaveAttribute('aria-current', 'page')
  },
}
