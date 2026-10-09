# CLAUDE.md

Référence technique de **Luniqo** pour Claude Code. Le contexte du projet (M2, blocs RNCP, équipe fictive, plan de l'année, état d'avancement) est dans AGENTS.md, importé ci-dessous et à lire en premier.

@AGENTS.md

> Réécrit le 2026-10-08. L'ancien CLAUDE.md (journal de développement jusqu'en février 2026) est archivé dans [docs/archive/CLAUDE-legacy.md](docs/archive/CLAUDE-legacy.md). Il reste utile pour l'historique, mais ses informations ne sont pas vérifiées et certaines sont fausses (versions de Next/React notamment).

## Le produit

Luniqo (anciennement cLean) est une application web de gestion de crèches pour un public francophone : dossiers enfants et familles, présences, personnel et planning, inscriptions et contrats, facturation, portail parents, statistiques, nettoyage des pièces et traçabilité HACCP. Une **entreprise** (compte commercial, un propriétaire) gère une ou plusieurs **crèches** (établissements physiques).

Les docs historiques annoncent les phases 0 à 7 « 100 % complètes ». **Rien n'a encore été vérifié par exécution** : ne pas tenir une fonctionnalité pour opérationnelle tant qu'elle n'a pas été testée.

**v1 et v2.** Le code actuel est la **v1**, désormais gelée : seuls les correctifs de sécurité y sont acceptés. Une **v2** est réécrite progressivement avec un backend dédié (FastAPI) et PostgreSQL, en commençant par le parcours central ([ADR-001](M2/decisions/ADR-001-reecriture-backend.md)). Le front reste en Next.js + React pendant la transition. Tout ce qui suit décrit la v1, sauf mention contraire.

## Stack v1 (lue dans package.json, non installée à ce jour)

| Domaine | Technologie |
|---|---|
| Framework | Next.js `^16.1.6` (App Router), React `^18.3.1`, TypeScript 5 (strict) |
| UI | Tailwind CSS v4, shadcn/ui (Radix), Heroicons, lucide-react, framer-motion / motion, recharts |
| Données / Auth | Supabase Cloud : PostgreSQL, Auth, Storage, Realtime (`@supabase/ssr`, `@supabase/supabase-js`) |
| Intégrations | Stripe (abonnements), Resend (e-mails), PostHog (analytics produit, serveurs EU), OpenFoodFacts, jsPDF |
| Gestionnaire de paquets | **pnpm** (`pnpm-lock.yaml`). Les scripts appellent encore `npx` |
| Tests / CI | v1 : **aucun** test, lint cassé (ANO-002). v2 : pytest (unitaires + intégration PostgreSQL), CI GitHub Actions (`.github/workflows/ci.yml`, LUN-008) |

README.md et l'ancien CLAUDE.md citent d'autres versions (React 19, Next 15). Seul package.json fait foi.

## Commandes

### v1 (Next.js, racine du dépôt)

```bash
pnpm install       # installer (node_modules absent à ce jour)
pnpm dev           # serveur de dev sur localhost:3000
pnpm build         # build de production (TypeScript bloquant : ignoreBuildErrors = false)
pnpm start         # serveur de production
pnpm lint          # ESLint
pnpm seed          # ⚠️ écrit dans la base pointée par .env.local avec la clé service role
```

### v2 (API FastAPI, dossier `api/`)

```bash
cd api && python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements-dev.txt
pytest                          # tests unitaires, sans base (intégration ignorée)
scripts/test-db.sh up           # base PostgreSQL jetable (image luniqo/db), puis exporter TEST_DB_*
pytest -m integration           # tests sur la vraie base ; scripts/test-db.sh down ensuite
alembic upgrade head            # migrations (DB_ADDR, DB_PASSWORD dans l'environnement)
uvicorn app.main:app --reload   # Swagger sur /api/docs
```

Stack v2 : Python 3.14, FastAPI, SQLAlchemy 2 asynchrone + psycopg 3, Alembic, pytest. Dépendances figées dans `api/requirements.txt` (voir [api/README.md](api/README.md)). Routes et accès base **asynchrones** : les routes synchrones ont été écartées après mesure (dépassement de la limite de processus du conteneur sous charge).

### Pile Docker (`docker/`)

```bash
cd docker && docker compose --env-file .env --env-file ../.env up -d --build   # db, api, front, web ; http://localhost:8080
```

