import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'

import { ComingSoon } from './coming-soon'
import { soonModule, type SoonModule } from './navigation'

function moduleOf(slug: string): SoonModule {
  const found = soonModule(slug)
  if (!found) throw new Error(`module ${slug} absent`)
  return found
}

const haccp = moduleOf('haccp')

const meta = {
  title: 'Cadre/Page bientôt',
  component: ComingSoon,
  args: { module: haccp },
} satisfies Meta<typeof ComingSoon>

export default meta
type Story = StoryObj<typeof meta>

/** La créature de la famille du module, décorative, avec son saut d'apparition. */
async function expectCreature(canvasElement: HTMLElement, module: SoonModule) {
  const creature = canvasElement.querySelector('svg')
  await expect(creature).toHaveAttribute('data-family', module.family)
  await expect(creature).toHaveAttribute('aria-hidden', 'true')
  await expect(creature).toHaveAttribute('height', '120')
  await expect(creature?.querySelector('.creature-hop')).not.toBeNull()
}

export const Haccp: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByRole('heading', { level: 1, name: haccp.title })).toBeInTheDocument()
    await expect(canvas.getByText('Ce module arrive dans Luniqo.')).toBeInTheDocument()
    await expect(canvas.getByText(haccp.description)).toBeInTheDocument()
    await expect(canvas.queryByRole('button')).not.toBeInTheDocument()
    await expect(canvas.queryByRole('img')).not.toBeInTheDocument()
    await expectCreature(canvasElement, haccp)
  },
}

export const Familles: Story = {
  args: { module: moduleOf('familles') },
  play: async ({ canvasElement, args }) => expectCreature(canvasElement, args.module),
}

export const Personnel: Story = {
  args: { module: moduleOf('personnel') },
  play: async ({ canvasElement, args }) => expectCreature(canvasElement, args.module),
}

export const Facturation: Story = {
  args: { module: moduleOf('facturation') },
  play: async ({ canvasElement, args }) => expectCreature(canvasElement, args.module),
}

export const Transmissions: Story = {
  args: { module: moduleOf('transmissions') },
  play: async ({ canvasElement, args }) => expectCreature(canvasElement, args.module),
}

/** Le texte garde sa place : la créature ne le recouvre jamais. */
export const TexteDegage: Story = {
  play: async ({ canvas, canvasElement }) => {
    const title = canvas.getByRole('heading', { level: 1, name: haccp.title })
    const creature = canvasElement.querySelector('svg')
    await expect(creature).not.toBeNull()
    if (!creature) return
    await expect(title.getBoundingClientRect().right).toBeLessThanOrEqual(creature.getBoundingClientRect().left)
  },
}
