import { defineConfig, devices } from '@playwright/test'

/**
 * Parcours de bout en bout contre une pile Docker avec la vraie API et les
 * comptes de démonstration (ADR-002 § 10). La pile doit être neuve : le
 * parcours de la direction enregistre son application d'authentification.
 *
 *   cd docker && API_SEED_DEMO_PASSWORD=… docker compose -p luniqo-e2e --env-file .env up -d --build --wait
 *   E2E_PASSWORD=… pnpm test:e2e
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: process.env.CI !== undefined,
  reporter: process.env.CI === undefined ? 'list' : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8080',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