Le compose construit l'API depuis `../api` et le front depuis la racine du dépôt.

`pnpm db:reset` lance le même script que `seed`. Ne jamais l'exécuter sans savoir quelle base est visée (voir règle 6 d'AGENTS.md).

Variables d'environnement (`.env.local`, ignoré par git) : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`, `RESEND_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`. Il n'existe pas encore de `.env.example`.

## Carte du dépôt

```
app/                 routes Next.js (App Router), une route group par rôle
components/          ui/ (shadcn), layout/, shared/, forms/, dashboard/, analytics/, tablet/
api/                 v2 : API FastAPI (squelette), migrations Alembic, tests
lib/services/        54 services d'accès aux données (un par domaine), exécutés pour la plupart dans le navigateur
lib/actions/         server actions (création d'utilisateurs, invitations, Stripe) — clé service role
lib/contexts/        AuthContext, NurseryContext, TabletAuthContext, PopupEventContext
lib/supabase/        clients navigateur, serveur et middleware
lib/utils/           auth (client/serveur), dates, catégories par défaut
types/               database.types.ts (généré par Supabase), auth.types.ts, analytics.types.ts
supabase/migrations/ migrations SQL numérotées (voir « Base de données »)
scripts/seed.ts      jeu de données de démo
proxy.ts             middleware Next 16 (ex-middleware.ts) → lib/supabase/middleware.ts
docs/                documentation historique du produit (design system, phases, Stripe, PostHog)
M2/                  travaux et preuves du M2 : décisions, anomalies, fiches de cours (voir AGENTS.md)
docker/              conteneurisation : images (base, db, api, front, web), compose, documentation
maquette/, marketing/  captures et contenus marketing (marketing/ est ignoré par git)
```

## Architecture

### Rôles et authentification

| Rôle | Authentification | Espace |
|---|---|---|
| Developer (éditeur de la plateforme) | Supabase Auth, e-mail + mot de passe | `/developer/*` : métriques, entreprises, permissions de modules |
| Owner (direction) | Supabase Auth | `/owner/*` ; sans entreprise → `/setup` (assistant entreprise + première crèche) |
| Employee | Supabase Auth pour `/employee/*` **et** e-mail + PIN à 4 chiffres pour `/tablet/*` | Le PIN est haché en bcrypt mais vérifié dans le navigateur (ANO-001) ; la session tablette est en localStorage |
| Parent / responsable légal | Supabase Auth + ligne `guardian_user` (invitation par la crèche) | `/portal/*` |

- Tous les comptes Supabase ont une ligne `profiles` (1:1 avec `auth.users`, créée par trigger). Rôles en base : enum `user_role` = `Developer | Owner | Employee`. Les parents passent par `guardian_user`, pas par `profiles.role`.
- `enterprise.owner_id` → `profiles.id` pour un Owner (0 ou 1 entreprise). `profiles.enterprise_id` → `enterprise.id` pour un Employee. Ne pas chercher l'entreprise d'un Owner via `profiles.enterprise_id`.
- Un `username` est généré pour chaque employé (`Prénom N`, « Marie D », lettres du nom ajoutées en cas de collision). La page de connexion tablette actuelle demande pourtant l'e-mail.
- Le middleware (`proxy.ts`) rafraîchit la session Supabase et redirige vers `/login` hors routes publiques. Les routes `/tablet/*` le contournent. La redirection vers `/setup` est faite côté client dans `AuthContext`.
- Protection d'une page : `useRequireAuth(['Owner'])`. `AuthContext` garde un cache de session de 5 minutes pour éviter les écrans de chargement au changement d'onglet.

### Où s'exécute la logique

139 pages sur 141 sont des composants client et 44 services sur 54 utilisent le client Supabase du navigateur. Les règles métier, les filtres par crèche et la plupart des contrôles d'accès tournent donc chez l'utilisateur, qui interroge directement la base via l'API REST de Supabase avec la clé publique. Les seuls traitements serveur sont le middleware, les server actions de `lib/actions/` et les routes Stripe. C'est la raison principale de la réécriture.

### Multi-crèches

```
Enterprise ── Owner
   ├── Nursery A ── pièces, sessions, enfants, présences, HACCP…
   └── Nursery B ── …
Partagé au niveau entreprise : employés (accès par employee_nursery_access), modèles et catégories de tâches
```

