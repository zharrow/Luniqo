# ADR-002 — Front v2 : garder Next.js ou passer à React + Vite

| | |
|---|---|
| Statut | **Proposée** le 2026-10-10, en attente de la décision de Florent (penche pour React + Vite le 2026-10-10) |
| Date | 2026-10-10 |
| Décideur | Florent `[RÉEL]`. L'assistant a fait la recherche, la comparaison et la recommandation |
| Équipe concernée | `[SIMULÉ]` Mateo Fernández (front / UX) réalisera les écrans, Kwame Asante (QA / DevOps) les tests de bout en bout et la CI. Aucun avis ne leur est attribué ici |
| Ticket | LUN-113, sous-tâche de la story LUN-79 (Socle du front v2) |
| Prolonge | [ADR-001](ADR-001-reecriture-backend.md), qui gardait Next.js « pendant la transition » et renvoyait ce choix ici |
| Compétences | C1.3.1 (veille, sources), C1.3.2 (choix d'architecture), C2.1.1 (environnements et outils), C2.2.3 (sécurité, accessibilité) |

## Contexte

Faits relevés dans le dépôt le 2026-10-10 :

- **Toute la logique est dans l'API v2** (FastAPI) : contrôle d'accès, règles métier, horodatage. Le front n'a plus qu'à afficher et à saisir. Tout le MVP de la story map est fait côté API (LUN-41 à LUN-49, LUN-55, LUN-76 à LUN-78) ; **aucun écran v2 n'existe**.
- **L'authentification passe par un cookie de session `HttpOnly`** (`__Host-luniqo_session`), le front et l'API étant servis sur la même origine par la passerelle nginx (`/` → front, `/api/` → API). Le code du navigateur ne voit jamais de jeton. L'API refuse toute requête d'écriture dont l'en-tête `Origin` est absent ou étranger (ADR-003).
- **Tout est derrière une connexion**, sauf quelques pages publiques (politique de confidentialité, accueil). Le référencement ne compte que pour elles.
- **La v1 doit de toute façon être réécrite écran par écran** : 139 pages sur 141 sont des composants client branchés sur Supabase (CLAUDE.md). Ce qui se réutilise quel que soit le choix : composants shadcn/ui, Tailwind, palette « Douceur Professionnelle ».
- **Image du front v1 mesurée** pendant le TP Docker ([docker/front/README.md](../../docker/front/README.md)) : 302 Mo (Node.js 24 + serveur Next.js), 72 à 151 Mo de mémoire, et **la limite d'un cœur atteinte** avec 30 rendus simultanés de `/login`. L'image nginx `web` pèse 26 Mo et sert déjà des fichiers statiques.
- Deux failles critiques ont touché les serveurs Next.js depuis le début du projet :
  - [CVE-2025-29927](https://github.com/vercel/next.js/security/advisories/GHSA-f82v-jwr5-mffw) (mars 2025, CVSS 9,1) : un en-tête permettait de contourner le middleware de Next.js, et avec lui les contrôles d'accès qui s'y trouvaient ;
  - [CVE-2025-55182](https://react.dev/blog/2025/12/03/critical-security-vulnerability-in-react-server-components) (décembre 2025, CVSS 10) : exécution de code à distance **sans authentification** dans React Server Components, qui touchait Next.js App Router 15 et 16. L'annonce de React précise : « si le code React de votre application n'utilise pas de serveur, votre application n'est pas concernée ».
- **L'IETF confirme le modèle de session** : le [RFC 10017](https://www.ietf.org/ietf-ftp/rfc/rfc10017.txt) (BCP 212, août 2026, applications OAuth dans le navigateur) range parmi les architectures déconseillées le fait de remplacer la gestion de session par OAuth dans une application sur un seul domaine : l'application peut « s'appuyer sur un état de session côté serveur, porté par un cookie ». C'est le modèle de Luniqo ; le front n'a donc ni jeton à stocker ni flux OAuth à gérer.

## Options

| Critère | A. Next.js, rendu serveur (comme la v1) | B. Next.js en export statique | **C. React + Vite, application monopage (SPA)** |
|---|---|---|---|
| Principe | Un serveur Node.js rend les pages ; Server Components, middleware, Server Actions | `next build` produit des fichiers statiques servis par nginx ; plus de serveur Node | Vite construit des fichiers statiques servis par nginx ; routage et données dans le navigateur |
| Adéquation à l'architecture | Faible : la logique serveur de Next.js doublerait celle de l'API, avec deux endroits où vérifier les accès | Moyenne | **Bonne** : le front n'est qu'un client de l'API |
| Routes à identifiant (`/enfants/{id}`, `/pieces/{id}`) | Oui | **Non** : les routes dynamiques sans liste connue à la compilation (`generateStaticParams`) ne sont pas prises en charge ([documentation](https://nextjs.org/docs/app/guides/static-exports)) | Oui |
| Surface d'attaque côté front | Un serveur Node exposé, exécutant du code applicatif (les deux CVE ci-dessus) | Fichiers statiques | **Fichiers statiques** : une faille du front reste dans le navigateur et ne donne pas accès au serveur |
| Exploitation | Un conteneur Node de plus : 302 Mo, 72 à 151 Mo de mémoire, un cœur saturé à 30 rendus simultanés (mesuré) | Fichiers dans l'image nginx existante | Fichiers dans l'image nginx existante. **Taille et temps de build non mesurés** à ce stade |
| Fonctions de Next.js encore utiles | Toutes | Presque aucune : ni middleware, ni cookies, ni en-têtes, ni redirections, ni Server Actions | Sans objet ; routeur et gestion des données à choisir |
| Reprise de la v1 | Structure des dossiers et habitudes conservées ; pages à réécrire quand même (Supabase) | Idem, avec les limites ci-dessus | Composants shadcn/ui et Tailwind repris ; pages réécrites dans une autre structure |
| Première page affichée | Rapide (HTML rendu par le serveur) | Rapide pour les pages connues à la compilation | Un écran de chargement le temps du premier téléchargement (sans enjeu derrière une connexion) |
| Développement | Rechargement à chaud correct | Idem | Rechargement à chaud très rapide ; option recommandée par la [documentation de React](https://react.dev/learn/build-a-react-app-from-scratch) pour une application sans framework |
| Risque principal | Deux serveurs à sécuriser et à maintenir | Contourner les limites de l'export | « Construire son propre framework » (React) : routeur, données, gestion des erreurs à assembler soi-même |

## Recommandation : option C

**React + Vite**, servi en fichiers statiques par l'image nginx `web`. Raisons, dans l'ordre :

1. Le front n'a plus de logique serveur à porter : un serveur Node ne ferait que doubler l'API, avec une deuxième surface d'attaque (les deux CVE).
2. Une image et un conteneur de moins à exploiter, et plus de saturation du processeur au rendu.
3. L'export statique de Next.js (B) garde la complexité de Next.js sans ses avantages, et bloque les routes à identifiant.

Le coût est celui que React signale : assembler soi-même routeur, données et gestion des erreurs. La section suivante fixe ces choix une fois pour toutes, pour que le squelette (LUN-114) les porte dès le départ.

## Pratiques retenues pour le squelette

Recherche du 2026-10-10. Versions lues sur le registre npm ce jour-là, à relire et figer dans le lockfile au moment du squelette.

### 1. Outils

| Rôle | Choix | Version | Raison | Écarté |
|---|---|---|---|---|
| Construction | **Vite** + `@vitejs/plugin-react` | 8.3.4, 6.1.2 | Vite 8 n'utilise plus qu'un seul outil de construction (Rolldown) au lieu de deux ([annonce](https://vite.dev/blog/announcing-vite8)) | Parcel, Rsbuild (également cités par React, communauté plus petite) |
| Langage | **TypeScript 6.0**, mode strict, `noUncheckedIndexedAccess` | 6.0.3 | TypeScript 7 (7.0.2, compilateur réécrit en Go) n'a **pas encore d'API JavaScript** : `typescript-eslint` exige `typescript <6.1.0`, et ses mainteneurs conseillent de garder TypeScript 6 pour le lint ([ticket #12518](https://github.com/typescript-eslint/typescript-eslint/issues/12518), suivi dans [#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940)). `noUncheckedIndexedAccess` est recommandé par le client d'API retenu | TypeScript 7 seul (lint typé impossible) ; TypeScript 7 + 6 côte à côte (deux compilateurs à maintenir pour un gain de vitesse inutile à cette taille) |
| Optimisation du rendu | **React Compiler** activé dès le départ | `babel-plugin-react-compiler` 1.0.0 | Stable depuis le 2025-10-07 ; « les nouvelles applications devraient utiliser React Compiler » ([annonce](https://react.dev/blog/2025/10/07/react-compiler-1)) ; avec `@vitejs/plugin-react` 6, il se branche par `@rolldown/plugin-babel` et `reactCompilerPreset` ([installation](https://react.dev/learn/react-compiler/installation)) | `useMemo` / `useCallback` à la main |
| Interface | **Tailwind CSS v4** (`@tailwindcss/vite`) + **shadcn/ui** | 4.3.3 | Repris de la v1 ; installation Vite officielle ([shadcn/ui](https://ui.shadcn.com/docs/installation/vite)) | — |
| Paquets | **pnpm**, déjà utilisé | 11.x (12 existe) | Depuis pnpm 11, une version publiée depuis moins de 24 h n'est pas installée par défaut (`minimumReleaseAge`, 1 440 min, [documentation](https://pnpm.io/settings/dependency-resolution)) : protection contre les paquets piégés retirés dans la journée. Scripts d'installation des dépendances autorisés un par un (`allowBuilds`) | npm (pas de délai par défaut) |

### 2. Architecture du code

```
front/src/
├── app/          fournisseurs (Query, routeur), configuration du routeur
├── routes/       une route par fichier (TanStack Router), arbre généré par le plugin Vite
├── features/     un dossier par domaine : auth, nurseries, children, attendance, cleaning…
├── api/          types générés depuis /api/openapi.json, client, gestion des erreurs
├── components/   ui/ (shadcn), composants partagés
└── lib/          dates, formats, utilitaires
```

- **Par domaine, sens unique** : partagé → domaines → application ; un domaine n'importe pas un autre, la règle est vérifiée par le lint. Structure reprise de [bulletproof-react](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md). Les domaines suivent ceux de l'API (`api/app/<domaine>/`).
- **Pas de magasin d'état global** (Redux, Zustand) : l'état serveur vit dans TanStack Query, l'état d'URL (jour affiché, filtres) dans les paramètres du routeur, le reste dans les composants.

### 3. Routage : TanStack Router

- **Routes déclarées par fichier**, ce que la documentation présente comme la méthode recommandée ; le plugin Vite génère l'arbre des routes et **découpe le code par route** automatiquement ([documentation](https://tanstack.com/router/latest/docs/framework/react/routing/file-based-routing)). Version 1.170.42.
- **Paramètres d'URL typés et validés** (`validateSearch`) : `?day=` et `?from=&to=` de l'API se retrouvent typés dans les écrans.
- **Routes protégées** : une route parente vérifie la session dans `beforeLoad` et renvoie vers la connexion ([documentation](https://tanstack.com/router/latest/docs/framework/react/guide/authenticated-routes)). La documentation le rappelle : **une garde de route n'est pas une barrière d'autorisation**. Chez Luniqo, toute autorisation reste dans l'API ; la garde ne sert qu'à l'affichage.
- Écarté : React Router 8 (8.4.0), plus répandu, mais son typage repose sur une génération de code séparée et sur le mode framework, prévu pour le rendu serveur. Les comparatifs consultés sont des billets de blog, à prendre avec prudence ; ils s'accordent sur l'avantage de TanStack Router pour une SPA typée. **À trancher par Florent**, React Router restant acceptable.

### 4. Données et client d'API

- **Types générés** par `openapi-typescript` (7.13.0) depuis `/api/openapi.json`, **client** `openapi-fetch` (0.17.0, environ 6 ko : chaque appel renvoie `{ data, error }`), **liaison avec TanStack Query** par `openapi-react-query` (0.5.4, environ 1 ko) ([documentation](https://openapi-ts.dev/openapi-react-query/)). Une URL ou un paramètre mal écrit ne compile pas.
- **La CI régénère les types et échoue s'ils diffèrent** de ceux du dépôt : le front ne peut pas dériver de l'API sans que cela se voie.
- **TanStack Query** (5.104.1) : cache, états de chargement et d'erreur, nouvelle tentative ; recommandé par React pour une API REST.
- **Erreurs communes traitées à un seul endroit** : 401 → page de connexion ; 403 « Second facteur requis » → écran du second facteur ; 429 → message avec le délai de `Retry-After` ; 422 → erreurs affichées sous les champs du formulaire.
- Écartés : `@hey-api/openapi-ts` (0.99.0) génère des fonctions et des hooks complets, mais se déclare en développement initial et demande de figer une version exacte à cause des changements incompatibles ([documentation](https://heyapi.dev/openapi-ts/get-started)) ; orval (8.41.0) génère aussi beaucoup de code. Avec des types seuls, il n'y a pas de code généré à relire.

### 5. Sécurité

- **Aucun secret dans le front** : les variables `VITE_*` sont lisibles par tout le monde dans le code envoyé au navigateur ([documentation de Vite](https://vite.dev/guide/env-and-mode)). Le front n'a besoin d'aucune clé : l'API est sur la même origine.
- **Aucun jeton accessible au JavaScript** : la session reste dans le cookie `HttpOnly` (RFC 10017). Rien dans `localStorage`, contrairement à la session tablette de la v1 (ANO-001).
- **CSRF** : l'API vérifie déjà l'en-tête `Origin` sur toute requête d'écriture et refuse celles qui n'en ont pas, comme le recommande l'[OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) ; le navigateur l'envoie de lui-même sur une requête `fetch` de même origine. Rien à ajouter côté front.
- **En-têtes posés par nginx** sur les fichiers du front, en plus de ceux déjà présents (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`) :
  - **politique de sécurité du contenu (CSP)** stricte, possible parce que Vite produit des scripts externes sans script en ligne : `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'` ([OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)). Elle sera d'abord testée en mode « rapport seulement », puis appliquée. **À vérifier** au squelette : la compatibilité des composants shadcn/ui (Radix) avec `style-src 'self'` ;
  - `Cache-Control: no-cache` sur `index.html`, `immutable` sur les fichiers dont le nom porte une empreinte : une nouvelle version est prise sans vider le cache à la main.
- **Dépendances** : délai de 24 h de pnpm, scripts d'installation autorisés un par un, mises à jour par PR relues (C4.1.1).

### 6. Formulaires et validation

- **React Hook Form** (7.89.0) + **Zod 4** (4.6.5) : React Hook Form est l'une des bibliothèques documentées par shadcn/ui ([formulaires](https://ui.shadcn.com/docs/forms)), avec TanStack Form et Formisch. Zod sert aussi à valider les paramètres d'URL du routeur.
- La validation dans le navigateur n'est qu'un confort : **l'API reste la référence** et ses erreurs 422 s'affichent sous les champs.
- Écarté pour l'instant : TanStack Form (1.33.5), plus jeune.

### 7. Dates et heures

- Les jours et heures viennent de l'API (jour de la crèche en heure de Paris). Le front les **affiche** avec `Intl.DateTimeFormat` (`fr-FR`, `Europe/Paris`), sans bibliothèque, et **ne calcule jamais « aujourd'hui »** pour une règle métier : c'est l'API qui le fait (CLAUDE.md, règle 3).

### 8. Tablette

- **Grandes cibles tactiles** (au moins 44 px, au-delà du minimum de 24 px de WCAG 2.2) et parcours en un ou deux appuis.
- **Pas d'écriture hors ligne** : un pointage ou une coche porte l'heure du serveur (LUN-48, LUN-77), une file d'attente hors ligne la fausserait. Le front affiche clairement la perte de réseau et bloque la saisie.
- **Application installable (PWA) reportée** : utile plus tard pour l'icône et le plein écran, sans objet pour le squelette. Le verrouillage de la tablette sur Luniqo relève du système (accès guidé, gestion des appareils) : **à vérifier** le moment venu.

### 9. Accessibilité

- **Objectif : WCAG 2.2 niveau AA**, mesuré avec le RGAA 4.1.2, critère de qualité du BC02. L'obligation légale pour Luniqo (European Accessibility Act, en vigueur depuis le 28 juin 2025) n'est **pas vérifiée** : les sources consultées divergent sur le champ et les seuils, et un logiciel professionnel n'est peut-être pas concerné.
- Contrôles automatiques : règles `eslint-plugin-jsx-a11y` au lint, `@axe-core/playwright` dans les parcours de bout en bout. Ils ne remplacent pas une revue manuelle (clavier, lecteur d'écran) avant la recette.

### 10. Tests

| Niveau | Outil | Ce qui est testé |
|---|---|---|
| Logique pure | **Vitest** (5.0.3) | dates, formats, validation |
| Composants | **Vitest en mode navigateur** (fournisseur Playwright), réseau simulé par **MSW** (3.0.3) | formulaires, états de chargement et d'erreur, accessibilité des composants. Le mode navigateur est stable depuis Vitest 4.0 ([annonce](https://vitest.dev/blog/vitest-4)) ; il teste dans un vrai navigateur (mise en page, focus) au lieu d'une simulation ; MSW documente son intégration ([recette](https://mswjs.io/docs/recipes/vitest-browser-mode)) |
| Parcours | **Playwright** (1.64.0) contre une **pile Docker isolée avec la vraie API** et le seed | connexion avec second facteur, pointage sur la tablette, fiche de ménage, refus d'accès à une autre crèche |

Les parcours tournent contre la vraie API plutôt que contre des simulations : c'est déjà ainsi que chaque ticket est vérifié (`docker compose -p …`), et cela garde le contrat réel.

### 11. Lint et formatage

- **ESLint 10** + **typescript-eslint** (8.71.1, règles typées) + **eslint-plugin-react-hooks** (7.1.1, qui contient les règles du React Compiler, [annonce](https://react.dev/blog/2025/10/07/react-compiler-1)) + **eslint-plugin-jsx-a11y** (6.10.2) + règle d'imports entre domaines ; **Prettier** pour le formatage. Une configuration à jour et vérifiée en CI dès le premier jour, à l'inverse de la v1 (ANO-002).
- Écartés : Biome (un seul outil, rapide, mais ses règles typées couvrent encore une partie seulement de celles de typescript-eslint, selon les comparatifs consultés) ; Oxlint (rapide, possible plus tard en complément).

### 12. Ce qui n'est pas repris de la v1

- PostHog (analytique) : pas avant une analyse RGPD et un consentement.
- Session tablette en `localStorage` (ANO-001) : remplacée par les cookies de l'API (LUN-43).

## Questions à trancher par Florent

1. **Routeur** : TanStack Router (recommandé) ou React Router 8.
2. **Dossier** : la v2 dans `front/` à la racine, la v1 restant en place, gelée, jusqu'à la bascule.
3. **TP Docker** : il est rendu sur le tag `tp-docker-v1`, qui reste démontrable. Avec l'option C, le type d'image « front » disparaît de la pile courante (les fichiers vont dans `web`). À vérifier si l'oral (LUN-52) porte sur la pile courante ; sinon, sans effet.
4. **Bascule** : la v1 reste en ligne sur Vercel, gelée, pendant la construction de la v2 ; la pile Docker sert la v2 dès son premier écran (connexion).

## Conséquences si l'option C est acceptée

- LUN-114 : squelette `front/` avec les pratiques ci-dessus, écran de connexion et second facteur comme premier écran, types générés vérifiés en CI, build copié dans l'image `web` (configuration nginx `try_files` vers `index.html`, en-têtes, CSP), premiers tests à chaque niveau, puis mesure de la taille et du temps de build.
- Le registre des choix techniques passe la ligne « Front gardé en Next.js pendant la transition » au statut « remplacé ».
- La CI gagne une tâche front : lint, typage, tests, build, contrôle des types générés.

## Sources

Consultées le 2026-10-10.

- Architecture : [React, Build a React app from scratch](https://react.dev/learn/build-a-react-app-from-scratch) ; [IETF, RFC 10017 (BCP 212)](https://www.ietf.org/ietf-ftp/rfc/rfc10017.txt) ; [Next.js, Static Exports (16.4)](https://nextjs.org/docs/app/guides/static-exports) ; [bulletproof-react, structure](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md)
- Sécurité : [React, CVE-2025-55182](https://react.dev/blog/2025/12/03/critical-security-vulnerability-in-react-server-components) ; [Next.js, CVE-2025-29927](https://github.com/vercel/next.js/security/advisories/GHSA-f82v-jwr5-mffw) ; [OWASP, CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) ; [OWASP, CSP](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html) ; [Vite, variables d'environnement](https://vite.dev/guide/env-and-mode) ; [pnpm, minimumReleaseAge](https://pnpm.io/settings/dependency-resolution)
- Outils : [Vite 8](https://vite.dev/blog/announcing-vite8) ; [React Compiler 1.0](https://react.dev/blog/2025/10/07/react-compiler-1) et [installation](https://react.dev/learn/react-compiler/installation) ; [typescript-eslint #12518](https://github.com/typescript-eslint/typescript-eslint/issues/12518) et [#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940) ; [shadcn/ui, Vite](https://ui.shadcn.com/docs/installation/vite) et [formulaires](https://ui.shadcn.com/docs/forms)
- Routage et données : [TanStack Router, routes par fichier](https://tanstack.com/router/latest/docs/framework/react/routing/file-based-routing) et [routes protégées](https://tanstack.com/router/latest/docs/framework/react/guide/authenticated-routes) ; [openapi-react-query](https://openapi-ts.dev/openapi-react-query/) ; [openapi-fetch](https://openapi-ts.dev/openapi-fetch/) ; [Hey API](https://heyapi.dev/openapi-ts/get-started)
- Tests : [Vitest 4](https://vitest.dev/blog/vitest-4) ; [MSW, mode navigateur de Vitest](https://mswjs.io/docs/recipes/vitest-browser-mode)
- Mesures du TP Docker : [docker/front/README.md](../../docker/front/README.md), [docker/README.md](../../docker/README.md)
