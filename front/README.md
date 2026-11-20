# Luniqo — front v2

Application monopage React + Vite qui remplace progressivement le front v1
(Next.js + Supabase), selon [ADR-002](../M2/decisions/ADR-002-front-v2.md).
Elle ne parle qu'à l'API v2 ([api/](../api/README.md)), sur la même origine :
le conteneur `front` de la pile Docker sert ses fichiers avec nginx, et la passerelle
`web` relaie `/` vers lui et `/api/` vers l'API.

État au 2026-11-05 : squelette, connexion avec second facteur
(présentation d'un code, activation d'une application d'authentification,
codes de secours), espace connecté avec la liste des crèches (LUN-107) ;
tablettes d'une crèche pour la direction : enrôlement de l'appareil, liste,
révocation (LUN-87) ; mode tablette (`/tablette`, hors de l'espace connecté) :
choix de l'employé et PIN sur un pavé à grands boutons (LUN-88), puis pointage
des arrivées et départs des enfants (LUN-89) ; présences du jour d'une crèche pour
la direction et les employés, relues toutes les 30 secondes (LUN-91) ; choix et
changement du PIN de tablette par l'employé (LUN-119) ; historique des présences
sur une période et export CSV (LUN-92). La v1 reste en
production jusqu'à la bascule, prévue quand la v2 sera complète.

Sur l'accueil, chaque crèche accessible affiche ses enfants accueillis (actifs
et en adaptation), les enfants présents aujourd'hui à Paris et les employés
actifs ayant accès. Les résumés sont relus toutes les 30 secondes ; une erreur
reste dans la carte concernée, avec un bouton « Réessayer », et ses liens restent
utilisables.

## Lancer

Prérequis : Node 22.12 ou plus, pnpm 11 (la version exacte est dans
`packageManager` ; `corepack pnpm` la fournit), et la pile Docker pour l'API.

```sh
cd docker && API_SEED_DEMO_PASSWORD=… docker compose --env-file .env up -d --build --wait
cd ../front && pnpm install
pnpm dev          # http://localhost:5173, /api relayé vers la passerelle (localhost:8080)
```

