# Fiche de travail — Cours Docker : « mon propre cloud » sur Luniqo

| | |
|---|---|
| Cours | Docker (M2, Ynov Toulouse) |
| Sujet | TP « Projet - Docker Cloud » : images personnalisées orchestrées avec Compose (sujet complet : `docker/TP.md`, non versionné) |
| Échéance | Dernière des 4 séances. 2 séances passées au 2026-10-08 |
| Rendu | Lien git, dernier commit avant la date butoir : dépôt public `zharrow/Luniqo`, dossier `docker/` |
| Oral | Non confirmé |
| Compétences RNCP | C2.1.1 (environnements, déploiement), C1.5 (schéma d'architecture), C2.2.2 (tests), C2.2.3 (sécurité), C4.1.2 (healthchecks, première brique de supervision) |
| Statut | **Exigences du sujet couvertes** (2026-10-08) : 5 images (base, db, api, front, web), toutes construites depuis `scratch`, mesurées et documentées. Reste : commit et tag de rendu |

## Contraintes imposées par le sujet

1. **Aucune image Docker Hub** : toutes les images sont construites et personnalisées par nos soins.
2. Au moins **3 types d'images** : un front, un back et un « serveur web ».
3. Tous les conteneurs reçoivent des **arguments qui règlent les ressources allouées**, au run et dans le compose.
4. Barème : documentation des dépendances, des manipulations sur l'OS, des arguments et des entrypoints ; arguments traduits dans le compose ; limites de ressources expliquées ; **SIGTERM gérés** ; **dépendances de démarrage** ; **schéma des communications**.
5. Le contenu applicatif peut être minimal (« un Hello World suffit »).

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
| Image `front` : Next.js en serveur autonome ; `next.config.mjs` (`output: 'standalone'`), route `app/healthz/route.ts`, exclusion dans `proxy.ts` | `docker/front/`, racine | Fait, mesuré |

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

## Reste à faire

| Tâche | Quand | Détail |
|---|---|---|
| ~~Relire puis fusionner la branche `feat/m2-docker-luniqo` dans `main`~~ | Fait le 2026-10-08 | PR #37 puis #38 (commits poussés après la fusion de la #37) |
| ~~Marquer la version rendue~~ | Fait le 2026-10-08 | Tag annoté `tp-docker-v1` sur `e020a26`, poussé |
| Préparer l'explication orale | Avant la séance 4 | Les pannes 6 à 9 sont les meilleurs exemples à raconter |
| ~~Arrêter l'ancienne pile `tp-docker`~~ | Constaté le 2026-10-08 | `docker compose ls` ne liste plus que `luniqo` |

## Suivi

| | Prévu | Réel |
|---|---|---|
| Temps de travail | à estimer avec Florent | session du 2026-10-08 (base, db, api, web, doc) |
| Version de départ | `3fef96a` (dépôt alors nommé nursery-app) (premier TP : ancien dépôt `TP-Docker` `897c76f`) | |
| Version livrée | | tag `tp-docker-v1` (`e020a26`, `main`, 2026-10-08). Pile relancée depuis ce commit le jour même : 4 conteneurs sains en 20 s, `/healthz`, `/api/health`, `/api/docs` et `/api/v2/nurseries` en 200 |

**Contribution et assistance** : le 2026-10-08, l'architecture a été définie et validée par Florent (choix de FastAPI, de la passerelle, de PostgreSQL). Le code des images, de l'API et la documentation de cette session ont été produits avec l'assistance de Claude Code, à partir de l'image de base et des conventions du premier TP de Florent. Les mesures et diagnostics ont été réellement exécutés. À compléter par Florent : ce qu'il a relu, modifié ou refait lui-même, et ce qu'il saura expliquer à l'oral.
