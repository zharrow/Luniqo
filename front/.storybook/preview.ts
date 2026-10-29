import '../src/styles/index.css'

import type { Preview } from '@storybook/react-vite'

const preview: Preview = {
  parameters: {
    layout: 'centered',
    // Une violation d'accessibilité (axe) fait échouer le test de la story.
    a11y: { test: 'error' },
  },
}

export default preview