Comptes de démonstration (données fictives) : `employe@demo.test`,
`direction@demo.test` (second facteur à enregistrer à la première connexion),
mot de passe `API_SEED_DEMO_PASSWORD` : 15 caractères au moins, sinon l'API ne
crée aucun compte (elle l'écrit dans son journal) ; sans `$`, que Docker Compose
interprète comme une variable (ou entre apostrophes dans `.env`). La pile seule sert aussi le front :
<http://localhost:8080>.

## Scripts

| Commande               | Rôle                                                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`             | serveur de développement Vite                                                                                                                           |
| `pnpm build`           | build de production (`dist/`), puis vérification des types                                                                                              |
| `pnpm lint`            | ESLint (règles typées, hooks et React Compiler, accessibilité, imports entre domaines) et Prettier                                                      |
| `pnpm typecheck`       | TypeScript strict                                                                                                                                       |
| `pnpm test`            | Vitest : tests unitaires (Node), tests de composants et stories (Chromium)                                                                              |
| `pnpm test:e2e`        | parcours Playwright contre une pile Docker neuve, `E2E_PASSWORD` = mot de passe de démonstration ; `E2E_BASE_URL` si la pile n'est pas sur le port 8080 |
| `pnpm storybook`       | Storybook sur <http://127.0.0.1:6006>                                                                                                                   |
| `pnpm build-storybook` | site Storybook statique (`storybook-static/`)                                                                                                           |
| `pnpm api:types`       | régénère `src/api/openapi.json` et `src/api/schema.d.ts` depuis le code de l'API (Python de l'API requis, ou `PYTHON=…`)                                |

Les navigateurs des tests s'installent une fois : `pnpm exec playwright install chromium`.

## Structure

```
src/
├── app/          création du cache de données et du routeur, erreurs communes (401, second facteur)
├── routes/       une route par fichier (TanStack Router) ; arbre généré : routeTree.gen.ts
├── features/     un dossier par domaine (auth, nurseries…) : composants, requêtes, règles
├── api/          client typé (openapi-fetch + openapi-react-query), erreurs, schéma généré
├── components/   composants partagés ; ui/ : composants shadcn/ui
├── lib/          utilitaires sans dépendance aux domaines
└── styles/       thème « Douceur Professionnelle » (jetons de la v1)
test/             API simulée (MSW), données fictives, service worker de MSW
e2e/              parcours Playwright
.storybook/       configuration de Storybook
```

Imports à sens unique, vérifiés par ESLint : `components`, `lib` et `api` ne
dépendent d'aucun domaine ; un domaine n'importe ni un autre domaine ni une
route.

## Cadre de l'application

Tout l'espace connecté (`routes/_app/`) est enveloppé par `features/shell/`
(LUN-150). Le cadre dépend du rôle : direction et éditeur ont une barre du haut
(logo, crèche courante, recherche d'écran, menu du compte) et un menu latéral
rangé par usage (Aujourd'hui, Enfants, Équipe, Lieux et hygiène, Gestion) ;
l'employée a un en-tête simple avec ses entrées ; le parent a un en-tête et des
onglets, fixés en bas sous 768 px. Recherche et justification :
[docs/recherches/cadre-navigation-2026-11-20.md](../docs/recherches/cadre-navigation-2026-11-20.md)
et [spécification](../docs/superpowers/specs/2026-11-20-cadre-front-v2-design.md).

- **Une seule table de navigation** : `features/shell/navigation.ts`. Menu,
  recherche d'écran, onglets du parent et pages « bientôt » la lisent toutes ;
  la visibilité par rôle y est déclarée une fois (testée dans `navigation.test.ts`).
- **Ajouter un écran** : créer sa route, puis ajouter son entrée dans
  `navigation.ts` (ou, si l'entrée existe déjà comme « bientôt », la remplacer :
  son `href` réel et sans l'indicateur). Rien d'autre à toucher dans le cadre.
- **Pages « bientôt »** : les modules annoncés mais absents mènent à
  `/bientot/$module` (`coming-soon.tsx`) ; `/reglages` est une page de même
  nature. Elles disparaissent avec l'écran réel.
- **Crèche courante** : `current-nursery.ts` (choix gardé dans le navigateur,
  lu dans un `try`, repli sûr si le stockage est refusé) ; « Tout le groupe »
  n'existe que pour la direction ayant plusieurs crèches, sur l'accueil.
- **Pas de Popover, DropdownMenu ni Dialog de Radix** : ils injectent une
  balise `<style>` refusée par la CSP. Menu du compte : `popover` natif ;
  menu latéral replié : superposition en état React ; fenêtres : `<dialog>`.
- Chaque page place son titre dans `PageHeader` (titre, onglets, actions).

## Règles

- **Le contrat de l'API fait foi.** Types générés depuis le schéma OpenAPI ;
  la CI échoue si `src/api/` ne correspond plus au code de l'API (`pnpm api:types`).
- **Aucun secret ni jeton dans le navigateur.** La session est un cookie
  `HttpOnly` posé par l'API ; les variables `VITE_*` sont publiques.
- **Mode tablette** : la tablette est reconnue par un cookie d'appareil, l'employé
  par son PIN, vérifié par l'API seule. Ses 401 (« PIN incorrect », tablette non
  enrôlée) restent à l'écran : le renvoi global vers `/connexion` ne s'applique
  pas à `/tablette` (`app/app.tsx`).
- **Les gardes de route ne protègent que l'affichage.** Toute autorisation
  reste dans l'API.
- **Adresse de retour (`?redirect=`) limitée aux chemins de Luniqo**
  (`lib/safe-redirect.ts`), contre les redirections ouvertes.
- **Erreurs** : `ApiError` porte le message de l'API (`message`, à afficher
  par `errorMessage()`), son **code stable** (`code`), le délai de `Retry-After`
  et les erreurs par champ des 422 (`fields`). On décide **sur le code**
  (`ERROR_CODES` dans `api/errors.ts`), jamais sur le texte.
  Pour afficher les erreurs de l'API sous les champs d'un formulaire : la route
  passe `fieldErrors={fieldErrorsOf(mutation.error)}`, et le formulaire appelle
  `useServerFieldErrors(form, fieldErrors, FIELDS)` (`lib/server-field-errors.ts`)
  avec la correspondance explicite champ de l'API → champ du formulaire
  (`arrived_at` → `arrival`) ; chaque formulaire a sa story `ErreursParChamp`.
  Une erreur serveur (5xx) porte sa référence (`requestId` : `request_id` du
  corps, sinon en-tête `X-Request-ID`) ; `errorMessage()` l'ajoute au message
  (« Référence : … »), à transmettre au support. Jamais pour un refus (4xx).
  **Que faire après une erreur** : `errorCategory()` classe l'erreur, et
  `ActionError` (`components/action-error.tsx`) l'affiche avec « Réessayer » sur
  une panne du serveur ou du réseau (lectures : `onRetry={retryFailed(query)}`)
  et le compte à rebours d'une 429 (`useRetryCountdown(error)`, qui sert aussi à
  désactiver le bouton d'envoi). Un formulaire qui peut recevoir une 429 reçoit
  l'erreur brute (`error={mutation.error}`), pas un texte. Les lectures sont
  rejouées 2 fois sur une panne ; les écritures jamais, ni mises en pause hors
  ligne (`app/app.tsx`). Bannière hors ligne : `lib/connectivity.ts`, en haut de
  toutes les pages (`routes/__root.tsx`).
  Stratégie, traitement par catégorie et cible :
  [docs/projet/ERREURS.md](../docs/projet/ERREURS.md).
- **Erreurs dans les tests et les stories** : jamais de corps d'erreur écrit à la
  main. Les cas sont dans `test/handlers/errors.ts` (`apiErrors`), à la forme
  exacte de l'API (code, message, `fields`, `Retry-After`, `request_id`) :
  `reply(apiErrors.serverError())` est la réponse MSW d'un test,
  `networkError()` une coupure réseau ; dans une story,
  `raised(apiErrors.serverError())` est l'erreur que le client lèverait
  (`errorMessage(raised(…))` pour un composant qui reçoit un texte),
  `networkFailure()` celle
  d'une coupure. Un refus absent du catalogue passe par `apiErrors.refusal(…)`
  (statut, code, message), ou s'ajoute au catalogue s'il sert deux fois. Chaque composant qui
  appelle l'API a une story par catégorie utile (`RefusParLApi` ou `Erreur`,
  `ErreursParChamp`, `TropDeTentatives`, `ErreurServeur`, `HorsLigne`).
- **Accessibilité (WCAG 2.2 AA visée)** : libellés reliés aux champs, erreurs
  annoncées, cibles de 44 px ; `jsx-a11y` au lint et axe sur chaque story.
- **Données de test fictives uniquement** (règle 5 d'AGENTS.md).
- **Dépendances** : pnpm n'installe pas une version publiée depuis moins de
  24 h et refuse les scripts d'installation non listés dans
  `pnpm-workspace.yaml`. Relire ce qu'un générateur installe (voir « shadcn/ui »).
- **Storybook** : 10.6.2 au moins, serveur sur `127.0.0.1` seulement, aucun
  `.env` lu, jamais dans l'image de production (ADR-002 § 12).

### Tests dans le navigateur

`expect.element(…).toHaveTextContent(…)` de Vitest a échoué deux fois alors que le
texte reçu, affiché dans l'erreur, était exactement l'attendu (cause non trouvée,
2026-10-30). Utiliser plutôt `getByText(…)` limité à l'élément, puis `toBeVisible()`.

Le nom accessible d'un titre est son texte, pas son rendu : une majuscule posée en
CSS (`first-letter:uppercase`) n'y apparaît pas, et `getByRole('heading', { name })`
ne le trouve pas. Mettre la majuscule dans le texte (LUN-92, 2026-11-05).

Avec React Hook Form, l'option `values` n'a pas remis le formulaire de période à
jour quand la période changeait dans l'adresse (React Compiler actif, cause non
cherchée plus loin). Le formulaire est remonté avec une `key` tirée de la période,
et part de `defaultValues` (LUN-92, 2026-11-05).

Sous forte charge de la machine (autres applications), les tests dans le
navigateur peuvent dépasser leur délai, et ce n'est jamais le même qui échoue
(2026-11-17 : suite en 65 s au lieu de 7 s). Relancer avec
`corepack pnpm test --no-file-parallelism` avant de chercher un défaut. Une
requête lue juste après un changement d'adresse doit être attendue
(`expect.poll`), pas lue tout de suite.

Les tests du navigateur chargent les styles réels de l'application
(`test/browser-setup.ts`, `setupFiles` du projet `browser`) : une vérification
de mise en page (`page.viewport(800, 600)`, `toBeInViewport`) porte sur le vrai
rendu. Sans styles, le pointage de la tablette passait le test alors que
« Réessayer » sortait de l'écran (LUN-142). Les stories les chargent par
`.storybook/preview.ts`.

Vite reçoit une configuration PostCSS en ligne (`vite.config.ts`) : il ne
cherche plus de fichier dans les dossiers parents, où il trouvait celui de la
v1. `pnpm api:types` force l'UTF-8 de Python (`PYTHONUTF8=1`) : sous Windows,
les accents du contrat étaient abîmés (LUN-145).

Si Playwright ne trouve plus son Chromium (`Executable doesn't exist`), le
réinstaller : `corepack pnpm exec playwright install chromium`.

### Fenêtres modales

`src/components/ui/dialog.tsx` repose sur l'élément natif `<dialog>`
(`showModal()`), pas sur le Dialog de Radix : celui-ci écrit une balise `<style>`
pour bloquer le défilement, et notre CSP (`style-src 'self'`) la refuse
(LUN-121). Un autre composant Radix qui écrirait du style en ligne poserait le
même problème : le parcours Playwright, qui exige une console sans erreur, le
signale.

### shadcn/ui

Les composants s'ajoutent avec la CLI (`pnpm dlx shadcn@<version> add …`) et
restent tels qu'elle les écrit. Le 2026-10-27, la CLI 4.22.0 a écrit
`import { cn } from "cn"` et installé un paquet npm `cn` au lieu d'utiliser
`@/lib/utils` : paquet retiré et imports corrigés. Vérifier `package.json` et
les imports après chaque ajout.
