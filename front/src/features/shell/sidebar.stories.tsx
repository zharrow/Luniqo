import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'

import { navigationFor } from './navigation'
import { Sidebar } from './sidebar'

const NURSERY = '00000000-0000-4000-8000-0000000000c1'

const meta = {
  title: 'Cadre/Menu latéral',
  component: Sidebar,
  args: {
    navigation: navigationFor('owner', NURSERY),
    activeId: 'presences',
    collapsed: new Set(),
    onToggle: fn(),
    version: '2.0.0',
  },
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="h-screen w-64">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Sidebar>

export default meta
type Story = StoryObj<typeof meta>

export const Direction: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: 'Présences' })).toHaveAttribute('aria-current', 'page')
    await expect(canvas.getByRole('navigation', { name: 'Menu principal' })).toBeInTheDocument()
  },
}

export const GroupesReplies: Story = {
  args: { collapsed: new Set(['places'] as const) },
  play: async ({ canvas, userEvent, args }) => {
    const button = canvas.getByRole('button', { name: /Lieux et hygiène/ })
    await expect(button).toHaveAttribute('aria-expanded', 'false')
    await expect(button).toHaveTextContent('3')
    await userEvent.click(button)
    await expect(args.onToggle).toHaveBeenCalledWith('places')
  },
}

export const Editeur: Story = {
  args: { navigation: navigationFor('developer', null), activeId: null },
}

export const SansCreche: Story = {
  args: { navigation: navigationFor('owner', null), activeId: null },
}

export const Employee: Story = {
  args: { navigation: navigationFor('employee', NURSERY), activeId: 'presences' },
  play: async ({ canvas }) => {
    await expect(canvas.queryAllByRole('button', { expanded: true })).toHaveLength(0)
  },
}
