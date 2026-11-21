import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'

import { Creature, LogoMark } from './creature'
import { FAMILIES, type FamilyId } from './families'

const FAMILY_IDS = Object.keys(FAMILIES) as FamilyId[]
const SIZES = [24, 48, 160]

const meta = {
  title: 'Cadre/Personnage',
  component: Creature,
  args: { family: 'today', size: 160 },
} satisfies Meta<typeof Creature>

export default meta
type Story = StoryObj<typeof meta>

/** Les cinq familles, à 24, 48 et 160 px de haut. */
export const Familles: Story = {
  render: () => (
    <div className="grid gap-6">
      {FAMILY_IDS.map((family) => (
        <div key={family} className="flex items-end gap-6">
          <span className="w-36 text-sm font-semibold text-[#1e2430]">{FAMILIES[family].label}</span>
          {SIZES.map((size) => (
            <Creature key={size} family={family} size={size} />
          ))}
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const svgs = canvasElement.querySelectorAll('svg')
    await expect(svgs).toHaveLength(FAMILY_IDS.length * SIZES.length)
    for (const svg of svgs) {
      await expect(svg).toHaveAttribute('aria-hidden', 'true')
      await expect(svg).toHaveAttribute('focusable', 'false')
      await expect(svg.querySelector('.creature-hop')).toBeNull()
    }
    // Un masque par instance : quinze créatures, quinze identifiants différents.
    const masks = [...canvasElement.querySelectorAll('mask')].map((m) => m.id)
    await expect(new Set(masks).size).toBe(svgs.length)
    for (const size of SIZES) {
      const ofSize = [...svgs].filter((svg) => svg.getAttribute('height') === String(size))
      await expect(ofSize).toHaveLength(FAMILY_IDS.length)
    }
  },
}

/** Le croissant est découpé, pas peint : il reste juste sur un fond de couleur. */
export const SurFondDeCouleur: Story = {
  render: () => (
    <div className="flex items-end gap-6 bg-[#1e2430] p-6">
      {FAMILY_IDS.map((family) => (
        <Creature key={family} family={family} size={120} />
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    for (const svg of canvasElement.querySelectorAll('svg')) {
      const mask = svg.querySelector('mask')
      await expect(mask).not.toBeNull()
      await expect(svg.querySelector(`[mask="url(#${mask?.id})"]`)).not.toBeNull()
    }
  },
}

/** Saut à l'apparition : la classe d'animation n'est posée que si `hop` est demandé. */
export const Saut: Story = {
  args: { family: 'places', size: 160, hop: true },
  play: async ({ canvasElement }) => {
    const svg = canvasElement.querySelector('svg')
    await expect(svg).toHaveAttribute('aria-hidden', 'true')
    const group = svg?.querySelector('.creature-hop')
    await expect(group).not.toBeNull()
    if (!group) return
    const style = getComputedStyle(group)
    await expect(style.animationName).toBe('creature-hop')
    await expect(style.animationIterationCount).toBe('1')
  },
}

export const SansSaut: Story = {
  args: { family: 'places', size: 160, hop: false },
  play: async ({ canvasElement }) => {
    const svg = canvasElement.querySelector('svg')
    await expect(svg).toHaveAttribute('aria-hidden', 'true')
    await expect(svg?.querySelector('.creature-hop')).toBeNull()
  },
}

/** Marque : version réduite (sans pattes) sous 32 px, créature entière au-dessus ; jamais de saut. */
export const Logo: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <span className="flex items-center gap-2">
        <LogoMark size={24} />
        <span className="text-base font-bold text-[#1e2430]">Luniqo</span>
      </span>
      <span className="flex items-center gap-2">
        <LogoMark size={40} />
        <span className="text-lg font-bold text-[#1e2430]">Luniqo</span>
      </span>
    </div>
  ),
  play: async ({ canvas, canvasElement }) => {
    const [small, full] = canvasElement.querySelectorAll('svg')
    await expect(small).toHaveAttribute('width', '24')
    await expect(small).toHaveAttribute('data-variant', 'small')
    await expect(full).toHaveAttribute('width', '40')
    await expect(full).toHaveAttribute('data-variant', 'full')
    for (const svg of [small, full]) {
      await expect(svg).toHaveAttribute('aria-hidden', 'true')
      await expect(svg?.querySelector('.creature-hop')).toBeNull()
    }
    // Petite version : corps, œil, croissant, sans pattes ; la grande en a deux.
    await expect(small?.querySelectorAll('rect')).toHaveLength(1)
    await expect(full?.querySelectorAll('rect')).toHaveLength(3)
    await expect(canvas.getAllByText('Luniqo')).toHaveLength(2)
  },
}
