# Luniqo

Logiciel de gestion de crèches : enfants et familles, pointage des présences sur
tablette, personnel, fiche de ménage, portail des parents.

[![CI](https://github.com/zharrow/Luniqo/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/zharrow/Luniqo/actions/workflows/ci.yml)

Ce README s'adresse aux développeurs qui rejoignent le projet. Pour contribuer
(branches, versions, tickets, PR), lire ensuite [CONTRIBUTING.md](CONTRIBUTING.md).

## Le projet

### D'où il vient

Luniqo est né d'un besoin réel : la directrice d'une micro-crèche de
Haute-Garonne remplissait chaque jour à la main ses fiches de ménage et devait
les conserver. Le premier module les a digitalisées. Le projet s'est ensuite
étendu à la cuisine (HACCP), puis à tout ce qu'une crèche gère au quotidien,
pour viser les micro-crèches, les crèches et les groupes qui en possèdent
plusieurs.

### Ce qu'il fait : le parcours central

Une **entreprise** (compte commercial) gère une ou plusieurs **crèches**. Le
parcours qui doit fonctionner de bout en bout :

1. La direction crée une crèche et donne accès à son personnel.
2. Sur la tablette de la crèche, un employé tape son PIN et pointe l'arrivée
   puis le départ d'un enfant. Le départ est refusé si la personne venue le
   chercher n'y est pas autorisée.
3. La direction consulte les présences du jour.
4. Un parent, invité par la crèche, ne voit que ses propres enfants.
5. Un accès à une crèche d'une autre entreprise est refusé.

| Rôle | Ce qu'il fait |
|---|---|
| Direction (`owner`) | Gère les crèches de son entreprise, le personnel, les familles. Second facteur obligatoire |
| Employé (`employee`) | Pointe sur la tablette avec son PIN, consulte les crèches qui lui sont accordées |
| Famille (`guardian`) | Consulte les présences de ses enfants |
| Éditeur (`developer`) | Administre la plateforme, sans accès aux données des crèches |

### Deux versions dans le même dépôt

| | v1 (racine du dépôt) | v2 (dossier [`api/`](api/)) |
|---|---|---|
| Rôle | Application d'origine, **gelée** : seuls les correctifs de sécurité y entrent | Réécriture progressive avec un vrai backend |
| Technologies | Next.js 16, React 18, Supabase Cloud (accès direct à la base depuis le navigateur) | FastAPI (Python 3.14), PostgreSQL 18, SQLAlchemy asynchrone, Alembic |
| État au 2026-10-09 | Fonctionne sur Supabase, sans tests | Parcours central complet **côté API**, 369 tests, second facteur. Le front v2 reste à construire ([ADR-002](M2/decisions/), à ouvrir) |

Pourquoi réécrire : [ADR-001](M2/decisions/ADR-001-reecriture-backend.md). La
logique métier et les contrôles d'accès de la v1 s'exécutent dans le navigateur.

```
Navigateur ──HTTP :8080──▶ web (nginx) ──/──────▶ front (Next.js, v1)  ──▶ Supabase Cloud
                                       └─/api/──▶ api (FastAPI, v2) ──SQL──▶ db (PostgreSQL)
```

## Installer le projet

### Prérequis

| Outil | Version | Pour |
|---|---|---|
| Git | récent | tout |
| Docker avec Compose v2 (`docker compose`) | | la pile complète, la base de test |
| Python | 3.14 (version de l'image et de la CI) | l'API v2 |
| Node.js et pnpm | pnpm, lockfile au format 9 | le front v1 |

```bash
git clone https://github.com/zharrow/Luniqo.git
cd Luniqo
git switch develop          # branche d'intégration : on part toujours d'elle
```

### Option 1 : toute la pile avec Docker (le plus simple)

```bash
cd docker
docker compose up -d --build     # construit les 5 images et lance les 4 services
docker compose ps                # db, api, front et web doivent être "healthy"
```

| Adresse | Contenu |
|---|---|
| <http://localhost:8080> | l'application (front v1) |
| <http://localhost:8080/api/docs> | documentation Swagger de l'API v2, pour l'essayer |
| <http://localhost:8080/api/health> | état de l'API et de sa base |

Pour avoir des comptes de démonstration (données **synthétiques**, adresses en
`.test`), créer un fichier `.env` à la racine du dépôt (jamais versionné) :

```bash
API_SEED_DEMO_PASSWORD=une-phrase-de-passe-d-au-moins-15-caracteres
```

puis lancer depuis `docker/` : `docker compose --env-file .env --env-file ../.env up -d --build`.
Comptes créés : `direction@demo.test`, `employe@demo.test`… La direction doit
enregistrer une application d'authentification (TOTP) à sa première connexion.

### Option 2 : travailler sur l'API v2

```bash
cd api
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements-dev.txt
pytest                                  # tests unitaires, sans base (quelques secondes)

scripts/test-db.sh up                   # PostgreSQL jetable, affiche la ligne export à copier
export TEST_DB_ADDR=127.0.0.1:55432 TEST_DB_NAME=luniqo_test TEST_DB_PASSWORD=luniqo-test
pytest                                  # unitaires + intégration sur la vraie base
scripts/test-db.sh down
ruff check .                            # lint, comme en CI
```

Lancer l'API en local, nouvelle migration, variables d'environnement :
[api/README.md](api/README.md).

### Option 3 : le front v1

```bash
pnpm install
# Créer .env.local (non versionné) avec les variables listées dans CLAUDE.md
# (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY…)
pnpm dev                     # http://localhost:3000
```

La v1 interroge directement un projet Supabase. **Ne jamais lancer `pnpm seed`**
sans savoir quelle base est visée : le script écrit avec la clé
d'administration.

## Travailler ensemble

| Sujet | Où |
|---|---|
| Branches, versions (SemVer), cycle de vie d'un ticket, PR, Definition of Done | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Tickets, sprints, boards | Jira, projet **LUN** (lien communiqué à l'équipe) |
| Configuration de Jira et de son lien avec GitHub | [docs/projet/JIRA.md](docs/projet/JIRA.md) |
| Versions publiées | [CHANGELOG.md](CHANGELOG.md) et les tags `vX.Y.Z` |
| Personas et story map (vision produit, MVP) | [docs/produit/](docs/produit/) : [personas](docs/produit/PERSONAS.md), [story map](docs/produit/STORY-MAP.md) |
| Choix techniques et leurs raisons | [M2/decisions/](M2/decisions/), dont le [registre](M2/decisions/CHOIX-TECHNIQUES.md) |

### Équipe du cours « Coordination Front & Back »

| Membre | Rôle |
|---|---|
| Florent | Chef de projet |
| Thomas | Développeur fullstack |
| Pauline | Développeuse frontend |
| Julien | Développeur backend |

Luniqo est aussi le projet fil rouge du M2 de Florent (Ynov Toulouse) : le
dossier [`M2/`](M2/) contient les preuves et la documentation de ce diplôme.

## Lancer Luniqo avec Docker (cours Docker, M2)

Le dossier [`docker/`](docker/) répond au TP « Projet - Docker Cloud » du M2
(Ynov Toulouse) : concevoir ses propres images, sans Docker Hub, et les
orchestrer avec docker compose. Version rendue : tag `tp-docker-v1`.

| Image | Rôle pour le TP | Contenu |
|---|---|---|
| `base` | socle commun | Alpine Linux construit depuis `scratch`, tini, utilisateur non-root |
| `web` | **serveur web** | nginx, seul point d'entrée, relaie vers le front et l'API |
| `front` | **front** | l'application Next.js de ce dépôt, en serveur autonome |
| `api` | **back** | l'API FastAPI de la v2 (dossier [`api/`](api/)) |
| `db` | base de données | PostgreSQL 18, données dans un volume |

| Exigence | Réponse |
|---|---|
| Aucune image Docker Hub | Toutes les images partent de `scratch` (archive officielle d'Alpine) ou de notre image `base` ; compose ne fait jamais de `pull` |
| Au moins un front, un back et un serveur web | `front`, `api` et `web`, plus `db` |
| Arguments de ressources au run et dans le compose | Limites CPU, mémoire et processus réglées dans [`docker/.env`](docker/.env), plus des arguments applicatifs alignés sur ces limites (workers, connexions, mémoire de Node.js...) |
| Dépendances, manipulations sur l'OS, arguments, entrypoints expliqués | Un README par image : [base](docker/base/README.md), [db](docker/db/README.md), [api](docker/api/README.md), [front](docker/front/README.md), [web](docker/web/README.md) |
| Limitations de ressources expliquées | Justifiées par des mesures réelles (repos et charge) dans le [README du dossier docker](docker/README.md) |
| SIGTERM gérés | Chaque service s'arrête proprement (signal adapté à chaque programme) ; toute la pile s'arrête en moins d'une seconde |
| Ordre de démarrage | `db` et `front` en parallèle, puis `api` quand la base est saine, puis `web` quand l'API et le front sont sains (healthchecks) |
| Schéma des communications | Dans le [README du dossier docker](docker/README.md), avec les réseaux et les ports |

Tout le détail (architecture, choix, mesures, problèmes rencontrés) est dans
[`docker/README.md`](docker/README.md).

Le front utilise encore Supabase Cloud pour la connexion (v1). Pour pouvoir s'y
connecter, renseigner `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`
dans le `.env` à la racine (non versionné). Sans ce fichier, les pages
s'affichent mais la connexion de la v1 échoue.

## Carte du dépôt

```
app/, components/, lib/   front v1 (Next.js), gelé
api/                      API v2 (FastAPI) : code, migrations, tests
docker/                   conteneurisation : 5 images, compose
supabase/                 migrations SQL de la v1
.github/                  CI, conventions de PR, étiquettes, modèle de PR
docs/projet/              organisation du projet : Jira, import du backlog
docs/produit/             vision produit : personas, story map
docs/                     documentation historique de la v1 (à vérifier)
M2/                       preuves du diplôme : décisions (ADR), anomalies, cours
```
