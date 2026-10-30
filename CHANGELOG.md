# Journal des versions

Toutes les évolutions notables de Luniqo. Format inspiré de
[Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versions selon
[SemVer](https://semver.org/lang/fr/) (règles dans [CONTRIBUTING.md](CONTRIBUTING.md#3-versions-semver)).
Chaque ligne cite son ticket Jira `LUN-<n>`.

## [Non publié]

### Ajouté

- Historique des fiches de ménage : tâches cochées sur une période, annulées comprises, filtrables par pièce, et export CSV pour un contrôle (tableur en français, formules neutralisées) (LUN-71).
- Comptes des employés : la direction crée le compte et transmet un lien d'invitation à usage unique, l'employé choisit son mot de passe ; départ d'un salarié avec fermeture immédiate de ses sessions ; changement de mot de passe qui ferme les autres sessions (LUN-55).
- Documentation de l'API complétée (Swagger, `/api/docs`) : présentation de l'authentification et des conventions, chaque route décrite avec ses erreurs possibles et leurs messages, cookies déclarés comme schémas de sécurité, exemple pour chaque corps de requête ; schéma validé à chaque test (LUN-118).
- Variable `API_DOCS=false` pour désactiver Swagger UI et ReDoc en production ; le schéma `/api/openapi.json` reste servi (LUN-118).
- Protection des branches `develop`, `staging` et `main` : PR obligatoire, relectures, CI et conventions de PR obligatoires, ni suppression ni push forcé ; tags de version non modifiables ; branche par défaut `develop` ; configuration exportée dans `.github/rulesets/` (LUN-60).
- Purge RGPD : sessions expirées, journal des connexions au-delà de 6 mois et invitations expirées supprimés à chaque démarrage de l'API et par la commande `python -m app.purge` (LUN-54).
- Passkeys (Face ID, Touch ID, Windows Hello…) côté API : enregistrement de plusieurs passkeys nommées, second facteur après le mot de passe, connexion sans mot de passe qui vaut les deux facteurs ; la direction peut garder une passkey seule comme facteur (LUN-62).
- Front v2 (`front/`, React + Vite) : connexion, second facteur (code ou code de secours), activation d'une application d'authentification avec ses codes de secours, déconnexion, et un premier écran qui liste les crèches accessibles. Client d'API typé, généré depuis le schéma OpenAPI ; Storybook pour documenter les composants ; tests unitaires, de composants, de stories (accessibilité comprise) et parcours de bout en bout (LUN-107).
- CI : vérification du front v2 (contrat d'API à jour, lint, typage, tests, build, Storybook) et parcours Playwright contre la pile démarrée (LUN-107).
- TP Docker, consigne supplémentaire : conteneurs de CI `lint` (ruff, ShellCheck, refus de toute image Docker Hub) et `test` (tests unitaires et d'intégration sur une base jetable), enchaînés par `docker/pipeline.sh` (lint → test → déploiement de la pile) et lancés à chaque PR par la CI GitHub (LUN-115).
- TP Docker : banc de mesure de la consommation CPU des conteneurs (`docker/bench/bench.sh`, générateur de charge wrk), au repos, sous charge et pendant la CI, avec le coût de Docker lui-même (LUN-115).
- Front v2 : la direction gère les tablettes de chaque crèche, depuis l'accueil : enrôlement de l'appareil sur lequel la page est ouverte (le jeton reste dans un cookie que le JavaScript ne lit pas), liste avec l'état de chaque tablette (active, expirée, révoquée) et révocation après confirmation (LUN-87).

### Modifié

- La pile Docker retrouve une image `front` distincte : elle construit le front v2 et le sert avec un nginx dédié (politique de sécurité du contenu, cache) ; la passerelle `web` ne fait plus que relayer le front et l'API (LUN-117).
- La pile Docker sert le front v2 depuis l'image `web` (nginx), avec une politique de sécurité du contenu stricte et un cache adapté ; le conteneur du front Next.js v1 est retiré, la pile compte 4 images. La v1 reste en production sur Vercel jusqu'à la bascule (LUN-107).

### Sécurité

- Le blocage du TOTP au 100e échec consécutif ne dépend plus du journal des connexions : la purge ne peut plus le lever (LUN-54).

### Corrigé

- Le test qui interdit les dépendances synchrones (régression LUN-41) ne vérifiait aucune route : FastAPI 0.143 ne les liste plus dans `app.routes`. Il parcourt désormais les routes effectives et échoue s'il n'en trouve pas (LUN-118).

## [0.1.0] - 2026-10-10

Première version numérotée. Elle rassemble le travail fait avant l'adoption de
ce journal, l'organisation du projet (LUN-60) et la fiche de ménage côté API
(LUN-69, LUN-70). Les clés sont celles de Jira ; un ticket du backlog d'origine a
pour clé son ancien numéro + 38 (`LUN-006` est devenu `LUN-44`).

> Clés corrigées le 2026-10-29 (LUN-116) : cette section citait à l'origine
> `LUN-76` et `LUN-77`, calculées avec une règle fausse pour les stories ; les
> PR et les commits de la version gardent ces anciennes clés
> ([correspondance](docs/projet/JIRA.md#8-anciennes-clés-citées-avant-le-2026-10-29)).

### Ajouté

- API v2 (FastAPI, PostgreSQL) : comptes et sessions, mots de passe Argon2id, limitation des tentatives (LUN-41).
- Entreprises, crèches et accès du personnel par crèche, isolation vérifiée en base (LUN-42).
- Tablettes enrôlées, PIN vérifié côté serveur, sessions d'action de 2 minutes (LUN-43).
- Second facteur obligatoire pour la direction : TOTP chiffré, codes de secours (LUN-44, partie 1).
- Familles, enfants, responsables et autorisations, sans données de santé (LUN-47).
- Pointage des arrivées et départs depuis la tablette, suivi par la direction (LUN-48).
- Comptes familles par invitation, consultation réservée à l'autorité parentale (LUN-49).
- Conteneurisation : 5 images construites depuis `scratch`, pile Docker Compose (LUN-39, tag `tp-docker-v1`).
- Tests d'intégration sur une vraie PostgreSQL (LUN-45) et intégration continue GitHub Actions (LUN-46).
- Organisation du projet : README pour les développeurs, CONTRIBUTING (branches `develop` / `staging` / `main`, SemVer, cycle de vie des tickets, Definition of Done), ce journal, import du backlog dans Jira (LUN-60).
- Vision produit : 4 personas et une story map avec la découpe du MVP ; diagramme `gitGraph` du circuit complet des branches (LUN-60).
- Automatisations GitHub : CI sur `develop`, `staging` et `main` ; contrôle des noms de branche, des cibles et des titres de PR ; étiquettes `front`, `back`, `infra`, `doc` posées selon les fichiers modifiés ; modèle de PR (LUN-60).
- Fiche de ménage, côté API : pièces de chaque crèche, catalogue des tâches de l'entreprise, fréquences (chaque jour, certains jours, le premier jour donné du mois) et fiche du jour en heure de Paris ; pièces fictives dans le jeu de démonstration (LUN-69).
- Fiche de ménage remplie depuis la tablette : l'employé identifié par PIN coche les tâches du jour (heure et auteur fixés par le serveur, noms recopiés tels qu'au moment de la coche) ; décocher le jour même annule la coche sans l'effacer (LUN-70).

### Corrigé

- Déploiement Vercel du front v1 refusé : le dossier `api/` était compté comme fonctions serverless ([ANO-003](M2/bloc-4-maintien-operationnel/anomalies/ANO-003-vercel-fonctions-api.md), LUN-49).

### Sécurité

- [ANO-001](M2/bloc-4-maintien-operationnel/anomalies/ANO-001-pin-tablette.md) (PIN de tablette vérifié dans le navigateur en v1) corrigée par conception dans la v2 (LUN-43). La v1 reste concernée.
