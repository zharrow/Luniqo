/// <reference types="vitest/config" />
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import babel from '@rolldown/plugin-babel'
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vite'

const dirname = path.dirname(fileURLToPath(import.meta.url))

// Tests de composants et stories : dans un vrai navigateur (ADR-002 § 10).
// Une configuration par projet : Vitest complète l'objet qu'il reçoit.
const browser = () => ({
  enabled: true,
  headless: true,
  provider: playwright(),
  instances: [{ browser: 'chromium' as const }],
})

export default defineConfig({
  plugins: [
    // Avant le plugin React : il génère l'arbre des routes (src/routeTree.gen.ts)
    // et découpe le code par route.
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  resolve: {
    alias: { '@': path.resolve(dirname, 'src') },
  },
  server: {
    // Développement : l'API tourne derrière la passerelle de la pile Docker
    // (même origine pour le navigateur, comme en production).
    proxy: { '/api': { target: 'http://localhost:8080', changeOrigin: false } },
  },
  build: {
    // Pas de carte des sources en production : le code envoyé reste celui du dépôt public,
    // mais rien ne sert à le publier deux fois.
    sourcemap: false,
  },
  test: {
    projects: [
      {
        extends: true,
        test: { name: 'unit', environment: 'node', include: ['src/**/*.test.ts'] },
      },
      {
        extends: true,
        // Le service worker de MSW (test/public/mockServiceWorker.js) n'est servi
        // qu'ici : il ne doit pas partir dans le build de production (public/).
        publicDir: 'test/public',
        test: { name: 'browser', include: ['src/**/*.browser.test.tsx'], browser: browser() },
      },
      {
        extends: true,
        plugins: [storybookTest({ configDir: path.join(dirname, '.storybook') })],
        test: { name: 'storybook', browser: browser() },
      },
    ],
  },
})
