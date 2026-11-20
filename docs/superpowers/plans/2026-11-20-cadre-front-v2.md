# Cadre de l'application v2 (LUN-150) — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer l'en-tête provisoire de l'espace connecté du front v2 par le cadre retenu : barre latérale par usage pour la direction et l'éditeur, en-tête à 3 entrées pour l'employée, barre d'onglets pour le parent, barre du haut avec recherche des écrans, en-tête de page commun, pages « bientôt » pour chaque module de la v1 sans écran v2.

**Architecture:** Une seule table de navigation pure (`features/shell/navigation.ts`) décrit les entrées par rôle, leurs adresses, leur famille et leur état « bientôt » ; elle nourrit le menu, la recherche, les pages « bientôt » et les tests. Des composants de présentation sans routeur (`features/shell/*.tsx`, chacun avec ses stories) reçoivent un composant de lien en propriété ; la route `/_app` les assemble selon le rôle et leur passe un lien qui navigue avec TanStack Router.

**Tech Stack:** React 19, TanStack Router (routes par fichier), TanStack Query, Tailwind v4, lucide-react, Vitest 5 (unit, browser, storybook), MSW 3, Playwright.

**Spec:** [docs/superpowers/specs/2026-11-20-cadre-front-v2-design.md](../specs/2026-11-20-cadre-front-v2-design.md) ; règles R1 à R20 : [docs/recherches/cadre-navigation-2026-11-20.md](../../recherches/cadre-navigation-2026-11-20.md) ; maquettes E et H : <https://claude.ai/artifact/QmL4oNBwdtak6zABc8T64G>.

## Global Constraints

- Travailler dans `front/` ; commandes : `corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm test` (sous forte charge : `corepack pnpm vitest run --no-file-parallelism`).
- Aucune nouvelle dépendance (lucide-react pour les icônes, pas de Heroicons ni de framer-motion).
- CSP `style-src 'self'` : aucun `<style>` injecté ; pas de Dialog, Popover ni DropdownMenu de Radix (ils injectent un style de blocage du défilement) ; menus et superpositions en HTML natif (`popover`, `<dialog>`) ou en état React.
- Couleurs des familles (texte blanc sur fond plein pour l'entrée active) : Aujourd'hui `#2459d6` (encre `#1a3f99`, teinte `#eaf0fd`), Enfants `#c2452b` (`#8e2f1c`, `#fdece7`), Équipe `#6d45c4` (`#4a2c8f`, `#efe9fb`), Lieux et hygiène `#0b7a70` (`#0b5e56`, `#e1f5f2`), Gestion `#8f6400` (`#6b4e00`, `#fff5d1`). Fond de page `#fbf8f2`, fond du menu `#fffdf8`, bordures `#ebe4d6`, texte `#1e2430`, texte secondaire `#5c6270`.
- WCAG 2.2 AA : texte ≥ 4,5:1, composants et indicateurs d'état ≥ 3:1, cibles ≥ 24 px (44 px pour boutons principaux, recherche, entrées de l'en-tête employée et onglets du parent), `aria-current="page"` sur l'entrée active, lien « Aller au contenu ».
- Aucun motif « AI slop » : pas de barre colorée sur le côté d'un élément actif, pas de dégradé décoratif, pas d'emoji, pas de salut (« Bonjour ») en titre de page.
- Libellés : noms courts, identiques au titre de la page de destination ; pas de « Gérer », « Voir ».
- Textes en français, identifiants et fichiers en anglais ; dates en heure de Paris (`lib/dates.ts`).
- Une story par état de chaque composant nouveau ; axe ne doit relever aucune violation (`a11y: { test: 'error' }` déjà réglé).
- Commits : Conventional Commits en français avec `(LUN-150)`, ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Une direction sans aucune crèche** (compte neuf) : aucune erreur, pas de choix de crèche, les entrées propres à une crèche sont masquées, Accueil et Réglages restent.
2. **Une crèche retenue dans le navigateur qui n'est plus accessible** (accès retiré) : la première crèche de la liste est prise, sans 404.
3. **Un navigateur qui refuse le stockage local** (navigation privée, `localStorage` qui lève) : le cadre fonctionne, seule la mémoire des choix est perdue.
4. **Un écran de 800 × 600** (persona Margeritte) et de 375 px : pas de défilement horizontal, menu ouvert par son bouton, fermé par Échap et par le choix d'une entrée.
5. **Ctrl+K sous Windows comme ⌘K sous macOS** donne le focus à la recherche ; Échap la vide ; Entrée ouvre le premier écran trouvé.

