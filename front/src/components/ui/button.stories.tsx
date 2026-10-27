import type { Meta, StoryObj } from '@storybook/react-vite'
import { LogOut } from 'lucide-react'

import { Button } from './button'

/** Bouton de shadcn/ui aux couleurs « Douceur Professionnelle ». */
const meta = {
  title: 'Interface/Bouton',
  component: Button,
  args: { children: 'Enregistrer' },
  argTypes: {
    variant: { control: 'select', options: ['default', 'secondary', 'outline', 'ghost', 'link', 'destructive'] },
    size: { control: 'select', options: ['default', 'sm', 'lg'] },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Principal: Story = {}
export const Secondaire: Story = { args: { variant: 'secondary' } }
export const Contour: Story = { args: { variant: 'outline' } }
export const Destructif: Story = { args: { variant: 'destructive', children: 'Supprimer' } }
export const AvecIcone: Story = {
  args: {
    variant: 'outline',
    children: (
      <>
        <LogOut aria-hidden="true" />
        Se déconnecter
      </>
    ),
  },
}
/** Grande cible tactile (44 px) pour la tablette (ADR-002 § 8). */
export const Tablette: Story = { args: { size: 'lg', className: 'h-11' } }
export const Desactive: Story = { args: { disabled: true } }
