import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'

import { navigationFor } from './navigation'
import { TopBar } from './top-bar'

const meta = {
  title: 'Cadre/Barre du haut',
  component: TopBar,
  args: {
    navigation: navigationFor('owner', 'n1'),
    onOpen: fn(),
    onToggleMenu: fn(),
    menuOpen: false,
    user: { name: 'Inès Haddad', roleLabel: 'Direction' },
    onLogout: fn(),
    logoutPending: false,
  },
} satisfies Meta<typeof TopBar>

export default meta
type Story = StoryObj<typeof meta>

export const Direction: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await expect(canvas.getByRole('link', { name: 'Aide' })).toHaveAttribute('href', '/bientot/aide')
    await expect(canvas.getAllByText('Direction')[0]).toBeInTheDocument()
    await userEvent.click(canvas.getByRole('button', { name: /Inès Haddad/ }))
    const logout = await canvas.findByRole('button', { name: 'Se déconnecter' })
    await expect(logout).toBeVisible()
    await userEvent.click(logout)
    await expect(args.onLogout).toHaveBeenCalled()
  },
}

export const MenuOuvert: Story = {
  args: { menuOpen: true },
  play: async ({ canvas, userEvent, args }) => {
    const b = canvas.getByRole('button', { name: 'Fermer le menu' })
    await expect(b).toHaveAttribute('aria-expanded', 'true')
    await userEvent.click(b)
    await expect(args.onToggleMenu).toHaveBeenCalled()
  },
}

export const MenuFerme: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Ouvrir le menu' })).toHaveAttribute('aria-expanded', 'false')
  },
}

export const Deconnexion: Story = {
  args: { logoutPending: true },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Inès Haddad/ }))
    await expect(await canvas.findByRole('button', { name: 'Se déconnecter' })).toBeDisabled()
  },
}
