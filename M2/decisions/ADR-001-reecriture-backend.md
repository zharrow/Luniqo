# ADR-001 — Réécrire Luniqo avec un backend dédié

| | |
|---|---|
| Statut | **Acceptée** le 2026-10-08 : réécriture progressive, backend FastAPI |
| Date | 2026-10-08 |
| Décideur | Florent `[RÉEL]` |
| Compétences | C1.2.2 (faisabilité), C1.3.2 (choix d'architecture), C1.5 (modélisation), C3.2.2 (arbitrage) |

## Contexte

Mesures faites le 2026-10-08 par lecture du code de la v1 (commit `3fef96a`) :

- **Pas de couche backend.** 139 pages sur 141 sont des composants client. 44 services sur 54 interrogent la base depuis le navigateur avec la clé publique Supabase (environ 1 050 appels `.from()` sur 121 tables, 32 fonctions RPC). Les règles métier et les contrôles d'accès s'exécutent chez l'utilisateur.
- **Isolation non garantie.** La RLS est désactivée sur les tables principales (`01_dev_permissions.sql`). Le filtrage par crèche repose sur le code client, que l'utilisateur contrôle. Conséquence directe : [ANO-001](../bloc-4-maintien-operationnel/anomalies/ANO-001-pin-tablette.md).
- **Schéma non reproductible.** 131 fichiers de migration, dont 61 copies et des numéros en double, appliqués à la main dans l'éditeur SQL de Supabase. L'ordre réel est inconnu.
- **Aucun test, aucune CI.**
- **Objectifs de l'année** : PostgreSQL sous Docker, CI/CD, déploiement sur VPS, supervision, et des preuves pour les 4 blocs.

## Options

| Critère | A. Auto-héberger Supabase | **B. Réécrire avec un backend dédié** | C. Garder Supabase Cloud |
|---|---|---|---|
| Principe | PostgreSQL + PostgREST + Supabase Auth dans nos conteneurs, code v1 inchangé | API serveur entre le front et PostgreSQL ; le front n'accède plus jamais à la base | Conteneuriser seulement Next.js |
| Contrôles d'accès | Toujours dans le navigateur, sauf à écrire toute la RLS | Centralisés côté serveur, testables | Inchangés (problème non traité) |
| PostgreSQL sous Docker | Oui | Oui | Non |
| Migrations | Héritées (131 fichiers à démêler) | Repartent propres et versionnées | Héritées |
| Testabilité | Faible | Forte (tests unitaires et d'API) | Faible |
| Effort | Moyen | **Élevé**, étalé sur l'année | Faible |
| Valeur pour le M2 | Moyenne | Forte : architecture, sécurité, tests, CI/CD, migrations, exploitation | Faible |

## Décision

**Option B**, menée progressivement :

- La **v1 est gelée** : plus de nouvelles fonctionnalités, seulement des correctifs de sécurité. Elle sert de référence fonctionnelle.
- La **v2** est construite lot par lot, en commençant par le parcours central du fil rouge : socle (authentification, entreprises, crèches, droits) → enfants et familles → pointage → consultation famille. Les autres modules suivent s'il reste du temps.
- Le **front reste en Next.js + React pour l'instant**. Il bascule de Supabase vers l'API lot par lot. Le choix du front cible (Next.js ou React + Vite) fera l'objet d'ADR-002.
- Le nouveau schéma est **conçu pour la v2** à partir de `supabase/README.md`, sans rejouer les 131 migrations. Les données de démonstration sont synthétiques.

## Technologie du backend : FastAPI

| Critère | **FastAPI** | Django + DRF | NestJS |
|---|---|---|---|
| Langage | Python | Python | TypeScript (comme le front) |
| Validation et documentation d'API | Pydantic, OpenAPI généré automatiquement | Serializers, OpenAPI via extension | Décorateurs, module Swagger |
| Accès base et migrations | SQLAlchemy 2 + Alembic | ORM et migrations intégrés | Prisma ou TypeORM |
| Auth, permissions, admin | À assembler soi-même | Fournis | À assembler (Passport) |
| Tests | pytest + client de test intégré | pytest-django | Jest |
| Poids et lisibilité | Léger, explicite | Complet mais plus de conventions | Plus lourd (modules, injection) |

FastAPI est retenu :

1. **Séparation nette front/back.** Un service API distinct correspond à l'image « back » du TP Docker et à un schéma d'architecture lisible pour le jury.
2. **Contrat d'API explicite.** Le schéma OpenAPI généré documente l'API et sert une interface Swagger UI interactive (C2.4.1). Il permet aussi de générer le client TypeScript du front : les deux langages partagent les mêmes types.
3. **Isolation centralisée.** L'injection de dépendances permet d'imposer à chaque route une vérification « cet utilisateur a-t-il accès à cette crèche ? ». Ce point unique est facile à tester (C2.2.3) et règle la cause d'ANO-001.
4. **Tests et migrations propres** : pytest pour le harnais de tests unitaires (C2.2.2), Alembic pour des migrations versionnées et rejouables (BC04).
5. **Continuité** : Python est déjà utilisé dans les images du premier TP Docker.

Ce qui est écarté et pourquoi :

- **Django** apporte surtout un admin et des gabarits HTML dont un front React n'a pas besoin. Son authentification native vise des sessions web classiques : pour une API consommée par un front séparé et une tablette, il faut de toute façon ajouter des extensions.
- **NestJS** garderait un seul langage, mais pour une structure plus lourde. Le partage de types qu'il apporterait est déjà obtenu par la génération du client depuis OpenAPI.

Contrepartie assumée : l'authentification et les permissions sont à construire soi-même. C'est aussi ce qu'on veut maîtriser et montrer.

## Conséquences

- **Positives** : contrôles d'accès côté serveur, schéma reproductible, harnais de tests, images Docker claires (front, API, base, passerelle), matière pour les 4 blocs.
- **Négatives** : deux langages, charge de réécriture importante. Pendant la transition, le front parle à deux sources (Supabase pour les modules non migrés, l'API pour les autres).
- **Risques** : périmètre trop large → limité au parcours central d'abord ; régressions fonctionnelles → la v1 sert d'oracle pour la recette.
- **Suites** : ADR-002 (front), ADR-003 (authentification et PIN tablette), structure du dépôt (proposition : dossier `api/` à la racine, en monorepo).
