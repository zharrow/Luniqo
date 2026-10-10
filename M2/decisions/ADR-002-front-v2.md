# ADR-002 — Front v2 : garder Next.js ou passer à React + Vite

| | |
|---|---|
| Statut | **Proposée** le 2026-10-10, en attente de la décision de Florent et de l'équipe du cours de coordination |
| Date | 2026-10-10 |
| Décideur | Florent `[RÉEL]`, après avis de Pauline (front) et Thomas (fullstack), qui travaillent sur le front dans le cours « Coordination Front & Back ». L'assistant a rédigé la comparaison et la recommandation |
| Ticket | LUN-113, sous-tâche de la story LUN-79 (Socle du front v2) |
| Prolonge | [ADR-001](ADR-001-reecriture-backend.md), qui gardait Next.js « pendant la transition » et renvoyait ce choix ici |
| Compétences | C1.3.2 (choix d'architecture), C1.3.1 (veille, sources), C2.2.3 (sécurité), C3.2.2 (arbitrage) |

## Contexte

Faits relevés dans le dépôt le 2026-10-10 :

- **Toute la logique est désormais dans l'API v2** (FastAPI) : contrôle d'accès, règles métier, horodatage. Le front n'a plus qu'à afficher et à saisir. Tout le MVP de la story map est fait côté API (LUN-41 à LUN-49, LUN-55, LUN-76 à LUN-78) ; **aucun écran v2 n'existe**.
- **L'authentification passe par un cookie `HttpOnly`** (`__Host-luniqo_session`), front et API étant servis sur la même origine par la passerelle nginx (`/` → front, `/api/` → API). Le code du navigateur ne voit jamais de jeton ; l'API vérifie l'en-tête `Origin` (ADR-003).
- **Tout est derrière une connexion**, sauf quelques pages publiques (politique de confidentialité, accueil). Le référencement ne compte que pour ces quelques pages.
- **La v1 doit de toute façon être réécrite écran par écran** : 139 pages sur 141 sont des composants client branchés sur Supabase (CLAUDE.md). Ce qui se réutilise tel quel, quel que soit le choix : composants shadcn/ui, Tailwind, palette « Douceur Professionnelle ».
- **Image du front v1 mesurée** pendant le TP Docker ([docker/front/README.md](../../docker/front/README.md)) : 302 Mo (Node.js 24 + serveur Next.js), 72 à 151 Mo de mémoire, et **la limite d'un cœur atteinte** avec 30 rendus simultanés de `/login`. L'image nginx `web` pèse 26 Mo et sert déjà des fichiers statiques.
- Deux failles critiques ont touché les serveurs Next.js depuis le début du projet :
  - [CVE-2025-29927](https://github.com/vercel/next.js/security/advisories/GHSA-f82v-jwr5-mffw) (mars 2025, CVSS 9,1) : un en-tête permettait de contourner le middleware de Next.js, et avec lui les contrôles d'accès qui s'y trouvaient ;
  - [CVE-2025-55182](https://react.dev/blog/2025/12/03/critical-security-vulnerability-in-react-server-components) (décembre 2025, CVSS 10) : exécution de code à distance **sans authentification** dans React Server Components, qui touchait Next.js App Router 15 et 16. L'annonce de React précise : « si le code React de votre application n'utilise pas de serveur, votre application n'est pas concernée ».

## Options

| Critère | A. Next.js, rendu serveur (comme la v1) | B. Next.js en export statique | **C. React + Vite, application monopage (SPA)** |
|---|---|---|---|
| Principe | Un serveur Node.js rend les pages ; Server Components, middleware, Server Actions | `next build` produit des fichiers statiques servis par nginx ; plus de serveur Node | Vite construit des fichiers statiques servis par nginx ; routage et données dans le navigateur |
| Adéquation à l'architecture | Faible : la logique serveur de Next.js doublerait celle de l'API, avec deux endroits où vérifier les accès | Moyenne | **Bonne** : le front n'est qu'un client de l'API |
| Routes à identifiant (`/enfants/{id}`, `/pieces/{id}`) | Oui | **Non** : les routes dynamiques sans liste connue à la compilation (`generateStaticParams`) ne sont pas prises en charge ; il faudrait passer les identifiants en paramètre d'URL | Oui |
| Surface d'attaque côté front | Un serveur Node exposé, exécutant du code applicatif (les deux CVE ci-dessus) | Fichiers statiques | **Fichiers statiques** : une faille du front reste dans le navigateur et ne donne pas accès au serveur |
| Exploitation | Un conteneur Node de plus : 302 Mo, 72 à 151 Mo de mémoire, un cœur saturé à 30 rendus simultanés (mesuré) | Fichiers dans l'image nginx existante | Fichiers dans l'image nginx existante. **Taille et temps de build non mesurés** à ce stade |
| Fonctions de Next.js encore utiles | Toutes | Presque aucune : ni middleware, ni cookies, ni en-têtes, ni redirections, ni Server Actions | Sans objet ; routeur et gestion des données à choisir |
| Reprise de la v1 | Structure des dossiers et habitudes conservées ; pages à réécrire quand même (Supabase) | Idem, avec les limites ci-dessus | Composants shadcn/ui et Tailwind repris ; pages réécrites dans une autre structure |
| Première page affichée | Rapide (HTML rendu par le serveur) | Rapide pour les pages connues à la compilation | Un écran de chargement le temps du premier téléchargement (sans enjeu derrière une connexion) |
| Développement | Rechargement à chaud correct | Idem | Rechargement à chaud très rapide ; option recommandée par la [documentation de React](https://react.dev/learn/build-a-react-app-from-scratch) pour une application sans framework |
| Risque principal | Deux serveurs à sécuriser et à maintenir | Contourner les limites de l'export | « Construire son propre framework » (React) : routeur, données, gestion des erreurs à assembler soi-même |

## Recommandation de l'assistant : option C

**React + Vite**, servi en fichiers statiques par l'image nginx `web` :

- **Routeur : TanStack Router**. Les paramètres d'URL et les filtres (`?day=`, `?from=`) sont typés et validés, ce qui va avec un client d'API typé. React Router (mode données) est une alternative acceptable si l'équipe le connaît mieux.
- **Données : TanStack Query** (cache, états de chargement et d'erreur, nouvelle tentative), recommandé par la documentation de React pour une API REST.
- **Client d'API : `openapi-typescript` + `openapi-fetch`**. Les types sont générés depuis `/api/openapi.json`, avec un client très léger sans code généré à maintenir. La CI régénère les types et échoue s'ils diffèrent de ceux du dépôt : le front ne peut pas dériver de l'API sans que cela se voie.
- **Réutilisés** : shadcn/ui, Tailwind CSS v4, palette du design system.

Raisons, dans l'ordre :

1. Le front n'a plus de logique serveur à porter : un serveur Node ne ferait que doubler l'API, avec une deuxième surface d'attaque (les deux CVE).
2. Une image et un conteneur de moins à exploiter, et plus de saturation du processeur au rendu.
3. L'export statique de Next.js (B) garde la complexité de Next.js sans ses avantages, et bloque les routes à identifiant.

Ce que la recommandation coûte : l'équipe assemble elle-même routeur, données et gestion des erreurs (le risque signalé par React), et perd les conventions de la v1. Ce coût est payé une fois, dans le squelette (LUN-114).

Versions actuelles, lues sur le registre npm le 2026-10-10 : Vite 8.3.4, React 19.3.0, @tanstack/react-router 1.170.42, @tanstack/react-query 5.104.1, openapi-typescript 7.13.0, openapi-fetch 0.17.0 ; pour comparaison Next.js 16.4.0, react-router 8.4.0. À figer dans le lockfile au moment du squelette.

## Questions à trancher avec l'équipe

1. **Compétences** : Pauline et Thomas connaissent-ils Next.js, Vite, TanStack Router ou React Router ? Une préférence nette de l'équipe peut faire changer le routeur sans changer l'option.
2. **Dossier** : le code v1 occupe la racine. Proposition : la v2 dans un dossier `front/` à la racine, la v1 restant en place, gelée, jusqu'à la bascule.
3. **TP Docker** : il est rendu sur le tag `tp-docker-v1`, qui reste démontrable. Avec l'option C, le type d'image « front » disparaît de la pile courante (les fichiers vont dans `web`). À vérifier si l'oral (LUN-52) porte sur la pile courante ; sinon, sans effet.
4. **Bascule** : la v1 reste en ligne sur Vercel, gelée, pendant la construction de la v2 ; la pile Docker sert la v2 dès son premier écran (connexion).

## Conséquences si l'option C est acceptée

- LUN-114 : squelette `front/` (Vite, TypeScript strict, Tailwind, shadcn/ui), écran de connexion avec second facteur, client généré, vérification des types générés en CI, build copié dans l'image `web`, configuration nginx (`try_files` vers `index.html` pour le routage côté navigateur, en-têtes de sécurité dont une politique CSP).
- Le registre des choix techniques passe la ligne « Front gardé en Next.js pendant la transition » au statut « remplacé ».
- Tests du front à définir (Vitest, et un parcours de bout en bout) : critère qualité du BC02.

## Sources

- [React, Build a React app from scratch](https://react.dev/learn/build-a-react-app-from-scratch), consulté le 2026-10-10
- [React, avis CVE-2025-55182 du 2025-12-03](https://react.dev/blog/2025/12/03/critical-security-vulnerability-in-react-server-components), consulté le 2026-10-10
- [Next.js, avis GHSA-f82v-jwr5-mffw (CVE-2025-29927)](https://github.com/vercel/next.js/security/advisories/GHSA-f82v-jwr5-mffw), consulté le 2026-10-10
- [Next.js, Static Exports (version 16.4)](https://nextjs.org/docs/app/guides/static-exports), consulté le 2026-10-10
- Mesures du TP Docker : [docker/front/README.md](../../docker/front/README.md), [docker/README.md](../../docker/README.md)
