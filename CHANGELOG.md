# Journal des versions

Toutes les évolutions notables de Luniqo. Format inspiré de
[Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versions selon
[SemVer](https://semver.org/lang/fr/) (règles dans [CONTRIBUTING.md](CONTRIBUTING.md#3-versions-semver)).
Chaque ligne cite son ticket Jira `LUN-<n>`.

## [Non publié]

## [0.1.0] - 2026-10-10

Première version numérotée. Elle rassemble le travail fait avant l'adoption de
ce journal, l'organisation du projet (LUN-60) et la fiche de ménage côté API
(LUN-76, LUN-77). Les clés sont celles de Jira ; un ticket du backlog d'origine a
pour clé son ancien numéro + 38 (`LUN-006` est devenu `LUN-44`).

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
- Fiche de ménage, côté API : pièces de chaque crèche, catalogue des tâches de l'entreprise, fréquences (chaque jour, certains jours, le premier jour donné du mois) et fiche du jour en heure de Paris ; pièces fictives dans le jeu de démonstration (LUN-76).
- Fiche de ménage remplie depuis la tablette : l'employé identifié par PIN coche les tâches du jour (heure et auteur fixés par le serveur, noms recopiés tels qu'au moment de la coche) ; décocher le jour même annule la coche sans l'effacer (LUN-77).

### Corrigé

- Déploiement Vercel du front v1 refusé : le dossier `api/` était compté comme fonctions serverless ([ANO-003](M2/bloc-4-maintien-operationnel/anomalies/ANO-003-vercel-fonctions-api.md), LUN-49).

### Sécurité

- [ANO-001](M2/bloc-4-maintien-operationnel/anomalies/ANO-001-pin-tablette.md) (PIN de tablette vérifié dans le navigateur en v1) corrigée par conception dans la v2 (LUN-43). La v1 reste concernée.
