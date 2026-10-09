# Backlog provisoire

Tenu ici en attendant le tableau Trello. Les numéros `LUN-###` sont définitifs : ils seront repris tels quels sur les cartes Trello, dans les branches, les commits et le journal des versions.

> Créé le 2026-10-08 `[RÉEL]`. Priorisation proposée par l'assistant, à valider par Florent ; dans les rituels simulés, la Product Owner (Inès) la porte.

Ordre fixé par [ADR-001](../decisions/ADR-001-reecriture-backend.md) : socle (authentification, entreprises, crèches, droits) → enfants et familles → pointage → consultation famille. Règles d'authentification : [ADR-003](../decisions/ADR-003-authentification-v2.md).

| Ticket | Titre | Type | Blocs / compétences | Dépend de | Statut |
|---|---|---|---|---|---|
| LUN-001 | Rendu du TP Docker : tag `tp-docker-v1`, fiche du cours à jour | doc, `cours:docker` | BC02 (C2.1.1) | | En revue |
| LUN-002 | ADR-003 : authentification et sessions de la v2 | doc | BC01 (C1.3.2, C1.2.3), BC02 (C2.2.3) | | En revue |
| LUN-003 | Socle v2 : comptes, mots de passe Argon2id, sessions, connexion et déconnexion | feat | BC02 (C2.2.2, C2.2.3) | LUN-002 | En revue |
| LUN-004 | Socle v2 : entreprises, crèches, droits d'accès par crèche, tests d'isolation | feat | BC02 (C2.2.2, C2.2.3) | LUN-003 | En revue |
| LUN-005 | Tablette : enrôlement par la direction, PIN vérifié côté serveur, session d'action | feat | BC02 (C2.2.3), BC04 (C4.2.2, ANO-001) | LUN-004 | Backlog |
| LUN-006 | Multifacteur TOTP obligatoire pour Developer et Owner | feat | BC02 (C2.2.3) | LUN-003 | Backlog |
| LUN-007 | Tests d'intégration sur une vraie PostgreSQL (base de test jetable) | infra | BC02 (C2.2.2) | LUN-003 | En revue |
| LUN-008 | Intégration continue : lint, typage, tests, build des images sur chaque PR | infra | BC02 (C2.1.2) | LUN-007 | En revue |
| LUN-009 | Enfants et familles (v2) | feat | BC02 | LUN-004 | Backlog |
| LUN-010 | Pointage arrivée et départ (v2) | feat | BC02 (C2.2.2) | LUN-005, LUN-009 | Backlog |
| LUN-011 | Consultation famille : un parent ne voit que ses enfants | feat | BC02 (C2.2.3) | LUN-009 | Backlog |
| LUN-012 | Revoir le parcours central pour y intégrer la fiche de ménage | doc | BC01 (C1.1.2), BC03 (C3.2.2) | | Backlog |
| LUN-013 | Tableau Trello et squelette `M2/` (README, management, journal) | doc | BC03 (C3.1, C3.2.1) | | Backlog |
| LUN-014 | Préparer l'oral du TP Docker | doc, `cours:docker` | BC02 | LUN-001 | Backlog |
| LUN-015 | Phase 0 : installer la v1 sur une base de test isolée et classer le parcours central | infra | BC01 (C1.2.2) | | Backlog |
| LUN-016 | Purge des sessions expirées et du journal `auth_event` au-delà de 6 mois (durée CNIL, décidée le 2026-10-08) | feat | BC02 (C2.2.3), BC04 | LUN-003 | Backlog |
| LUN-017 | Changement de mot de passe et invitation (création des comptes employés par la direction, choix du premier mot de passe), avec révocation des sessions | feat | BC02 (C2.2.3) | LUN-004 | Backlog |
| LUN-018 | Routes d'administration de l'éditeur (entreprises, métriques), sans accès aux données des crèches | feat | BC02 (C2.2.3) | LUN-004 | Backlog |

## Découpage de LUN-003 (premier module de l'API)

Réalisé le 2026-10-08 `[RÉEL]`, sauf l'étape 8 (navigateur), à faire par Florent. Résultats et mesures : PR de LUN-003 et [registre des choix techniques](../decisions/CHOIX-TECHNIQUES.md).

1. Modèle `app_user` (e-mail unique insensible à la casse, haché Argon2id, rôle, actif) et `user_session` (empreinte du jeton, dates, IP, agent), migration Alembic.
2. Service de mots de passe : hachage, vérification, ré-hachage, longueur 15 à 128, liste de mots de passe interdits.
3. Routes `POST /api/v2/auth/login`, `POST /api/v2/auth/logout`, `GET /api/v2/auth/me`.
4. Dépendance FastAPI `current_user` : lecture du cookie, contrôle des expirations, mise à jour de la dernière activité.
5. Contrôle de l'en-tête `Origin` sur les requêtes qui modifient des données.
6. Limitation des tentatives par compte et par IP, journal des événements d'authentification.
7. Tests : connexion valide, mauvais mot de passe, compte inconnu (même réponse), compte inactif, session expirée (inactivité et absolue), déconnexion, origine refusée, blocage après échecs.
8. Vérifier le cookie `__Host-` + `Secure` sur `http://localhost:8080` via la pile Docker. **curl : fait. Navigateur : à vérifier.**

Le code d'organisation de l'API change aussi : `main.py` ne peut pas tout porter. Proposition : un module par domaine (`app/auth/`, `app/nurseries/`…) avec ses modèles, schémas, routes et services.