---

## Structure des fichiers

```
front/src/features/shell/
  families.ts            familles : couleurs, libellés (source unique, testée contre index.css)
  families.test.ts       contrastes et correspondance avec index.css
  navigation.ts          table des entrées par rôle, adresses, entrée active, recherche d'écrans, modules « bientôt »
  navigation.test.ts
  current-nursery.ts     crèche courante (adresse > mémoire > première), mémoire tolérante, cible d'un changement de crèche
  current-nursery.test.ts
  nav-link.ts            type NavLinkComponent et lien <a> par défaut (stories)
  nursery-switcher.tsx (+ .stories.tsx)
  sidebar.tsx (+ .stories.tsx)
  screen-search.tsx (+ .stories.tsx)
  top-bar.tsx (+ .stories.tsx)        bouton du menu, recherche, aide, menu du compte (déconnexion)
  page-header.tsx (+ .stories.tsx)    fil, surtitre, titre, actions, onglets
  coming-soon.tsx (+ .stories.tsx)
  employee-header.tsx (+ .stories.tsx)
  guardian-tabs.tsx (+ .stories.tsx)
  app-shell.tsx          assemble selon le rôle (direction, éditeur, employée, parent), menu mobile, lien « Aller au contenu »
front/src/assets/luniqo-logo.png      logo réduit (96 px) tiré de ../public/luniqo.png
front/src/routes/_app/route.tsx       utilise AppShell
front/src/routes/_app/bientot.$module.tsx
front/src/routes/_app/creches/$nurseryId/bientot.$module.tsx
front/src/routes/_app/reglages.tsx
front/src/app/cadre.browser.test.tsx  parcours du cadre dans l'application
```

Pages existantes modifiées : `routes/_app/accueil.tsx`, `routes/_app/creches/$nurseryId/presences.tsx`, `presences_.historique.tsx`, `tablettes.tsx`, `routes/_app/mon-pin.tsx`, `styles/index.css` ; tests et parcours qui citent « Bonjour … », « Présences du jour · … », « Vos crèches » ou le bouton « Se déconnecter » visible.

---

### Task 1: Thème et familles

**Files:**
- Create: `front/src/features/shell/families.ts`, `front/src/features/shell/families.test.ts`
- Modify: `front/src/styles/index.css`

