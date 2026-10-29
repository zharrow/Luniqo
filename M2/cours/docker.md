# Fiche de travail — Cours Docker : « mon propre cloud » sur Luniqo

| | |
|---|---|
| Cours | Docker (M2, Ynov Toulouse) |
| Sujet | TP « Projet - Docker Cloud » : images personnalisées orchestrées avec Compose (sujet complet : `docker/TP.md`, non versionné). **Évolution du sujet** reçue le 2026-10-29 (`docker/TP-UPDATE.md`, non versionné) : consigne supplémentaire (2 conteneurs de scaling ou de CI/CD, 2 points), barème revu, et demande en cours d'un benchmark de la consommation CPU des conteneurs |
| Échéance | Dernière des 4 séances. 2 séances passées au 2026-10-08 |
| Rendu | Lien git, dernier commit avant la date butoir : dépôt public `zharrow/Luniqo`, dossier `docker/` |
| Oral | Aucun (Florent, 2026-10-27) |
| Compétences RNCP | C2.1.1 (environnements, déploiement), C1.5 (schéma d'architecture), C2.2.2 (tests), C2.2.3 (sécurité), C4.1.2 (healthchecks, première brique de supervision) |
| Statut | Sujet initial couvert au tag `tp-docker-v1` (2026-10-08). **Consigne supplémentaire et benchmark couverts** le 2026-10-29 (LUN-115, branche `infra/LUN-115-ci-docker`) : conteneurs `lint` et `test` enchaînés par `pipeline.sh`, banc de mesure CPU. Reste : PR, décision sur l'image front (voir « Reste à faire »), tag de rendu |

## Contraintes imposées par le sujet

1. **Aucune image Docker Hub** : toutes les images sont construites et personnalisées par nos soins.
2. Au moins **3 types d'images** : un front, un back et un « serveur web ».
3. Tous les conteneurs reçoivent des **arguments qui règlent les ressources allouées**, au run et dans le compose.
4. Barème : documentation des dépendances, des manipulations sur l'OS, des arguments et des entrypoints ; arguments traduits dans le compose ; limites de ressources expliquées ; **SIGTERM gérés** ; **dépendances de démarrage** ; **schéma des communications**.
5. Le contenu applicatif peut être minimal (« un Hello World suffit »).
6. **Consigne supplémentaire** (2026-10-29) : ajouter au moins 2 conteneurs associés à l'orchestration ou à la CI/CD, au choix parmi un conteneur de scaling, de lint ou de tests (exemples du cours dans `docker/docs/`, non versionné). Notés 1 point chacun ; les critères d'origine passent de 1 à 0,5 point pour la mise en forme, les dépendances, les arguments et l'ordre de démarrage.
7. **Benchmark** demandé en cours (2026-10-29) : mesurer la consommation CPU due aux conteneurs.

## Problème Luniqo traité

Faire tourner Luniqo dans des conteneurs entièrement maîtrisés, avec PostgreSQL, et poser la première brique de la v2 (ADR-001) : un squelette d'API FastAPI branché sur la base. On garde **Next.js + React** pour le front.

Exclusions : pas de migration des données de la v1, pas de bascule du front vers l'API, pas de déploiement sur VPS.

## Ce qui est livré

| Élément | Où | État |
|---|---|---|
| Image de base `FROM scratch` (reprise du premier TP) | `docker/base/` | Fait |
| Image `db` : PostgreSQL 18, init au premier démarrage, secret, arrêt `SIGINT` | `docker/db/` | Fait, mesuré |
| Image `api` : FastAPI, multi-stage, migrations au démarrage | `docker/api/` | Fait, mesuré |
| Image `web` : passerelle nginx, résolution DNS par requête, page d'indisponibilité | `docker/web/` | Fait, mesuré |
| Compose, `.env`, secret, réseaux `edge` / `backend` | `docker/` | Fait |
| Documentation : README principal + un README par image, schémas Mermaid, correspondance avec le barème | `docker/` | Fait |
| Squelette de l'API v2 : modèle, migration Alembic, données synthétiques, 7 tests unitaires | `api/` | Fait, tests au vert |
| Image `front` : Next.js en serveur autonome ; `next.config.mjs` (`output: 'standalone'`), route `app/healthz/route.ts`, exclusion dans `proxy.ts` | `docker/front/`, racine | Fait, mesuré ; **retirée** par LUN-114 (front v2 servi par `web`), conservée au tag `tp-docker-v1` |
| Image `lint` : ruff (binaire seul), ShellCheck, contrôle « zéro image Docker Hub » sur les `FROM`, sans réseau | `docker/lint/` | Fait, mesuré (2026-10-29) |
| Image `test` : pytest, tests unitaires et d'intégration sur une base `test-db` jetable (image `luniqo/db`, données en tmpfs) | `docker/test/` | Fait, mesuré (2026-10-29) |
| Chaîne lint → test → déploiement : `docker-compose.ci.yml`, `pipeline.sh`, job « Chaîne de CI en conteneurs » de la CI GitHub | `docker/`, `.github/workflows/ci.yml` | Fait, échecs provoqués vérifiés |
| Banc de mesure CPU : `bench/bench.sh`, image `bench` (wrk), `docker-compose.bench.yml`, résultats bruts | `docker/bench/` | Fait, 3 passages sur chaque pile |

L'architecture et les mesures détaillées sont dans le [README du TP](../../docker/README.md).

## Mesures `[RÉEL]` (2026-10-08, Mac Apple Silicon, OrbStack, Docker 29)

| Mesure | Résultat |
|---|---|
| Tailles d'images | base 23 Mo, web 26 Mo, db 83 Mo, api 186 Mo, front 302 Mo |
| Build complet sans cache (5 images) | 60 s |
| Démarrage complet jusqu'à `healthy` | 18,5 s pour les 4 services (volume vide ou non), surtout l'attente des healthchecks |
| Mémoire au repos | db 20 à 45 Mo, api 69 Mo, front 72 à 122 Mo, web 3 Mo : environ 200 Mo au total |
| Charge API : 3 000 requêtes, 60 simultanées, via la passerelle | 3 000 réponses 200 en 8,8 s ; api 73 Mo, 6 pids, 49 % CPU (sa limite de 0,5) ; db 32 Mo, 18 pids |
| Charge front : 1 000 rendus de `/login`, 30 simultanés | 1 000 réponses 200 en 5,7 s ; front 151 Mo, 12 pids, 102 % CPU (sa limite de 1) |
| Arrêt de la pile | 0,7 s ; codes de sortie web 0, front 0, db 0, api 143 (arrêt propre puis signal renvoyé par uvicorn) |
| Base arrêtée | `/api/health` répond 503 en 1,0 s, api `unhealthy`, puis `healthy` d'elle-même au retour de la base |
| Isolation | API et base injoignables depuis l'hôte ; pas d'accès internet depuis le réseau `backend` |
| Persistance | Mêmes données après `down` / `up` ; données de démo non réinsérées |

### Mesures du 2026-10-29 `[RÉEL]` (Mac Apple M4, OrbStack, Docker 29.8.2)

| Mesure | Résultat |
|---|---|
| Chaîne de CI (`pipeline.sh --no-deploy`, images en cache) | 88 s : lint (0,7 s de CPU), puis 543 tests en 50 s, 0 ignoré |
| Pipeline complet avec déploiement (front v2 compris) | lint, tests, puis pile saine ; 2 min 16 s sur l'ancienne pile (build Next.js compris) |
| Barrières | `FROM python:3.12-alpine` → `lint=1 test=absent`, rien déployé ; test faux → `lint=0 test=1`, rien déployé |
| Arrêts | lint 0,17 s (143) ; test 10 sur 10 propres (code 2, rapport écrit) ; test-db 0,15 s (0) ; bench 0,33 s (0, statistiques affichées) |
| Ressources de la CI | lint 29 à 71 Mo, 6 pids ; test 224 Mo de mémoire propre au plus, 11 pids, au plafond de son cœur ; test-db 98 Mo, 16 pids |
| Banc CPU, pile actuelle (3 passages) | repos : pile 0,016 cœur, VM 0,07 ; charge API : api 95 % de sa limite, 466 à 486 req/s, coût de Docker 0,15 cœur ; front v2 : web 95 % de sa limite, 14 300 à 14 700 req/s, coût de Docker 0,36 cœur ; CI : coût de Docker 0,09 cœur (≈ 10 %) |
| Banc CPU, pile précédente (front Next.js, 3 passages) | front 95 % de son cœur pour 163 à 183 pages/s : environ 340 fois plus de CPU par page que le front v2 |

## Problèmes rencontrés et résolutions `[RÉEL]`

Matière directe pour la soutenance et pour le BC04 (anomalie → diagnostic → correctif → vérification).

| # | Symptôme | Diagnostic | Correction |
|---|---|---|---|
| 1 | `cannot create secret ... in read-only service db` | Compose n'accepte pas un secret issu d'une variable d'environnement sur un conteneur en lecture seule | Secret lu dans un fichier (`secrets/db_password.dev`, surchargeable par `DB_PASSWORD_FILE`) |
| 2 | `initdb: could not access directory ... Permission denied` | `/var/lib/postgresql` appartient à l'utilisateur `postgres` du paquet, droits 750 | `chown app:app` du dossier parent dans l'image |
| 3 | `No 'script_location' key found` (Alembic) | `COPY --chmod=0644` vers `/app/alembic.ini` a créé `/app` en 644 : dossier illisible | `WORKDIR /app` avant les copies |
| 4 | `ModuleNotFoundError: No module named 'app'` | La commande `alembic` n'ajoute pas le dossier courant au chemin Python | `prepend_sys_path` dans `alembic.ini` |
| 5 | Port 8080 déjà alloué | L'ancienne pile du premier TP tourne encore | Port de test 8081 via `WEB_PUBLISHED_PORT` ; ancienne pile laissée intacte |
| 6 | API à 147 Mo sur 192 au repos | 2 workers + superviseur pour 0,5 CPU | 1 worker (69 Mo), limite ramenée à 128 Mo |
| 7 | 2 697 erreurs 500 sur 3 000 requêtes, API `unhealthy` | `RuntimeError: can't start new thread` : pool de 40 threads de FastAPI au-delà de la limite `pids` (32) | Pool borné, puis voir 8 |
| 8 | Pool de connexions épuisé, requêtes bloquées 30 s | Fermeture des sessions exécutée hors de la borne de threads (`exit_limiter` de FastAPI) | **API asynchrone** : 0 erreur, 6 pids au plus |
| 9 | `/api/health` bloqué plus de 5 s quand la base est arrêtée | Pas de délai de connexion ; puis résolution DNS du nom disparu : 5,03 s mesurées | `connect_timeout` 2 s + `dns_opt` timeout 1 s : 503 en 1,0 s |
| 10 | `ERR_PNPM_IGNORED_BUILDS` au build du front | pnpm 11 bloque les scripts d'installation des dépendances et en fait une erreur | Scripts laissés bloqués (aucun n'est nécessaire), `strict-dep-builds=false` |
| 11 | Même erreur au `pnpm build` | `pnpm build` revérifie l'installation sans l'option | Appel direct de `next build` |
| 12 | Chaîne déclarée réussie alors que le lint avait échoué (2026-10-29) | Compose 5.5.0 : `docker compose up --abort-on-container-failure` rend 0 après l'interruption (l'exemple du cours s'y fie) | `pipeline.sh` lit le code de sortie de chaque conteneur (`docker compose ps -a`) ; une étape qui n'a pas tourné compte comme un échec |
| 13 | Premier passage du lint en échec sur notre propre script | ShellCheck SC2209 : `SERVICE_NAME=test`, `test` étant aussi une commande | `SERVICE_NAME='test'` |
| 14 | `docker stop` du conteneur de test : 3 arrêts sur 6 bloqués, SIGKILL après 15 s (code 137) | Threads de travail d'anyio non démons, en attente d'un ordre d'arrêt jamais envoyé quand le signal tombe dans du code synchrone ; fixture asynchrone en attente d'une tâche morte (lu dans `/proc/<pid>/task` et le code d'anyio 4.15.1) | `run_pytest.py` : `os._exit` après `pytest.main()`, délai de grâce `TEST_STOP_TIMEOUT` après SIGINT : 10 arrêts sur 10 propres, rapport écrit |
| 15 | Conteneur de test au pic exact de sa limite (256 Mo) | `memory.peak` compte le cache ; relevé de `memory.stat` : 248 Mo de mémoire propre sous la limite (224 Mo sans contrainte), cache réduit à 18 Mo par le noyau : à 8 Mo d'un OOM, sans effet visible sur la durée | `TEST_MEMORY` porté à 512 Mo |
| 16 | Téléchargement de hadolint (lint des Dockerfiles) refusé par le garde-fou de l'assistant | Binaire de 60 Mo hors gestionnaire de paquets (ni Alpine ni PyPI) | Outil écarté ; règle maison sur les `FROM`, outils issus d'apk et de PyPI seulement |

## Reste à faire

| Tâche | Quand | Détail |
|---|---|---|
| ~~Relire puis fusionner la branche `feat/m2-docker-luniqo` dans `main`~~ | Fait le 2026-10-08 | PR #37 puis #38 (commits poussés après la fusion de la #37) |
| ~~Marquer la version rendue~~ | Fait le 2026-10-08 | Tag annoté `tp-docker-v1` sur `e020a26`, poussé |
| ~~Préparer l'explication orale~~ | — | Sans objet : pas d'oral (Florent, 2026-10-27) |
| ~~Arrêter l'ancienne pile `tp-docker`~~ | Constaté le 2026-10-08 | `docker compose ls` ne liste plus que `luniqo` |
| ~~Ticket Jira de la consigne supplémentaire~~ | Fait le 2026-10-29 | LUN-115, créé via le serveur MCP d'Atlassian |
| **Image front distincte ?** | À trancher par Florent avant le rendu | Depuis LUN-114, le front v2 est construit dans l'image `web` : la pile n'a plus d'image « front » à elle, alors que le sujet en demande une. Le rendu retenu (dernier commit avant la date butoir) doit contenir lint et test, donc postérieur à LUN-114 |
| Tag de rendu | Après fusion | `tp-docker-v2` sur le commit rendu |

## Suivi

| | Prévu | Réel |
|---|---|---|
| Temps de travail | à estimer avec Florent | session du 2026-10-08 (base, db, api, web, doc) |
| Version de départ | `3fef96a` (dépôt alors nommé nursery-app) (premier TP : ancien dépôt `TP-Docker` `897c76f`) | |
| Version livrée | | tag `tp-docker-v1` (`e020a26`, `main`, 2026-10-08). Pile relancée depuis ce commit le jour même : 4 conteneurs sains en 20 s, `/healthz`, `/api/health`, `/api/docs` et `/api/v2/nurseries` en 200 |

**Contribution et assistance** : le 2026-10-08, l'architecture a été définie et validée par Florent (choix de FastAPI, de la passerelle, de PostgreSQL). Le code des images, de l'API et la documentation de cette session ont été produits avec l'assistance de Claude Code, à partir de l'image de base et des conventions du premier TP de Florent. Les mesures et diagnostics ont été réellement exécutés. À compléter par Florent : ce qu'il a relu, modifié ou refait lui-même, et ce qu'il saura expliquer à l'oral.
