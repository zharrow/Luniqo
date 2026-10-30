import { expect, type Page, test } from '@playwright/test'

import { totp } from './totp'

// Comptes de démonstration créés par le seed de l'API (api/app/seed.py), données fictives.
const password = process.env.E2E_PASSWORD ?? ''
test.skip(password === '', 'E2E_PASSWORD absent : mot de passe des comptes de démonstration (API_SEED_DEMO_PASSWORD).')

/** Aucune erreur dans la console : une violation de la CSP en serait une. */
function watchConsole(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('401')) errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(error.message))
  return errors
}

async function login(page: Page, email: string, secret = password) {
  await page.getByLabel('Adresse e-mail').fill(email)
  await page.getByLabel('Mot de passe').fill(secret)
  await page.getByRole('button', { name: 'Se connecter' }).click()
}

test.describe.configure({ mode: 'serial' })

// Codes de secours de la direction, montrés à l'activation : les parcours suivants s'en servent.
let backupCodes: string[] = []

test('employé : connexion puis ses crèches, sans second facteur', async ({ page }) => {
  const errors = watchConsole(page)
  await page.goto('/accueil')
  await expect(page).toHaveURL(/\/connexion\?redirect=%2Faccueil/)
  await login(page, 'employe@demo.test')
  await expect(page.getByRole('heading', { name: 'Bonjour Lucas' })).toBeVisible()
  await expect(page.getByText('Crèche Démo Nord')).toBeVisible()
  // L'employé n'a accès qu'à sa crèche : l'isolation vient de l'API.
  await expect(page.getByText('Micro-crèche Démo Sud')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('mot de passe refusé', async ({ page }) => {
  await page.goto('/connexion')
  await login(page, 'employe@demo.test', 'pas le bon mot de passe')
  await expect(page.getByRole('alert')).toHaveText('Identifiants invalides')
})

test("direction : activation de l'application d'authentification, puis second facteur", async ({ page }) => {
  const errors = watchConsole(page)
  await page.goto('/connexion')
  await login(page, 'direction@demo.test')

  // Première connexion : enregistrer le second facteur (ADR-004).
  await expect(page.getByRole('heading', { name: 'Sécuriser votre compte' })).toBeVisible()
  await page.getByRole('button', { name: 'Commencer' }).click()
  const secret = (await page.getByLabel('Clé secrète').textContent()) ?? ''
  await page.getByLabel("Code affiché par l'application").fill(totp(secret))
  await page.getByRole('button', { name: 'Activer' }).click()
  await expect(page.getByRole('list', { name: 'Codes de secours' }).getByRole('listitem')).toHaveCount(10)
  backupCodes = await page.getByRole('list', { name: 'Codes de secours' }).getByRole('listitem').allTextContents()
  await page.getByRole('button', { name: "J'ai noté mes codes" }).click()
  await expect(page.getByRole('heading', { name: 'Bonjour Camille' })).toBeVisible()
  await expect(page.getByText('Micro-crèche Démo Sud')).toBeVisible()

  // Connexion suivante : le code est demandé.
  await page.getByRole('button', { name: 'Se déconnecter' }).click()
  await login(page, 'direction@demo.test')
  await expect(page.getByRole('heading', { name: 'Second facteur' })).toBeVisible()
  // Pas suivant : le code du pas courant vient de servir à l'activation (rejeu refusé).
  await page.getByLabel('Code à 6 chiffres ou code de secours').fill(totp(secret, 1))
  await page.getByRole('button', { name: 'Valider' }).click()
  await expect(page.getByRole('heading', { name: 'Bonjour Camille' })).toBeVisible()
  expect(errors).toEqual([])
})

test('direction : enrôlement de la tablette puis révocation', async ({ page, context }) => {
  const errors = watchConsole(page)
  const backupCode = backupCodes.shift()
  test.skip(backupCode === undefined, "Codes de secours absents : le parcours d'activation doit passer avant.")
  await page.goto('/connexion')
  await login(page, 'direction@demo.test')
  await page.getByLabel('Code à 6 chiffres ou code de secours').fill(backupCode ?? '')
  await page.getByRole('button', { name: 'Valider' }).click()

  await page.getByRole('link', { name: 'Tablettes de Crèche Démo Nord' }).click()
  await expect(page.getByRole('heading', { name: 'Tablettes de Crèche Démo Nord' })).toBeVisible()
  await page.getByLabel('Nom de la tablette').fill('Tablette du parcours e2e')
  await page.getByRole('button', { name: 'Enrôler cet appareil' }).click()
  await expect(page.getByText(/« Tablette du parcours e2e » est enrôlée sur cet appareil/)).toBeVisible()

  // Le jeton d'appareil n'est jamais lisible par le JavaScript : cookie HttpOnly posé par l'API.
  const device = (await context.cookies()).find((cookie) => cookie.name.endsWith('luniqo_device'))
  expect(device).toMatchObject({ httpOnly: true, sameSite: 'Strict' })
  expect(await page.evaluate<string>('document.cookie')).not.toContain('luniqo_device')

  const card = page.getByRole('listitem').filter({ hasText: 'Tablette du parcours e2e' })
  await expect(card.getByText('Active', { exact: true })).toBeVisible()
  await card.getByRole('button', { name: 'Révoquer' }).click()
  await card.getByRole('button', { name: 'Confirmer la révocation' }).click()
  await expect(card.getByText('Révoquée', { exact: true })).toBeVisible()
  expect(errors).toEqual([])
})
