import type { StorybookConfig } from '@storybook/react-vite'

// Règles de sécurité d'ADR-002 § 12 : Storybook 10.6.2 au moins, serveur de
// développement sur 127.0.0.1 (script « storybook »), aucun fichier .env lu.
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y', '@storybook/addon-vitest'],
  framework: { name: '@storybook/react-vite', options: {} },
  core: { disableTelemetry: true },
  // Aucune variable d'environnement exposée aux stories (CVE-2025-68429).
  env: () => ({}),
}

export default config
