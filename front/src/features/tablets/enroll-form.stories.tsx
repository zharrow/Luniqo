import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'

import { EnrollForm } from './enroll-form'

const meta = {
  title: 'Tablettes/Enrôler cet appareil',
  component: EnrollForm,
  args: { onSubmit: fn() },
  decorators: [(Story) => <div className="w-96">{Story()}</div>],
} satisfies Meta<typeof EnrollForm>

export default meta
type Story = StoryObj<typeof meta>

export const Vide: Story = {}

export const EnCours: Story = { args: { pending: true } }

export const RefusParLApi: Story = { args: { error: 'Seule la direction peut gérer cette crèche' } }

/** Nom vide : message sous le champ, rien n'est envoyé. */
export const NomManquant: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText('Nom de la tablette'), '   ')
    await userEvent.click(canvas.getByRole('button', { name: 'Enrôler cet appareil' }))
    await expect(await canvas.findByText('Donnez un nom à la tablette.')).toBeVisible()
    await expect(args.onSubmit).not.toHaveBeenCalled()
  },
}

export const Envoi: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText('Nom de la tablette'), " Tablette de l'entrée ")
    await userEvent.click(canvas.getByRole('button', { name: 'Enrôler cet appareil' }))
    await expect(args.onSubmit).toHaveBeenCalledWith({ label: "Tablette de l'entrée" }, expect.anything())
  },
}
