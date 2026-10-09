# Journal des versions

Toutes les évolutions notables de Luniqo. Format inspiré de
[Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versions selon
[SemVer](https://semver.org/lang/fr/) (règles dans [CONTRIBUTING.md](CONTRIBUTING.md#3-versions-semver)).
Chaque ligne cite son ticket Jira `LUN-<n>`.

## [Non publié]

### Ajouté

- Organisation du projet : README pour les développeurs, CONTRIBUTING (branches `develop` / `staging` / `main`, SemVer, cycle de vie des tickets, Definition of Done), ce journal, import du backlog dans Jira (LUN-22).
- Vision produit : 4 personas et une story map avec la découpe du MVP ; diagramme `gitGraph` du circuit complet des branches (LUN-22).
- Automatisations GitHub : CI sur `develop`, `staging` et `main` ; contrôle des noms de branche, des cibles et des titres de PR ; étiquettes `front`, `back`, `infra`, `doc` posées selon les fichiers modifiés ; modèle de PR (LUN-22).

## [0.1.0] - date fixée à la publication

Première version numérotée. Elle rassemble le travail fait avant l'adoption de
ce journal ; les tickets suivent l'ancienne numérotation (`LUN-006` = `LUN-6`).

### Ajouté

- API v2 (FastAPI, PostgreSQL) : comptes et sessions, mots de passe Argon2id, limitation des tentatives (LUN-3).
- Entreprises, crèches et accès du personnel par crèche, isolation vérifiée en base (LUN-4).
- Tablettes enrôlées, PIN vérifié côté serveur, sessions d'action de 2 minutes (LUN-5).
- Second facteur obligatoire pour la direction : TOTP chiffré, codes de secours (LUN-6, partie 1).
- Familles, enfants, responsables et autorisations, sans données de santé (LUN-9).
- Pointage des arrivées et départs depuis la tablette, suivi par la direction (LUN-10).
- Comptes familles par invitation, consultation réservée à l'autorité parentale (LUN-11).
- Conteneurisation : 5 images construites depuis `scratch`, pile Docker Compose (LUN-1, tag `tp-docker-v1`).
- Tests d'intégration sur une vraie PostgreSQL (LUN-7) et intégration continue GitHub Actions (LUN-8).

### Corrigé

- Déploiement Vercel du front v1 refusé : le dossier `api/` était compté comme fonctions serverless ([ANO-003](M2/bloc-4-maintien-operationnel/anomalies/ANO-003-vercel-fonctions-api.md), LUN-11).

### Sécurité

- [ANO-001](M2/bloc-4-maintien-operationnel/anomalies/ANO-001-pin-tablette.md) (PIN de tablette vérifié dans le navigateur en v1) corrigée par conception dans la v2 (LUN-5). La v1 reste concernée.
