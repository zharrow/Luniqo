import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'

import { LoginForm } from './login-form'

const meta = {
  title: 'Authentification/Formulaire de connexion',
  component: LoginForm,
  args: { onSubmit: fn() },
  decorators: [(Story) => <div className="w-80">{Story()}</div>],
} satisfies Meta<typeof LoginForm>

export default meta
type Story = StoryObj<typeof meta>

export const Vide: Story = {}

export const EnCours: Story = { args: { pending: true } }

export const RefusParLApi: Story = { args: { error: 'Identifiants invalides' } }

export const TropDeTentatives: Story = {
  args: { error: 'Trop de tentatives, réessayez plus tard (dans 15 minutes)' },
}

/** Champs vides : messages sous les champs, rien n'est envoyé. */
export const SaisieIncomplete: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Se connecter' }))
    await expect(await canvas.findByText('Saisissez votre adresse e-mail.')).toBeVisible()
    await expect(canvas.getByText('Saisissez votre mot de passe.')).toBeVisible()
    await expect(args.onSubmit).not.toHaveBeenCalled()
  },
}

export const Envoi: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText('Adresse e-mail'), ' employe@demo.test ')
    await userEvent.type(canvas.getByLabelText('Mot de passe'), 'secret')
    await userEvent.click(canvas.getByRole('button', { name: 'Se connecter' }))
    await expect(args.onSubmit).toHaveBeenCalledWith(
      { email: 'employe@demo.test', password: 'secret' },
      expect.anything(),
    )
  },
}
