import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'

import { PinPad } from './pin-pad'

const meta = {
  title: 'Mode tablette/PIN',
  component: PinPad,
  args: { name: 'Lucas B.', onSubmit: fn(), onCancel: fn() },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof PinPad>

export default meta
type Story = StoryObj<typeof meta>

/** Pavé tactile : envoi dès le 4e chiffre, sans bouton à presser. */
export const Pave: Story = {
  play: async ({ args, canvas, userEvent }) => {
    for (const digit of ['4', '8', '2']) await userEvent.click(canvas.getByRole('button', { name: digit }))
    await expect(args.onSubmit).not.toHaveBeenCalled()
    await userEvent.click(canvas.getByRole('button', { name: 'Effacer le dernier chiffre' }))
    await userEvent.click(canvas.getByRole('button', { name: '2' }))
    await userEvent.click(canvas.getByRole('button', { name: '6' }))
    await expect(args.onSubmit).toHaveBeenCalledWith('4826')
  },
}

/** Clavier physique : seuls les chiffres comptent. */
export const Clavier: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText('PIN de Lucas B.'), '4a8-26')
    await expect(args.onSubmit).toHaveBeenCalledWith('4826')
  },
}

export const Retour: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Retour' }))
    await expect(args.onCancel).toHaveBeenCalled()
  },
}

export const EnCours: Story = { args: { pending: true } }

export const PinIncorrect: Story = { args: { error: 'PIN incorrect' } }

export const TropDErreurs: Story = {
  args: { error: "Trop d'erreurs de PIN sur cette tablette, réessayez plus tard" },
}
