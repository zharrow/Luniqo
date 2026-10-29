import type { Meta, StoryObj } from '@storybook/react-vite'

import { ApiError } from '@/api/errors'

import { NurseryList } from './nursery-list'

const nursery = {
  id: '00000000-0000-4000-8000-0000000000c1',
  enterprise_id: '00000000-0000-4000-8000-0000000000e1',
  name: 'Crèche Démo Nord',
  address: null,
  postal_code: null,
  city: 'Toulouse',
  phone: null,
  email: null,
  capacity: 12,
  is_active: true,
}

const meta = {
  title: 'Crèches/Liste des crèches',
  component: NurseryList,
  args: { nurseries: undefined, pending: false, error: null },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof NurseryList>

export default meta
type Story = StoryObj<typeof meta>

export const Chargement: Story = { args: { pending: true } }

export const Vide: Story = { args: { nurseries: [] } }

export const Liste: Story = {
  args: {
    nurseries: [
      nursery,
      { ...nursery, id: '00000000-0000-4000-8000-0000000000c2', name: 'Micro-crèche Démo Sud', capacity: 10 },
    ],
  },
}

export const Erreur: Story = {
  args: { error: new ApiError(503, 'Le service est momentanément indisponible. Réessayez dans un instant.') },
}
