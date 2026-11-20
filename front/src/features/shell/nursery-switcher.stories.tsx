import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'

import { NurserySwitcher } from './nursery-switcher'

const A = { id: '00000000-0000-4000-8000-0000000000c1', name: 'Bee a Baby Escalquens' }
const B = { id: '00000000-0000-4000-8000-0000000000c2', name: 'Les Petits Lutins' }

const meta = {
  title: 'Cadre/Choix de la crèche',
  component: NurserySwitcher,
  args: { nurseries: [A], current: A.id, showGroup: false, onSelect: fn() },
  decorators: [
    (Story) => (
      <div className="w-64 p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NurserySwitcher>

export default meta
type Story = StoryObj<typeof meta>

export const UneCreche: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText(A.name)).toBeInTheDocument()
    await expect(canvas.queryByRole('combobox')).toBeNull()
  },
}

export const Plusieurs: Story = {
  args: { nurseries: [A, B] },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.selectOptions(canvas.getByRole('combobox', { name: 'Crèche' }), B.id)
    await expect(args.onSelect).toHaveBeenCalledWith(B.id)
  },
}

export const AvecGroupe: Story = {
  args: { nurseries: [A, B], current: 'group', showGroup: true },
  play: async ({ canvas, userEvent, args }) => {
    const select = canvas.getByRole('combobox', { name: 'Crèche' })
    await expect(canvas.getByRole('option', { name: 'Tout le groupe' })).toBeInTheDocument()
    await userEvent.selectOptions(select, A.id)
    await expect(args.onSelect).toHaveBeenCalledWith(A.id)
  },
}

export const Introuvable: Story = {
  args: { nurseries: [A, B], current: '00000000-0000-4000-8000-0000000000ff' },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Crèche introuvable')).toBeInTheDocument()
  },
}

export const Vide: Story = {
  args: { nurseries: [], current: null },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('combobox')).toBeNull()
    await expect(canvas.queryByText('Crèche')).toBeNull()
  },
}
