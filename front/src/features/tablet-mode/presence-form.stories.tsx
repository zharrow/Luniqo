import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'

import { tabletChildren } from '../../../test/fixtures'
import { PresenceForm } from './presence-form'

const [absent, present] = tabletChildren as [(typeof tabletChildren)[number], (typeof tabletChildren)[number]]

const meta = {
  title: 'Mode tablette/Pointer un enfant',
  component: PresenceForm,
  args: { child: absent, onSubmit: fn(), onCancel: fn() },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof PresenceForm>

export default meta
type Story = StoryObj<typeof meta>

/** Arrivée : la personne qui amène l'enfant est facultative. */
export const Arrivee: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByRole('radio', { name: 'Ne pas préciser' })).toBeChecked()
    await userEvent.click(canvas.getByRole('button', { name: "Pointer l'arrivée" }))
    await expect(args.onSubmit).toHaveBeenLastCalledWith(null)
    await userEvent.click(canvas.getByRole('radio', { name: /Karim G\./ }))
    await userEvent.click(canvas.getByRole('button', { name: "Pointer l'arrivée" }))
    await expect(args.onSubmit).toHaveBeenLastCalledWith('00000000-0000-4000-8000-0000000000f2')
  },
}

/** Départ : choix obligatoire, parmi les personnes autorisées seulement. */
export const Depart: Story = {
  args: { child: present },
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByRole('button', { name: 'Pointer le départ' })).toBeDisabled()
    await expect(canvas.getByRole('radio', { name: /Jeanne L\./ })).toBeDisabled()
    await expect(canvas.getByText('Non autorisé·e : prévenir la direction')).toBeVisible()
    await userEvent.click(canvas.getByRole('radio', { name: /Sophie L\./ }))
    await userEvent.click(canvas.getByRole('button', { name: 'Pointer le départ' }))
    await expect(args.onSubmit).toHaveBeenCalledWith('00000000-0000-4000-8000-0000000000f3')
  },
}

export const EnCours: Story = { args: { pending: true } }

export const RefusParLApi: Story = {
  args: {
    child: present,
    error: "Cette personne n'est pas autorisée à venir chercher l'enfant : prévenir la direction",
  },
}

export const DepartSansResponsable: Story = { args: { child: { ...present, guardians: [] } } }
