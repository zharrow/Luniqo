import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'

import { PinForm } from './pin-form'

const meta = {
  title: 'Compte/PIN de tablette',
  component: PinForm,
  args: { onSubmit: fn() },
  decorators: [(Story) => <div className="w-96">{Story()}</div>],
} satisfies Meta<typeof PinForm>

export default meta
type Story = StoryObj<typeof meta>

export const Vide: Story = {}

export const EnCours: Story = { args: { pending: true } }

export const PinPrevisible: Story = { args: { error: 'Ce PIN est trop prévisible (suite de chiffres).' } }

export const MotDePasseIncorrect: Story = { args: { error: 'Mot de passe incorrect' } }

/** Saisie vérifiée avant l'envoi : format, confirmation, mot de passe. */
export const SaisieInvalide: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText('Nouveau PIN (4 chiffres)'), '48')
    await userEvent.type(canvas.getByLabelText('Nouveau PIN, une seconde fois'), '4826')
    await userEvent.click(canvas.getByRole('button', { name: 'Enregistrer mon PIN' }))
    await expect(await canvas.findByText('Le PIN doit contenir exactement 4 chiffres.')).toBeVisible()
    await expect(canvas.getByText('Les deux PIN ne correspondent pas.')).toBeVisible()
    await expect(canvas.getByText('Saisissez votre mot de passe actuel.')).toBeVisible()
    await expect(args.onSubmit).not.toHaveBeenCalled()
  },
}

export const Envoi: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText('Nouveau PIN (4 chiffres)'), '4826')
    await userEvent.type(canvas.getByLabelText('Nouveau PIN, une seconde fois'), '4826')
    await userEvent.type(canvas.getByLabelText('Mot de passe actuel'), 'secret')
    await userEvent.click(canvas.getByRole('button', { name: 'Enregistrer mon PIN' }))
    await expect(args.onSubmit).toHaveBeenCalledWith(
      { pin: '4826', confirmation: '4826', password: 'secret' },
      expect.anything(),
    )
  },
}
