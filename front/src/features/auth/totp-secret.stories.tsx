import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'

import { TotpSecret } from './totp-secret'

const meta = {
  title: 'Authentification/Clé TOTP',
  component: TotpSecret,
  // Secret fictif.
  args: { secret: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP', uri: 'otpauth://totp/Luniqo:demo?secret=JBSWY3DPEHPK3PXP' },
  decorators: [(Story) => <div className="w-80">{Story()}</div>],
} satisfies Meta<typeof TotpSecret>

export default meta
type Story = StoryObj<typeof meta>

export const Affichage: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Clé secrète')).toHaveTextContent('JBSW Y3DP EHPK 3PXP JBSW Y3DP EHPK 3PXP')
  },
}
