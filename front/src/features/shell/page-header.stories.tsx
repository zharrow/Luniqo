import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'

import { PageHeader } from './page-header'

const tabs = [
  { label: "Aujourd'hui", href: '/presences', current: true },
  { label: 'Historique', href: '/presences/historique', current: false },
]

const meta = {
  title: 'Cadre/En-tête de page',
  component: PageHeader,
  args: {
    title: 'Présences',
    kicker: 'Vendredi 20 novembre',
    breadcrumb: ['Aujourd’hui', 'Présences'],
    tabs,
    actions: (
      <button type="button" className="min-h-11 rounded-md border px-4 font-semibold">
        Exporter
      </button>
    ),
  },
} satisfies Meta<typeof PageHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Complet: Story = {
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByRole('heading', { level: 1, name: 'Présences' })).toBeInTheDocument()
    await expect(canvas.getByText('Vendredi 20 novembre')).toBeInTheDocument()
    const crumbs = canvas.getByRole('navigation', { name: "Fil d'Ariane" })
    await expect(crumbs).toHaveTextContent('Présences')
    await expect(canvas.getByText('Présences', { selector: '[aria-current="page"]' })).toBeInTheDocument()
    const sub = canvas.getByRole('navigation', { name: 'Sous-pages' })
    await expect(sub).toBeInTheDocument()
    await expect(canvas.getByRole('link', { name: "Aujourd'hui" })).toHaveAttribute('aria-current', 'page')
    await expect(canvas.getByRole('link', { name: 'Historique' })).not.toHaveAttribute('aria-current')
    await expect(canvas.getByRole('button', { name: 'Exporter' })).toBeInTheDocument()
    await userEvent.tab()
    await userEvent.tab()
    await expect(canvas.getByRole('link', { name: "Aujourd'hui" })).toHaveFocus()
  },
}

export const SansOnglets: Story = {
  args: { tabs: undefined, breadcrumb: undefined, kicker: undefined, actions: undefined },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 1, name: 'Présences' })).toBeInTheDocument()
    await expect(canvas.queryByRole('navigation', { name: 'Sous-pages' })).not.toBeInTheDocument()
    await expect(canvas.queryByRole('navigation', { name: "Fil d'Ariane" })).not.toBeInTheDocument()
  },
}

export const Etroit: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: 375 }} data-testid="frame">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas }) => {
    const root = canvas.getByRole('heading', { level: 1 }).closest('header') as HTMLElement
    await expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth)
  },
}
