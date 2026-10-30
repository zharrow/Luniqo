import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'

import { tabletInfo } from '../../../test/fixtures'
import { StaffPicker } from './staff-picker'

const meta = {
  title: "Mode tablette/Choix de l'employé",
  component: StaffPicker,
  args: { staff: tabletInfo.staff, onSelect: fn() },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof StaffPicker>

export default meta
type Story = StoryObj<typeof meta>

/** Seul l'employé qui a un PIN utilisable peut être choisi ; les autres voient pourquoi. */
export const Liste: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByRole('button', { name: /Inès M\./ })).toBeDisabled()
    await expect(canvas.getByRole('button', { name: /Nora P\./ })).toHaveAccessibleDescription(
      'PIN bloqué : la direction le débloque',
    )
    await userEvent.click(canvas.getByRole('button', { name: 'Lucas B.' }))
    await expect(args.onSelect).toHaveBeenCalledWith(tabletInfo.staff[0])
  },
}

export const Vide: Story = { args: { staff: [] } }