**Interfaces:**
- Produces: `type FamilyId = 'today' | 'children' | 'team' | 'places' | 'admin'` ; `FAMILIES: Record<FamilyId, { label: string; color: string; ink: string; tint: string }>` (libellés : « Aujourd'hui », « Enfants », « Équipe », « Lieux et hygiène », « Gestion ») ; `contrastRatio(a: string, b: string): number` (formule WCAG, hex `#rrggbb`) ; classes Tailwind `bg-family-today`, `text-family-today-ink`, `bg-family-today-tint`, etc. ; jetons `--shell`, `--shell-border`.

- [ ] **Step 1: Écrire les tests** (`families.test.ts`, projet `unit`) :
  - `contrastRatio('#ffffff', '#000000')` vaut 21 à 0,01 près ;
  - pour chaque famille : blanc sur `color` ≥ 4,5 ; `color` contre `#fffdf8` ≥ 3 ; `ink` sur `tint` ≥ 4,5 ; `ink` contre `#fffdf8` ≥ 4,5 ;
  - `#5c6270` sur `#fbf8f2` ≥ 4,5 et `#1e2430` sur `#fffdf8` ≥ 4,5 ;
  - le texte de `src/styles/index.css` (lu avec `fs`) contient, pour chaque famille, `--family-<id>: <color>;`, `--family-<id>-ink: <ink>;`, `--family-<id>-tint: <tint>;` avec les valeurs de `FAMILIES`.
- [ ] **Step 2:** `corepack pnpm vitest run --project unit src/features/shell/families.test.ts` → échec (module absent).
- [ ] **Step 3: Implémenter** `families.ts` (valeurs des Global Constraints) ; dans `index.css` : `:root` reçoit `--background: #fbf8f2`, `--foreground: #1e2430`, `--primary: #2459d6`, `--ring: #2459d6`, `--muted-foreground: #5c6270`, `--border` et `--input: #ebe4d6`, `--shell: #fffdf8`, `--shell-border: #ebe4d6` et les 15 variables de famille ; `@theme inline` les expose (`--color-family-today: var(--family-today);` …, `--color-shell`, `--color-shell-border`). Garder le commentaire d'en-tête à jour (« palette du cadre E, LUN-150 »).
- [ ] **Step 4:** relancer le test → succès ; `corepack pnpm test --project storybook` → les stories existantes restent sans violation axe (le bleu primaire change).
- [ ] **Step 5: Commit** `feat(front): thème du cadre et couleurs des familles (LUN-150)`.

### Task 2: Table de navigation

**Files:**
- Create: `front/src/features/shell/navigation.ts`, `front/src/features/shell/navigation.test.ts`

**Interfaces:**
- Consumes: `FamilyId` (Task 1) ; `Session['role']` de `@/api/types`.
- Produces:
  ```ts
  type Scope = 'nursery' | 'enterprise'
  interface SoonModule { slug: string; title: string; family: FamilyId; scope: Scope; description: string }
  interface NavItem { id: string; label: string; icon: LucideIcon; href: string; soon: boolean }
  interface NavGroup { family: FamilyId; label: string; items: NavItem[]; collapsedByDefault: boolean }
  interface Navigation { groups: NavGroup[]; footer: NavItem[]; flat: NavItem[] }   // flat = toutes les entrées, pour la recherche et l'entrée active
  function navigationFor(role: Session['role'], nurseryId: string | null): Navigation
  function activeItemId(nav: Navigation, pathname: string): string | null
  function searchScreens(nav: Navigation, query: string): NavItem[]
  function soonModule(slug: string): SoonModule | undefined
  const SOON_MODULES: readonly SoonModule[]
  ```
- Table à respecter (adresses ; `soon` → `/creches/$id/bientot/<slug>` si `scope: 'nursery'`, sinon `/bientot/<slug>`) :

  | Rôle | Groupe | Entrées (libellé → adresse ou module « bientôt ») |
  |---|---|---|
  | owner | Aujourd'hui | Accueil `/accueil` · Présences `/creches/$id/presences` · Ménage `menage` · Transmissions `transmissions` |
  | owner | Enfants | Familles `familles` · Inscriptions `inscriptions` · Portail parents `portail-parents` |
  | owner | Équipe | Personnel `personnel` (enterprise) · Planning `planning` · Tablettes `/creches/$id/tablettes` |
  | owner | Lieux et hygiène | Pièces `pieces` · HACCP `haccp` · Fiches de ménage `fiches-menage` |
  | owner | Gestion | Contrats `contrats` · Facturation `facturation` (enterprise) · Statistiques `statistiques` (enterprise) |
  | owner, developer | pied | Réglages `/reglages` |
  | developer | un groupe « Éditeur » (famille `today`) | Accueil `/accueil` · Entreprises · Permissions · Statistiques de la plateforme · Annonces · Paramètres (modules enterprise `editeur-…`) |
  | employee | en-tête, sans groupe (un seul groupe `today` sans libellé affiché) | Ma journée `/accueil` · Présences `/creches/$id/presences` · Mon compte `/mon-pin` |
  | guardian | onglets | Accueil `/accueil` · Enfants `enfants` · Messages `messages` · Documents `documents` · Profil `profil` (enterprise) |

  `description` de chaque module : une phrase tirée de la page v1 correspondante (ex. `haccp` : « Repas, biberons, produits, fournisseurs, températures, équipements, documents et non-conformités de la cuisine. ») ; aucune donnée chiffrée.

- [ ] **Step 1: Écrire les tests** (`navigation.test.ts`) :
  - `navigationFor('owner', 'n1').groups.map(g => g.label)` égale `["Aujourd'hui", 'Enfants', 'Équipe', 'Lieux et hygiène', 'Gestion']` ; Présences a `href` `/creches/n1/presences`, `soon: false` ; Ménage `/creches/n1/bientot/menage`, `soon: true` ; Facturation `/bientot/facturation` ;
  - `collapsedByDefault` vrai exactement pour les groupes dont toutes les entrées sont `soon` (Lieux et hygiène, Gestion) ;
  - **Review Focus 1** : `navigationFor('owner', null)` ne contient aucune entrée dont l'adresse commence par `/creches/` ; Accueil et Réglages restent ;
  - `navigationFor('employee', 'n1').flat.map(i => i.label)` égale `['Ma journée', 'Présences', 'Mon compte']` ; aucune entrée `soon` ; pas de Tablettes ;
  - `navigationFor('guardian', null).flat` a 5 entrées, aucune sous `/creches/` ;
  - chaque `slug` de `SOON_MODULES` est unique, a une `description` non vide, et chaque entrée `soon` de tous les rôles pointe vers un module de `SOON_MODULES` ;
  - toute adresse non `soon` appartient à `['/accueil', '/reglages', '/mon-pin', '/creches/n1/presences', '/creches/n1/tablettes']` ;
  - `activeItemId(nav, '/creches/n1/presences/historique')` désigne Présences ; `'/creches/n1/bientot/haccp'` désigne HACCP ; `'/inconnu'` → `null` (règle : plus long préfixe d'adresse, segment entier) ;
  - `searchScreens(nav, 'presen')` et `'PRÉSENCES'` renvoient Présences (insensible à la casse et aux accents) ; `''` renvoie `[]`.
- [ ] **Step 2:** lancer → échec.
- [ ] **Step 3: Implémenter** `navigation.ts` (icônes lucide : `House`, `ClipboardCheck`, `Sparkles`, `NotebookPen`, `Users`, `UserPlus`, `MessagesSquare`, `BriefcaseBusiness`, `CalendarDays`, `Tablet`, `DoorOpen`, `FlaskConical`, `ClipboardList`, `FileText`, `Euro`, `ChartPie`, `Settings`, `KeyRound` ; le choix exact est libre).
- [ ] **Step 4:** relancer → succès.
- [ ] **Step 5: Commit** `feat(front): table de navigation par rôle (LUN-150)`.

### Task 3: Crèche courante

**Files:**
- Create: `front/src/features/shell/current-nursery.ts`, `front/src/features/shell/current-nursery.test.ts`

**Interfaces:**
- Produces:
  ```ts
  const NURSERY_KEY = 'luniqo.creche'
  function resolveNurseryId(fromUrl: string | undefined, remembered: string | null, accessible: readonly string[]): string | null
  function readRememberedNursery(storage?: Pick<Storage, 'getItem'>): string | null    // jamais d'exception
  function rememberNursery(id: string, storage?: Pick<Storage, 'setItem'>): void       // jamais d'exception
  function switchTarget(pathname: string, to: string | 'group'): string
  ```
- [ ] **Step 1: Tests** :
  - `resolveNurseryId('n2', 'n1', ['n1','n2'])` → `'n2'` (l'adresse fait foi, même absente de la liste : `('n9', null, ['n1'])` → `'n9'`) ; `(undefined, 'n2', ['n1','n2'])` → `'n2'` ; **Review Focus 2** : `(undefined, 'n3', ['n1','n2'])` → `'n1'` ; `(undefined, null, [])` → `null` ;
  - **Review Focus 3** : `readRememberedNursery({ getItem: () => { throw new Error() } })` → `null` ; `rememberNursery('n1', { setItem: () => { throw new Error() } })` ne lève pas ;
  - `switchTarget('/creches/n1/presences/historique', 'n2')` → `'/creches/n2/presences/historique'` ; `switchTarget('/accueil', 'n2')` → `'/creches/n2/presences'` ; `switchTarget('/creches/n1/tablettes', 'group')` → `'/accueil'` ; `switchTarget('/reglages', 'n2')` → `'/creches/n2/presences'`.
- [ ] **Step 2:** échec. **Step 3:** implémenter (stockage par défaut : `window.localStorage`, lu dans un `try`). **Step 4:** succès.
- [ ] **Step 5: Commit** `feat(front): crèche courante et changement de crèche (LUN-150)`.

### Task 4: Menu latéral et choix de la crèche

**Files:**
- Create: `front/src/features/shell/nav-link.ts`, `nursery-switcher.tsx`, `nursery-switcher.stories.tsx`, `sidebar.tsx`, `sidebar.stories.tsx`, `front/src/assets/luniqo-logo.png`

**Interfaces:**
- Consumes: `Navigation`, `NavGroup`, `NavItem` (Task 2) ; `FAMILIES` (Task 1).
- Produces:
  ```ts
  type NavLinkComponent = ComponentType<{ href: string; className?: string; 'aria-current'?: 'page'; onClick?: () => void; children: ReactNode }>
  const AnchorLink: NavLinkComponent
  interface NurseryOption { id: string; name: string }
  function NurserySwitcher(props: { nurseries: NurseryOption[]; current: string | 'group' | null; showGroup: boolean; onSelect(id: string | 'group'): void }): JSX.Element | null
  function Sidebar(props: { navigation: Navigation; activeId: string | null; collapsed: ReadonlySet<FamilyId>; onToggle(family: FamilyId): void; switcher?: ReactNode; link?: NavLinkComponent; onNavigate?: () => void; version: string }): JSX.Element
  ```
- Rendu (planche E) : `<nav aria-label="Menu principal">`, logo `luniqo-logo.png` (`alt=""`) + « Luniqo » ; `switcher` sous le logo ; chaque groupe : bouton `aria-expanded` (carré de 10 px de sa couleur, libellé, nombre d'entrées quand replié, chevron) ; entrée : 40 px de haut, icône à l'encre de sa famille, libellé, « bientôt » en texte `#5c6270` 11 px ; **entrée active : fond plein `color`, texte blanc, gras, `aria-current="page"`** ; pied : Réglages, version. Un groupe sans libellé (employée) n'a pas de bouton.
- `NurserySwitcher` : rien si `nurseries` est vide ; une crèche et `showGroup` faux : nom en lecture seule ; sinon `<select>` natif avec libellé visuellement caché « Crèche », option « Tout le groupe » en tête si `showGroup`, initiales de la crèche courante devant ; une crèche courante absente de la liste s'affiche « Crèche introuvable ».

- [ ] **Step 1: Logo** : `sips -Z 96 ../public/luniqo.png --out src/assets/luniqo-logo.png` (≤ 20 Kio).
- [ ] **Step 2: Stories avec tests** (`play`) : `Sidebar` — `Direction` (Présences active : `getByRole('link', { name: 'Présences' })` a `aria-current="page"`), `GroupesReplies` (Lieux et hygiène replié : son bouton a `aria-expanded="false"` et affiche « 3 »), `Editeur`, `SansCreche` (`navigationFor('owner', null)`), `Employee` ; `NurserySwitcher` — `UneCreche`, `Plusieurs` (choisir la 2e appelle `onSelect('…')`), `AvecGroupe`, `Introuvable`, `Vide` (ne rend rien).
- [ ] **Step 3:** `corepack pnpm vitest run --project storybook src/features/shell` → échec.
- [ ] **Step 4: Implémenter** `nav-link.ts`, `nursery-switcher.tsx`, `sidebar.tsx` (classes Tailwind des familles : la classe de l'entrée active est choisie par une table `family → classe`, pas par une chaîne construite, pour que Tailwind la voie).
- [ ] **Step 5:** relancer → succès, axe sans violation.
- [ ] **Step 6: Commit** `feat(front): menu latéral par usage et choix de la crèche (LUN-150)`.

### Task 5: Barre du haut et recherche des écrans

**Files:**
- Create: `front/src/features/shell/screen-search.tsx` (+ stories), `top-bar.tsx` (+ stories)

**Interfaces:**
- Consumes: `searchScreens`, `NavItem` (Task 2) ; `NavLinkComponent` (Task 4).
- Produces:
  ```ts
  function ScreenSearch(props: { navigation: Navigation; onOpen(href: string): void }): JSX.Element
  function TopBar(props: { navigation: Navigation; onOpen(href: string): void; onToggleMenu(): void; menuOpen: boolean; user: { name: string; roleLabel: string }; onLogout(): void; logoutPending: boolean }): JSX.Element
  ```
- `ScreenSearch` : combobox (rôle `combobox`, `aria-expanded`, `aria-controls` vers une `listbox`), placeholder « Rechercher un écran », `kbd` « ⌘K » ; 44 px de haut ; résultats : libellé, groupe, « bientôt » ; flèches haut/bas, Entrée ouvre l'option active (la première par défaut), Échap vide et ferme ; un écouteur sur `document` donne le focus pour `metaKey+k` **ou** `ctrlKey+k` (preventDefault). Aucun résultat : « Aucun écran ne correspond ».
- `TopBar` : `<header>` ; bouton du menu (`aria-label` « Ouvrir le menu »/« Fermer le menu », `aria-expanded`) ; `ScreenSearch` ; bouton « Aide » (lien vers `/bientot/aide`, module à ajouter à `SOON_MODULES`, enterprise, famille `today`) ; bouton du compte (initiales, nom, rôle : « Direction », « Employée », « Parent », « Éditeur ») ouvrant un menu natif (`popover`, `popovertarget`) avec « Se déconnecter ».

- [ ] **Step 1: Stories avec `play`** : `Recherche` (taper « haccp » → option « HACCP » ; Entrée appelle `onOpen('/creches/n1/bientot/haccp')`) ; `AucunResultat` ; **Review Focus 5** `RaccourciCtrlK` (`userEvent.keyboard('{Control>}k{/Control}')` → le champ a le focus ; `{Escape}` → valeur vide) ; `TopBar` `Direction` (ouvrir le compte → bouton « Se déconnecter » visible, clic → `onLogout`).
- [ ] **Step 2:** échec. **Step 3:** implémenter. **Step 4:** succès, axe sans violation.
- [ ] **Step 5: Commit** `feat(front): barre du haut et recherche des écrans (LUN-150)`.

### Task 6: En-tête de page et page « bientôt »

**Files:**
- Create: `front/src/features/shell/page-header.tsx` (+ stories), `coming-soon.tsx` (+ stories)

**Interfaces:**
- Consumes: `FAMILIES`, `SoonModule` ; `NavLinkComponent`.
- Produces:
  ```ts
  interface PageTab { label: string; href: string; current: boolean }
  function PageHeader(props: { title: string; kicker?: string; breadcrumb?: string[]; actions?: ReactNode; tabs?: PageTab[]; link?: NavLinkComponent }): JSX.Element
  function ComingSoon(props: { module: SoonModule }): JSX.Element
  ```
- `PageHeader` (planche E) : fil (`<nav aria-label="Fil d'Ariane">`, éléments séparés par un chevron, le dernier en `aria-current="page"`), surtitre 13 px gras capitales espacées couleur `#1a3f99`, `<h1>` 34 px 800, actions à droite qui passent dessous en étroit, onglets en `<nav aria-label="Sous-pages">` (liens, actif : trait bas 3 px `#2459d6` + gras + `aria-current="page"`, 44 px de haut). Onglets de navigation : des liens, pas `role="tab"`.
- `ComingSoon` : `<h1>` = `module.title`, phrase « Ce module arrive dans Luniqo. » puis `module.description`, carré de la couleur de sa famille ; aucune donnée fictive, aucun bouton factice.

- [ ] **Step 1: Stories avec `play`** : `PageHeader` `Complet` (titre « Présences », surtitre « Vendredi 20 novembre », fil `['Aujourd’hui','Présences']`, onglets Aujourd'hui/Historique, actions) — l'onglet courant a `aria-current="page"` ; `SansOnglets` ; `Etroit` (viewport 375 : `document.documentElement.scrollWidth <= innerWidth`) ; `ComingSoon` `Haccp`.
- [ ] **Step 2:** échec. **Step 3:** implémenter. **Step 4:** succès.
- [ ] **Step 5: Commit** `feat(front): en-tête de page et page « bientôt » (LUN-150)`.

### Task 7: En-tête de l'employée et onglets du parent

**Files:**
- Create: `front/src/features/shell/employee-header.tsx` (+ stories), `guardian-tabs.tsx` (+ stories)

**Interfaces:**
- Consumes: `Navigation`, `NurserySwitcher`, `NavLinkComponent`, `activeItemId`.
- Produces:
  ```ts
  function EmployeeHeader(props: { navigation: Navigation; activeId: string | null; switcher?: ReactNode; user: { name: string; roleLabel: string }; onLogout(): void; logoutPending: boolean; link?: NavLinkComponent }): JSX.Element
  function GuardianTabs(props: { navigation: Navigation; activeId: string | null; link?: NavLinkComponent }): JSX.Element
  ```
- `EmployeeHeader` (planche H) : logo, `switcher`, `<nav aria-label="Menu principal">` à 3 liens de 44 px (actif : fond `#2459d6`, texte blanc, `aria-current`), aide, compte (même menu natif que la Task 5 : factoriser le bouton du compte dans `top-bar.tsx` sous le nom exporté `AccountMenu`).
- `GuardianTabs` : `<nav aria-label="Menu principal">` fixée en bas sous 768 px, en haut sous l'en-tête au-delà ; 5 liens de 56 px de haut (icône + libellé), actif en `#2459d6` et gras.

- [ ] **Step 1: Stories avec `play`** : `EmployeeHeader` `Accueil` (Ma journée active) et `PlusieursCreches` ; `GuardianTabs` `Telephone` (viewport 375, la barre est en bas : `getBoundingClientRect().bottom === innerHeight`).
- [ ] **Step 2–4:** échec, implémentation, succès.
- [ ] **Step 5: Commit** `feat(front): espaces de l'employée et du parent (LUN-150)`.

### Task 8: Assemblage dans l'application et nouvelles routes

**Files:**
- Create: `front/src/features/shell/app-shell.tsx`, `front/src/routes/_app/bientot.$module.tsx`, `front/src/routes/_app/creches/$nurseryId/bientot.$module.tsx`, `front/src/routes/_app/reglages.tsx`, `front/src/app/cadre.browser.test.tsx`
- Modify: `front/src/routes/_app/route.tsx`

**Interfaces:**
- Consumes: tout ce qui précède ; `useLogout` ; `$api` (`GET /api/v2/nurseries`).
- Produces: `function AppShell(props: { session: Session; children: ReactNode }): JSX.Element` ; un lien de routeur `RouterLink: NavLinkComponent` (dans `app-shell.tsx`) qui rend un `<a href>` et, sur un clic simple sans touche de modification, appelle `router.navigate({ href })`.
- Comportement :
  - direction, éditeur : `TopBar` + `Sidebar` ; ≥ 1200 px menu visible (masquable, choix retenu sous `luniqo.menu`) ; < 1200 px menu caché, ouvert par le bouton en surcouche avec voile, fermé par Échap, par le voile et après le choix d'une entrée ; focus rendu au bouton à la fermeture ;
  - employée : `EmployeeHeader` ; parent : en-tête simple (logo, nom) + `GuardianTabs` ;
  - lien « Aller au contenu » en premier élément focalisable, vers `<main id="contenu">` ;
  - crèche courante : `resolveNurseryId(params.nurseryId, readRememberedNursery(), liste)` ; à chaque crèche résolue depuis l'adresse : `rememberNursery` ; changement dans le choix : `navigate({ href: switchTarget(pathname, choix) })` ; « Tout le groupe » proposé à la direction ayant ≥ 2 crèches, sélectionné sur `/accueil` ;
  - groupes repliés : `collapsedByDefault`, puis choix retenu sous `luniqo.groupes` (tableau JSON, lecture tolérante) ; le groupe de l'entrée active est toujours ouvert.
  - `bientot.$module` (deux routes) : `soonModule(params.module)` ou `throw notFound()` ; rend `ComingSoon` ; la route sous `creches/$nurseryId` refuse un module `enterprise` (`notFound`) et inversement.
  - `reglages` : `PageHeader` « Réglages » + trois sections « Mon compte », « La crèche », « L'entreprise » ; dans « Mon compte », lien « Mon PIN de tablette » pour l'employée, le reste « bientôt ».
- [ ] **Step 1: Tests d'intégration** (`cadre.browser.test.tsx`, même démarrage que `accueil.browser.test.tsx` : `App`, `createApp(createMemoryHistory(...))`, MSW) :
  - direction sur `/creches/<nursery.id>/presences` à 1280 × 800 : `getByRole('navigation', { name: 'Menu principal' })` visible ; lien « Présences » `aria-current="page"` ;
  - changer de crèche dans le choix → adresse `/creches/<south.id>/presences` ;
  - clic « HACCP » (groupe ouvert d'abord) → titre « HACCP » ;
  - **Review Focus 1** : direction avec `GET /api/v2/nurseries` → `[]` : pas de combobox « Crèche », pas de lien « Présences », titre de l'accueil visible ;
  - **Review Focus 2** : `localStorage['luniqo.creche'] = 'inconnue'` puis `/accueil` → le lien « Présences » mène à la première crèche ;
  - **Review Focus 3** : `vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error() })` → le cadre s'affiche ;
  - **Review Focus 4** : 800 × 600 puis 375 × 700 : pas de défilement horizontal ; menu caché ; « Ouvrir le menu » l'affiche ; Échap le ferme ; choisir une entrée le ferme ;
  - employée : pas de `navigation` « Menu principal » latérale mais les 3 liens Ma journée/Présences/Mon compte ; parent : 5 onglets ; `/bientot/inexistant` → page introuvable ; `/creches/x/bientot/facturation` → introuvable.
- [ ] **Step 2:** échec. **Step 3:** implémenter `app-shell.tsx`, routes, `route.tsx` (`<AppShell session={session}><Outlet /></AppShell>`). **Step 4:** succès (`--no-file-parallelism` si la machine est chargée).
- [ ] **Step 5: Commit** `feat(front): cadre par rôle dans l'espace connecté (LUN-150)`.

### Task 9: Pages existantes dans le cadre

**Files:**
- Modify: `front/src/routes/_app/accueil.tsx`, `creches/$nurseryId/presences.tsx`, `presences_.historique.tsx`, `tablettes.tsx`, `mon-pin.tsx`, les `*.browser.test.tsx` concernés, `front/e2e/connexion.spec.ts`

- [ ] **Step 1: Mettre à jour les tests d'abord** :
  - titres : accueil de la direction « Accueil » (au lieu de « Bonjour {prénom} »), de l'employée « Ma journée », du parent « Accueil » ; présences « Présences » (au lieu de « Présences du jour · {crèche} ») avec le nom de la crèche dans le fil `[crèche, 'Présences']` et la date en surtitre ; historique : titre « Présences », onglet « Historique » courant ; tablettes « Tablettes » ; PIN « Mon compte » ;
  - déconnexion : ouvrir le menu du compte (`getByRole('button', { name: /Hélène|Camille|Lucas/ })`, nom affiché de la session) puis « Se déconnecter » ;
  - liens « Vos crèches » et « Présences du jour » supprimés : les tests passent par le menu ou par l'onglet « Aujourd'hui » ;
  - la tablette (`tablette.browser.test.tsx`, « Bonjour Lucas B. ») ne change pas (hors cadre).
- [ ] **Step 2:** `corepack pnpm vitest run --project browser` → échec sur ces assertions.
- [ ] **Step 3: Adapter les pages** : chacune remplace son titre et ses liens de retour par `PageHeader` (surtitre `formatLongDay(todayInParis())`, actions existantes passées en `actions`, onglets Aujourd'hui `/creches/$id/presences` et Historique `/creches/$id/presences/historique` sur les deux pages de présences) ; supprimer le bouton « Se déconnecter » propre à `tablettes.tsx` s'il double celui du compte ; ne rien changer d'autre au contenu.
- [ ] **Step 4:** `corepack pnpm lint && corepack pnpm typecheck && corepack pnpm test` → tout vert.
- [ ] **Step 5: Parcours Playwright** contre une pile neuve isolée (méthode d'AGENTS.md) : `E2E_PASSWORD=… corepack pnpm test:e2e` → tous verts, console sans erreur de CSP ; capture 1280 × 800 de l'accueil direction et de « Ma journée » comparées aux planches E et H.
- [ ] **Step 6: Commit** `feat(front): pages existantes dans le cadre (LUN-150)`.

### Task 10: Documentation et PR

- [ ] Mettre à jour `front/README.md` (cadre, table de navigation, ajout d'un écran : ajouter l'entrée dans `navigation.ts`), `CHANGELOG.md` (« Non publié »), `CLAUDE.md` (section front v2 : cadre par rôle, piège « pas de Popover Radix »), `AGENTS.md` (état d'avancement et point de reprise), `M2/decisions/CHOIX-TECHNIQUES.md` (menu natif plutôt que Radix, table de navigation unique).
- [ ] Mutations (méthode du dépôt) : retirer `aria-current`, rendre une entrée de l'employée visible au parent, casser `switchTarget`, laisser `readRememberedNursery` lever : chaque fois un test échoue ; restaurer.
- [ ] Commit `docs: cadre du front v2 (LUN-150)` ; PR vers `develop`, titre au format de commit avec la clé ; suivre la CI et le contrôle Vercel.
