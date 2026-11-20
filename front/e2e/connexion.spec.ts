import { readFile } from 'node:fs/promises'

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

async function expectSummary(page: Page, name: string, children: number, present: number, staff: number) {
  const card = page.getByRole('region', { name })
  for (const [label, value] of [
    ['Enfants accueillis', children],
    ['Présents en ce moment', present],
    ['Personnel', staff],
  ] as const) {
    await expect(card.getByText(label, { exact: true }).locator('xpath=following-sibling::dd')).toHaveText(
      String(value),
    )
  }
}

test.describe.configure({ mode: 'serial' })

/** Onglets de la page (Aujourd'hui, Historique) : le nom seul serait ambigu avec le menu. */
const subpages = (page: Page) => page.getByRole('navigation', { name: 'Sous-pages' })

/** La déconnexion vit dans le menu du compte. */
async function logout(page: Page) {
  await page.getByRole('button', { name: /Mon compte/ }).click()
  await page.getByRole('button', { name: 'Se déconnecter' }).click()
}

// Codes de secours de la direction, montrés à l'activation : les parcours suivants s'en servent.
let backupCodes: string[] = []

test('employé : connexion puis ses crèches, sans second facteur', async ({ page }, testInfo) => {
  const errors = watchConsole(page)
  await page.goto('/accueil')
  await expect(page).toHaveURL(/\/connexion\?redirect=%2Faccueil/)
  await login(page, 'employe@demo.test')
  await expect(page.getByRole('heading', { name: 'Ma journée', level: 1 })).toBeVisible()
  await expect(page.getByText('Crèche Démo Nord')).toBeVisible()
  await expectSummary(page, 'Crèche Démo Nord', 3, 0, 1)
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.screenshot({ path: testInfo.outputPath('ma-journee-1280x800.png') })
  // L'employé n'a accès qu'à sa crèche : l'isolation vient de l'API.
  await expect(page.getByText('Micro-crèche Démo Sud')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('mot de passe refusé', async ({ page }) => {
  await page.goto('/connexion')
  await login(page, 'employe@demo.test', 'pas le bon mot de passe')
  await expect(page.getByRole('alert')).toHaveText('Identifiants invalides')
})

test("direction : activation de l'application d'authentification, puis second facteur", async ({ page }, testInfo) => {
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
  await expect(page.getByRole('heading', { name: 'Accueil', level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Micro-crèche Démo Sud' })).toBeVisible()
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.screenshot({ path: testInfo.outputPath('accueil-direction-1280x800.png') })
  await page.setViewportSize({ width: 800, height: 600 })
  await expectSummary(page, 'Crèche Démo Nord', 3, 0, 1)
  await expectSummary(page, 'Micro-crèche Démo Sud', 1, 0, 1)
  expect(await page.evaluate<boolean>('document.documentElement.scrollWidth <= window.innerWidth')).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('accueil-800x600.png'), fullPage: true })

  // Connexion suivante : le code est demandé.
  await logout(page)
  await login(page, 'direction@demo.test')
  await expect(page.getByRole('heading', { name: 'Second facteur' })).toBeVisible()
  // Pas suivant : le code du pas courant vient de servir à l'activation (rejeu refusé).
  await page.getByLabel('Code à 6 chiffres ou code de secours').fill(totp(secret, 1))
  await page.getByRole('button', { name: 'Valider' }).click()
  await expect(page.getByRole('heading', { name: 'Accueil', level: 1 })).toBeVisible()
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
  await expect(page.getByRole('heading', { name: 'Tablettes', level: 1 })).toBeVisible()
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

test("tablette : enrôlée par la direction, puis PIN de l'employé", async ({ page, context, browser, baseURL }) => {
  const errors = watchConsole(page)
  const backupCode = backupCodes.shift()
  test.skip(backupCode === undefined, "Codes de secours absents : le parcours d'activation doit passer avant.")
  // Les écritures exigent l'en-tête Origin de Luniqo (ADR-003), que le navigateur envoie seul.
  const origin = { Origin: baseURL ?? '' }

  // L'employé choisit son PIN depuis son espace, dans son propre navigateur.
  const employeeContext = await browser.newContext({ baseURL })
  const employee = await employeeContext.newPage()
  await employee.goto('/connexion')
  await login(employee, 'employe@demo.test')
  await employee.getByRole('link', { name: 'Choisir ou changer mon PIN de tablette' }).click()
  await employee.getByLabel('Nouveau PIN (4 chiffres)').fill('4826')
  await employee.getByLabel('Nouveau PIN, une seconde fois').fill('4826')
  await employee.getByLabel('Mot de passe actuel').fill(password)
  await employee.getByRole('button', { name: 'Enregistrer mon PIN' }).click()
  await expect(employee.getByText('PIN enregistré : utilisez-le dès maintenant sur la tablette.')).toBeVisible()
  await employeeContext.close()

  // La direction se connecte sur la tablette et l'enrôle (écran d'enrôlement testé à part), puis s'en va.
  await page.goto('/connexion')
  await login(page, 'direction@demo.test')
  await page.getByLabel('Code à 6 chiffres ou code de secours').fill(backupCode ?? '')
  await page.getByRole('button', { name: 'Valider' }).click()
  await expect(page.getByRole('heading', { name: 'Accueil', level: 1 })).toBeVisible()
  const nurseries = (await (await page.request.get('/api/v2/nurseries')).json()) as { id: string; name: string }[]
  const north = nurseries.find((nursery) => nursery.name === 'Crèche Démo Nord')
  const enrolled = await page.request.post(`/api/v2/nurseries/${north?.id ?? ''}/tablets`, {
    data: { label: 'Tablette du parcours PIN' },
    headers: origin,
  })
  expect(enrolled.status()).toBe(201)
  await logout(page)

  await page.goto('/tablette')
  await expect(page.getByRole('heading', { name: /Crèche Démo Nord/ })).toBeVisible()
  // Inès travaille dans l'autre crèche : la tablette ne la propose pas (isolation par l'API).
  await expect(page.getByRole('button', { name: /Inès/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'Lucas B.' }).click()
  await page.getByLabel('PIN de Lucas B.').fill('1357')
  await expect(page.getByRole('alert')).toHaveText('PIN incorrect')
  await page.getByLabel('PIN de Lucas B.').fill('4826')
  await expect(page.getByRole('heading', { name: 'Bonjour Lucas B.' })).toBeVisible()

  // Session d'action de 2 minutes : cookie HttpOnly posé par l'API, illisible par le JavaScript.
  const action = (await context.cookies()).find((cookie) => cookie.name.endsWith('luniqo_tablet'))
  expect(action).toMatchObject({ httpOnly: true, sameSite: 'Strict' })
  expect(await page.evaluate<string>('document.cookie')).not.toContain('luniqo_tablet')

  // Pointage : arrivée de Léo, puis départ avec une personne autorisée.
  // Nina est inscrite dans l'autre crèche : la tablette ne la montre pas.
  await expect(page.getByRole('button', { name: /Nina/ })).toHaveCount(0)
  await page.getByRole('button', { name: /Léo Garnier/ }).click()
  await page.getByRole('button', { name: "Pointer l'arrivée" }).click()
  await expect(page.getByText(/^Arrivée de Léo Garnier pointée à \d{2}:\d{2}\.$/)).toBeVisible()
  await page.getByRole('button', { name: /Léo Garnier/ }).click()
  await page.getByRole('radio', { name: /Alice G\./ }).check()
  await page.getByRole('button', { name: 'Pointer le départ' }).click()
  await expect(page.getByText(/^Départ de Léo Garnier pointé à \d{2}:\d{2}\.$/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Partis (1)' })).toBeVisible()

  await page.getByRole('button', { name: 'Terminer' }).click()
  await expect(page.getByRole('heading', { name: 'Qui êtes-vous ?' })).toBeVisible()
  expect(errors).toEqual([])
})

test('présences du jour : le pointage fait sur la tablette, vu depuis le web', async ({ page }) => {
  const errors = watchConsole(page)
  await page.goto('/connexion')
  await login(page, 'employe@demo.test')
  await page.getByRole('link', { name: 'Présences de Crèche Démo Nord' }).click()
  await expect(page.getByRole('heading', { name: 'Présences', level: 1 })).toBeVisible()

  // Arrivée puis départ de Léo, pointés par Lucas sur la tablette au parcours précédent.
  const leo = page.getByRole('row', { name: /Léo Garnier/ })
  await expect(leo).toContainText('parti·e avec Alice G.')
  await expect(leo).toContainText('pointé par Lucas B.')
  await expect(page.getByText('Départs', { exact: true }).locator('xpath=following-sibling::dd')).toHaveText('1')
  await expect(leo.getByRole('button', { name: /^Corriger la présence/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Ajouter une présence oubliée' })).toHaveCount(0)
  expect(errors).toEqual([])
})

test("historique des présences : la journée de Léo, puis l'export CSV téléchargé", async ({ page }) => {
  const errors = watchConsole(page)
  await page.goto('/connexion')
  await login(page, 'employe@demo.test')
  await page.getByRole('link', { name: 'Présences de Crèche Démo Nord' }).click()
  await subpages(page).getByRole('link', { name: 'Historique' }).click()
  await expect(page.getByRole('heading', { name: 'Présences', level: 1 })).toBeVisible()
  await expect(subpages(page).getByRole('link', { name: 'Historique' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('button', { name: '7 derniers jours' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('row', { name: /Léo Garnier/ })).toContainText('parti·e avec Alice G.')

  // Vrai téléchargement : fichier de l'API, BOM et séparateur « ; », heures de Paris.
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exporter en CSV' }).click()
  const file = await download
  expect(file.suggestedFilename()).toMatch(/^presences_\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}\.csv$/)
  const text = await readFile(await file.path(), 'utf-8')
  expect(text.startsWith('\uFEFFJour;Enfant;Arrivée')).toBe(true)
  expect(text).toMatch(/;Léo Garnier;\d{2}:\d{2};Lucas B\.;/)

  // Mois précédent : période dans l'adresse, aucun pointage ce mois-là sur une pile neuve.
  await page.getByRole('button', { name: 'Mois précédent' }).click()
  await expect(page).toHaveURL(/\?du=\d{4}-\d{2}-01&au=\d{4}-\d{2}-\d{2}$/)
  await expect(page.getByText('Aucune arrivée pointée sur cette période.')).toBeVisible()
  expect(errors).toEqual([])
})

test('direction : présence oubliée ajoutée, corrigée puis retirée, chaque étape au journal', async ({
  page,
}, testInfo) => {
  const errors = watchConsole(page)
  const backupCode = backupCodes.shift()
  test.skip(backupCode === undefined, "Codes de secours absents : le parcours d'activation doit passer avant.")
  await page.goto('/connexion')
  await login(page, 'direction@demo.test')
  await page.getByLabel('Code à 6 chiffres ou code de secours').fill(backupCode ?? '')
  await page.getByRole('button', { name: 'Valider' }).click()
  await page.getByRole('link', { name: 'Présences de Crèche Démo Nord' }).click()
  await subpages(page).getByRole('link', { name: 'Historique' }).click()
  await expect(page.getByRole('heading', { name: 'Journal des corrections' })).toBeVisible()
  await expect(page.getByText('Aucune correction sur cette période.')).toBeVisible()

  // Hier à Paris : toujours dans le délai de 31 jours, et jamais dans le futur.
  const yesterday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(
    new Date(Date.now() - 86_400_000),
  )
  await page.getByRole('button', { name: 'Ajouter une présence oubliée' }).click()
  const addition = page.getByRole('dialog', { name: 'Ajouter une présence oubliée' })
  await expect(addition.getByLabel('Départ', { exact: true })).toHaveAccessibleDescription(
    'Laissez vide si l’enfant est encore là.',
  )
  await addition.getByLabel('Enfant', { exact: true }).selectOption({ label: 'Emma Lambert' })
  await expect(addition.getByRole('option', { name: 'Sophie Lambert' }).first()).toBeAttached()
  await addition.getByLabel('Jour').fill(yesterday)
  await addition.getByLabel('Arrivée').fill('08:15')
  await addition.getByLabel(/^Départ/).fill('16:00')
  await addition.getByLabel('Parti·e avec').selectOption({ label: 'Sophie Lambert' })
  await addition.getByLabel("Motif de l'ajout").fill('Tablette en panne ce matin-là')
  await addition.getByRole('button', { name: 'Ajouter la présence' }).click()
  await expect(addition).toBeHidden()

  // La présence ajoutée est marquée, et le journal garde l'auteur et le motif.
  const emma = page.getByRole('row', { name: /Emma Lambert/ })
  await expect(emma).toContainText('Corrigée')
  await expect(emma).toContainText('parti·e avec Sophie L.')
  await expect(page.getByText('Motif : Tablette en panne ce matin-là')).toBeVisible()
  await expect(page.getByText(/^Par Camille Martin, le /)).toBeVisible()

  // Arrivée corrigée : seule l'heure change.
  await page.getByRole('button', { name: 'Corriger la présence de Emma Lambert, arrivée à 08:15' }).click()
  const correction = page.getByRole('dialog', { name: 'Corriger la présence' })
  await correction.getByLabel('Arrivée').fill('08:00')
  await correction.getByLabel('Motif de la correction').fill('Arrivée réelle à 8 h')
  await correction.getByRole('button', { name: 'Enregistrer la correction' }).click()
  await expect(correction).toBeHidden()
  await expect(page.getByText('Arrivée : 08:15 → 08:00')).toBeVisible()

  // Retrait : la présence disparaît de l'historique, le journal la garde.
  await page.getByRole('button', { name: 'Corriger la présence de Emma Lambert, arrivée à 08:00' }).click()
  await correction.getByRole('button', { name: 'Retirer cette présence…' }).click()
  await correction.getByLabel('Motif du retrait').fill('Pointée sur le mauvais enfant')
  await correction.getByRole('button', { name: 'Retirer la présence' }).click()
  await expect(correction).toBeHidden()
  await expect(emma).toHaveCount(0)
  await expect(page.getByText(/^Présence retirée · Emma Lambert/)).toBeVisible()
  await expect(
    page
      .getByRole('region', { name: 'Journal des corrections' })
      .getByRole('listitem')
      .filter({ hasText: /^Présence/ }),
  ).toHaveCount(3)

  await page.setViewportSize({ width: 800, height: 600 })
  await subpages(page).getByRole('link', { name: "Aujourd'hui" }).click()
  const leo = page.getByRole('row', { name: /Léo Garnier/ })
  await expect(leo.getByRole('button', { name: /^Corriger la présence/ })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('presences-du-jour.png'), fullPage: true })
  await leo.getByRole('button', { name: /^Corriger la présence/ }).click()
  await expect(correction).toHaveCSS('text-align', 'start')
  const arrivalBox = await correction.getByLabel('Arrivée', { exact: true }).boundingBox()
  const departureBox = await correction.getByLabel('Départ', { exact: true }).boundingBox()
  expect(arrivalBox).not.toBeNull()
  expect(departureBox?.y).toBe(arrivalBox?.y)
  await correction.getByLabel('Amené·e par').selectOption({ label: 'Alice Garnier' })
  await correction.getByLabel('Motif de la correction').fill('Personne ayant amené Léo précisée après le pointage')
  await correction.getByRole('button', { name: 'Enregistrer la correction' }).click()
  await expect(correction).toBeHidden()
  await expect(leo).toContainText('amené·e par Alice G.')
  await expect(leo).toContainText('Corrigée')
  expect(errors).toEqual([])
})