- Données opérationnelles filtrées par `nursery_id`, données partagées par `enterprise_id`.
- Les pages opérationnelles lisent la crèche courante via `useNursery()` (`lib/contexts/NurseryContext.tsx`). La sélection est mémorisée en localStorage et changée par `NurserySelector` dans le header.
- Accès aux modules par crèche : tables `nursery_module_access*`, `lib/services/modules.service.ts`, `useModuleAccess()`.

### Routes

`(auth)` login/register · `(owner)` /owner/* + /setup · `(employee)` /employee/* · `(developer)` /developer/* · `(portal)` /portal/* · `(tablet)` /tablet/* · `api/stripe/*` (checkout, portal, webhooks) · `auth/callback` (OAuth).

## Règles de code

0. **v1 gelée.** Pas de nouvelle fonctionnalité dans la v1 : seulement des correctifs de sécurité. Le nouveau code backend va dans la v2.
1. **Isolation des données.** Toute requête filtre par `nursery_id` (opérationnel) ou `enterprise_id` (partagé). Seul le rôle Developer lit plusieurs entreprises. La RLS ne protège rien aujourd'hui (voir plus bas) : le filtre applicatif est la seule barrière.
2. **Bon client Supabase.** `@/lib/supabase/client` dans les composants client, `await createClient()` de `@/lib/supabase/server` côté serveur. La clé service role reste dans `lib/actions/` (serveur uniquement).
3. **Dates en heure locale.** Utiliser `formatDateLocal()`, `getTodayLocal()`, `getDateWithOffset()` de `lib/utils/date.ts`. Jamais `toISOString().split('T')[0]` (décalage UTC : un pointage à 0 h 30 en France tombe la veille).
4. **Select shadcn.** Jamais `value=""` : utiliser `value="none"` et convertir dans le handler.
5. **UI.** Composants shadcn/ui existants d'abord, palette pastel « Douceur Professionnelle » (voir `docs/DESIGN-SYSTEM.md` et la skill `design-system-enforcer`), états de chargement et vides, grands boutons en contexte tablette.
6. **Typage.** Pas de nouveau `@ts-nocheck`. Quatre services en ont déjà (`attendance`, `daily-logs`, `observations`, `activities`) : à résorber.
7. **Tests.** Toute nouvelle règle métier (pointage, permissions, facturation) arrive avec ses tests unitaires dès que le harnais existe (phase 2).
8. **Migrations.** Une nouvelle migration = un nouveau fichier numéroté, jamais la modification d'une migration déjà appliquée. Pas de copie suffixée « 2 ».

## Base de données

- `supabase/migrations/` : 131 fichiers, dont ~60 copies suffixées « 2 » et des numéros en double (63, 64, 69). Il n'y a pas de configuration Supabase CLI : historiquement, les scripts étaient collés dans l'éditeur SQL du dashboard. **L'ordre d'application réel et l'état du schéma distant sont inconnus.** C'est le premier chantier de la conteneurisation.
- `supabase/README.md` documente le schéma (~72 tables, diagramme Mermaid, état au 2026-01-20).
- 13 migrations dépendent du schéma `auth` de Supabase (`auth.users`, `auth.uid()`, `auth.jwt()`), et 32 fonctions SQL sont appelées par `.rpc()`. Toute base hors Supabase doit fournir ces éléments.
- `01_dev_permissions.sql` **désactive la RLS** sur les tables principales. Seules quelques migrations plus récentes (phases 2, 6, 7) en réactivent.

### Couplage à Supabase (mesuré le 2026-10-08)

86 fichiers importent un client Supabase · ~1 050 appels `.from()` sur 121 tables · 32 RPC · Auth : `getUser`, `signInWithPassword`, `signInWithOAuth`, `exchangeCodeForSession`, `admin.createUser/deleteUser/listUsers` · Storage : bucket `documents` · Realtime : 2 canaux dans `messaging.service.ts`. Ces chiffres ont motivé [ADR-001](M2/decisions/ADR-001-reecriture-backend.md) : réécriture avec un backend dédié plutôt qu'auto-hébergement de Supabase.

## Points de vigilance connus

Issus d'une lecture statique du code, sans exécution :

- **Sécurité** : la connexion tablette lit le haché du PIN depuis le navigateur et le vérifie côté client, sans RLS sur `profiles`. Détail et correctif envisagé : [ANO-001](M2/bloc-4-maintien-operationnel/anomalies/ANO-001-pin-tablette.md).
- La session tablette en localStorage n'est pas une session serveur : les requêtes tablette s'exécutent avec la clé publique.
- Documentation contradictoire (README, docs/phases, ancien CLAUDE.md) et nombreux doublons « 2 » (128 fichiers suivis par git). Identifier la version de référence avant de nettoyer.
- `scripts/seed.ts` crée de vrais comptes Auth avec la clé service role : à n'exécuter que sur une base de test.
- Ancienne tentative Docker (Dockerfile, Redis, Makefile) sur la branche distante `origin/docker`, jamais utilisée : supprimée le 2026-10-08. Le tag local `archive/origin-docker` la conserve.

## Infrastructure cible (à construire)

Détails et choix dans AGENTS.md et les ADR de `M2/decisions/`.

- **v2** : `api/` (voir « Commandes » et [api/README.md](api/README.md)). Fait : authentification (ADR-003, LUN-003), entreprises, crèches et accès par crèche (LUN-004), tablette et PIN (LUN-005, corrige ANO-001 en v2), familles et enfants sans données de santé (LUN-009), pointage depuis la tablette (LUN-010), comptes et consultation famille (LUN-011) : le parcours central est complet côté API. Second facteur obligatoire pour la direction et l'éditeur : TOTP chiffré et codes de secours (LUN-006, partie 1). À venir : passkeys (LUN-006, partie 2), données de santé après analyse RGPD/HDS (LUN-019), enfants et familles, pointage, client TypeScript généré depuis le schéma OpenAPI. Choix et sources : [M2/decisions/CHOIX-TECHNIQUES.md](M2/decisions/CHOIX-TECHNIQUES.md), à tenir à jour.
- **Docker Compose** : passerelle nginx, front Next.js, API, PostgreSQL **fonctionnent** (TP Docker, [M2/cours/docker.md](M2/cours/docker.md)). Pour le front : `output: 'standalone'` dans `next.config.mjs` et une route `app/healthz` exclue du middleware ; ne pas les retirer. Images construites par nos soins (aucune image Docker Hub, base `FROM scratch`), arguments de ressources, healthchecks, gestion des signaux, non-root, lecture seule.
- **CI** (GitHub Actions, `.github/workflows/ci.yml`) : ruff, tests unitaires et d'intégration de l'API, build des 5 images, démarrage de la pile et sondes, sur chaque PR et push sur `main`.
- **CD** : images publiées et taguées, déploiement sur VPS (recette puis production), retour arrière par tag.
- **Exploitation** : sondes sur le parcours critique, alertes, sauvegardes PostgreSQL, journal des versions (`CHANGELOG.md`).

## Documentation existante

| Document | Statut |
|---|---|
| [AGENTS.md](AGENTS.md) | Orientation M2, à jour |
| [M2/FIL-ROUGE-RNCP39583.md](M2/FIL-ROUGE-RNCP39583.md) | Plan annuel et matrice des preuves, à jour |
| [M2/decisions/](M2/decisions/), [M2/bloc-4-maintien-operationnel/anomalies/](M2/bloc-4-maintien-operationnel/anomalies/), [M2/cours/](M2/cours/) | Décisions (ADR), anomalies, fiches de cours |
| [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md), [docs/COMPONENTS.md](docs/COMPONENTS.md) | Référence UI, à vérifier |
| [supabase/README.md](supabase/README.md) | Schéma de base, état janvier 2026 |
| [docs/POSTHOG.md](docs/POSTHOG.md), docs/STRIPE-*.md | Intégrations, à vérifier |
| [docs/phases/](docs/phases/) | Historique des phases 0–9, pourcentages non vérifiés |
| README.md, docs/INDEX.md, plan.md | Obsolètes : à réécrire ou archiver |

Skills projet dans `.claude/skills/` : `database-helper`, `design-system-enforcer`, `frontend-design`, `lucide-animated`, `luniqo-security-audit`, `stripe-integration`.

## Git

- Dépôt : `github.com/zharrow/Luniqo` (anciennement `nursery-app`), branche principale `main`, une branche par ticket, fusion par PR.
- Conventions de tickets, de branches, de commits et de versions : voir AGENTS.md.
- **Un seul dépôt** pour tout le projet (v1, v2, TP, documentation M2). L'ancien dépôt `zharrow/TP-Docker` n'est plus utilisé.
- Le dépôt est **public** : aucun secret, aucune donnée réelle, pas d'autre personne réelle que celles citées dans AGENTS.md.
