import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'

import { CodeForm } from './code-form'

const meta = {
  title: 'Authentification/Code du second facteur',
  component: CodeForm,
  args: { onSubmit: fn() },
  decorators: [(Story) => <div className="w-80">{Story()}</div>],
} satisfies Meta<typeof CodeForm>

export default meta
type Story = StoryObj<typeof meta>

export const Vide: Story = {}

export const CodeInvalide: Story = { args: { error: 'Code invalide' } }

export const Activation: Story = { args: { label: "Code affiché par l'application", submitLabel: 'Activer' } }

export const Envoi: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText('Code à 6 chiffres ou code de secours'), '123456')
    await userEvent.click(canvas.getByRole('button', { name: 'Valider' }))
    await expect(args.onSubmit).toHaveBeenCalledWith({ code: '123456' }, expect.anything())
  },
}
