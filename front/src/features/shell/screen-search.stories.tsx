import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'

import { navigationFor } from './navigation'
import { ScreenSearch } from './screen-search'

const meta = {
  title: 'Cadre/Recherche des écrans',
  component: ScreenSearch,
  args: { navigation: navigationFor('owner', 'n1'), onOpen: fn() },
  decorators: [
    (Story) => (
      <div className="w-96 p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ScreenSearch>

export default meta
type Story = StoryObj<typeof meta>

export const Repos: Story = {
  play: async ({ canvas }) => {
    const box = canvas.getByRole('combobox')
    await expect(box).toHaveAttribute('aria-expanded', 'false')
    await expect(box).toHaveAttribute('placeholder', 'Rechercher un écran')
  },
}

export const Recherche: Story = {
  play: async ({ canvas, userEvent, args }) => {
    const box = canvas.getByRole('combobox')
    await userEvent.type(box, 'haccp')
    await expect(box).toHaveAttribute('aria-expanded', 'true')
    await expect(canvas.getByRole('option', { name: /HACCP/ })).toBeInTheDocument()
    await userEvent.keyboard('{Enter}')
    await expect(args.onOpen).toHaveBeenCalledWith('/creches/n1/bientot/haccp')
    await expect(box).toHaveValue('')
  },
}

export const Clavier: Story = {
  play: async ({ canvas, userEvent, args }) => {
    const box = canvas.getByRole('combobox')
    await userEvent.type(box, 'e')
    const options = canvas.getAllByRole('option')
    await expect(options.length).toBeGreaterThan(1)
    await expect(box).toHaveAttribute('aria-activedescendant', options[0]?.id)
    await userEvent.keyboard('{ArrowDown}')
    await expect(box).toHaveAttribute('aria-activedescendant', options[1]?.id)
    await userEvent.keyboard('{Enter}')
    await expect(args.onOpen).toHaveBeenCalledTimes(1)
  },
}

export const ClicSurUneOption: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.type(canvas.getByRole('combobox'), 'haccp')
    await userEvent.click(canvas.getByRole('option', { name: /HACCP/ }))
    await expect(args.onOpen).toHaveBeenCalledWith('/creches/n1/bientot/haccp')
  },
}

export const AucunResultat: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByRole('combobox'), 'zzzz')
    await expect(canvas.getByText('Aucun écran ne correspond')).toBeInTheDocument()
    await expect(canvas.queryByRole('option')).toBeNull()
  },
}

export const RaccourciCtrlK: Story = {
  play: async ({ canvas, userEvent }) => {
    const box = canvas.getByRole('combobox')
    await userEvent.keyboard('{Control>}k{/Control}')
    await expect(box).toHaveFocus()
    await userEvent.type(box, 'haccp')
    await expect(box).toHaveValue('haccp')
    await userEvent.keyboard('{Escape}')
    await expect(box).toHaveValue('')
    await expect(box).toHaveAttribute('aria-expanded', 'false')
  },
}
