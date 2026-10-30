# Luniqo — front v2

Application monopage React + Vite qui remplace progressivement le front v1
(Next.js + Supabase), selon [ADR-002](../M2/decisions/ADR-002-front-v2.md).
Elle ne parle qu'à l'API v2 ([api/](../api/README.md)), sur la même origine :
le conteneur `front` de la pile Docker sert ses fichiers avec nginx, et la passerelle
`web` relaie `/` vers lui et `/api/` vers l'API.

État au 2026-10-30 : squelette, connexion avec second facteur
(présentation d'un code, activation d'une application d'authentification,
codes de secours), espace connecté avec la liste des crèches (LUN-107) ;
mode tablette (`/tablette`, hors de l'espace connecté) : choix de l'employé
et PIN sur un pavé à grands boutons (LUN-88). La v1 reste en
production jusqu'à la bascule, prévue quand la v2 sera complète.

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
crée aucun compte (elle l'écrit dans son journal) ; entre apostrophes dans
`.env` s'il contient un `$`, que Docker Compose interpréterait comme une variable. La pile seule sert aussi le front :
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
- **Erreurs** : `ApiError` porte le message de l'API, le délai de
  `Retry-After` et les erreurs par champ des 422.
- **Accessibilité (WCAG 2.2 AA visée)** : libellés reliés aux champs, erreurs
  annoncées, cibles de 44 px ; `jsx-a11y` au lint et axe sur chaque story.
- **Données de test fictives uniquement** (règle 5 d'AGENTS.md).
- **Dépendances** : pnpm n'installe pas une version publiée depuis moins de
  24 h et refuse les scripts d'installation non listés dans
  `pnpm-workspace.yaml`. Relire ce qu'un générateur installe (voir « shadcn/ui »).
- **Storybook** : 10.6.2 au moins, serveur sur `127.0.0.1` seulement, aucun
  `.env` lu, jamais dans l'image de production (ADR-002 § 12).

### shadcn/ui

Les composants s'ajoutent avec la CLI (`pnpm dlx shadcn@<version> add …`) et
restent tels qu'elle les écrit. Le 2026-10-27, la CLI 4.22.0 a écrit
`import { cn } from "cn"` et installé un paquet npm `cn` au lieu d'utiliser
`@/lib/utils` : paquet retiré et imports corrigés. Vérifier `package.json` et
les imports après chaque ajout.
