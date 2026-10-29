import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'

import { BackupCodes } from './backup-codes'

const meta = {
  title: 'Authentification/Codes de secours',
  component: BackupCodes,
  args: {
    onDone: fn(),
    // Codes fictifs, au format de l'API.
    codes: Array.from({ length: 10 }, (_, index) => `AB${index}C-D3EF-G4H${index}`),
  },
  decorators: [(Story) => <div className="w-96">{Story()}</div>],
} satisfies Meta<typeof BackupCodes>

export default meta
type Story = StoryObj<typeof meta>

export const Affichage: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getAllByRole('listitem')).toHaveLength(10)
    await userEvent.click(canvas.getByRole('button', { name: "J'ai noté mes codes" }))
    await expect(args.onDone).toHaveBeenCalledOnce()
  },
}
