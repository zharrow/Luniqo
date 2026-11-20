import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'

import { ComingSoon } from './coming-soon'
import { soonModule } from './navigation'

const haccp = soonModule('haccp')
if (!haccp) throw new Error('module haccp absent')

const meta = {
  title: 'Cadre/Page bientôt',
  component: ComingSoon,
  args: { module: haccp },
} satisfies Meta<typeof ComingSoon>

export default meta
type Story = StoryObj<typeof meta>

export const Haccp: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 1, name: haccp.title })).toBeInTheDocument()
    await expect(canvas.getByText('Ce module arrive dans Luniqo.')).toBeInTheDocument()
    await expect(canvas.getByText(haccp.description)).toBeInTheDocument()
    await expect(canvas.queryByRole('button')).not.toBeInTheDocument()
  },
}
