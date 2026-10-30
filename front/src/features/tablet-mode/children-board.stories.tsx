import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'

import { tabletChildren } from '../../../test/fixtures'
import { ChildrenBoard } from './children-board'

const meta = {
  title: 'Mode tablette/Enfants du jour',
  component: ChildrenBoard,
  args: { expected: tabletChildren, onSelect: fn() },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof ChildrenBoard>

export default meta
type Story = StoryObj<typeof meta>

/** Rangés par état, heures de Paris (07:45 UTC = 08:45 en heure d'hiver). */
export const Liste: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByRole('heading', { name: 'À accueillir (1)' })).toBeVisible()
    await expect(canvas.getByRole('button', { name: /Emma Lambert/ })).toHaveTextContent('Arrivé·e à 08:45')
    await expect(canvas.getByRole('button', { name: /Jules Lambert/ })).toHaveTextContent('Parti·e à 12:30')
    await userEvent.click(canvas.getByRole('button', { name: /Léo Garnier/ }))
    await expect(args.onSelect).toHaveBeenCalledWith(tabletChildren[0])
  },
}

export const Vide: Story = { args: { expected: [] } }
