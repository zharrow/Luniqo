import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'

import { GuardianTabs } from './guardian-tabs'
import { navigationFor } from './navigation'

const meta = {
  title: 'Cadre/Onglets du parent',
  component: GuardianTabs,
  args: { navigation: navigationFor('guardian', null), activeId: 'accueil' },
} satisfies Meta<typeof GuardianTabs>

export default meta
type Story = StoryObj<typeof meta>

export const Accueil: Story = {
  play: async ({ canvas }) => {
    const nav = canvas.getByRole('navigation', { name: 'Menu principal' })
    const links = nav.querySelectorAll('a')
    await expect(links).toHaveLength(5)
    for (const a of links) await expect(a.getBoundingClientRect().height).toBeGreaterThanOrEqual(56)
    await expect(canvas.getByRole('link', { name: 'Accueil' })).toHaveAttribute('aria-current', 'page')
    await expect(canvas.getByRole('link', { name: 'Messages' })).not.toHaveAttribute('aria-current')
    await expect(getComputedStyle(canvas.getByRole('link', { name: 'Accueil' })).borderTopWidth).toBe('3px')
  },
}

export const Messages: Story = {
  args: { activeId: 'messages' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: 'Messages' })).toHaveAttribute('aria-current', 'page')
  },
}
