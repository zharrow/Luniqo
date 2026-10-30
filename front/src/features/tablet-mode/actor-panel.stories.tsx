import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'

import { tabletActor } from '../../../test/fixtures'
import { ActorPanel } from './actor-panel'

const meta = {
  title: 'Mode tablette/Employé identifié',
  component: ActorPanel,
  args: { actor: tabletActor, onEnd: fn() },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof ActorPanel>

export default meta
type Story = StoryObj<typeof meta>

/** Fin de session en heure de Paris (09:32 UTC = 10:32 en heure d'hiver). */
export const Identifie: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByText("Identifié·e jusqu'à 10:32")).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Terminer' }))
    await expect(args.onEnd).toHaveBeenCalled()
  },
}

export const FinEnCours: Story = { args: { ending: true } }
