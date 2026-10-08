# Registre des choix techniques

Tous les choix techniques de Luniqo v2, avec leurs raisons, les options écartées et les sources. Les choix structurants ont leur ADR ; ce registre en donne le résumé et recense aussi les choix plus petits qui n'en méritent pas un.

> Tenu à jour à chaque choix nouveau ou révisé (demande de Florent du 2026-10-08). Une ligne révisée n'est pas effacée : elle passe au statut « remplacé » avec un renvoi.

**Légende des statuts** : en vigueur · proposé · remplacé.

Compétences nourries : C1.3.1 (veille, sources), C1.3.2 (choix d'architecture), C2.2.3 (sécurité).

## Architecture

| Date | Choix | Raisons | Écarté | Sources | Statut |
|---|---|---|---|---|---|
| 2026-10-08 | Réécrire la v1 en v2 avec un **backend dédié**, progressivement, la v1 étant gelée | La v1 exécute règles métier et contrôles d'accès dans le navigateur, RLS désactivée, 131 migrations non rejouables, aucun test. Un backend centralise et rend testables les contrôles d'accès | Auto-héberger Supabase (contrôles toujours côté client) ; garder Supabase Cloud (problème non traité) | [ADR-001](ADR-001-reecriture-backend.md) | en vigueur |
| 2026-10-08 | Front et API **sur la même origine** derrière une passerelle nginx (`/` → front, `/api/` → API) | Pas de CORS à ouvrir, cookies de session partagés sans configuration intersites, un seul point d'entrée à exposer et à superviser | Front et API sur deux domaines | [docker/README.md](../../docker/README.md) | en vigueur |
| 2026-10-08 | **Un seul dépôt** (v1, v2, TP, documentation M2) | Une PR peut toucher l'API, le front et l'infrastructure ensemble ; une seule histoire git sert de preuve | Dépôts séparés par composant | [AGENTS.md](../../AGENTS.md) | en vigueur |
| 2026-10-08 | Front gardé en **Next.js + React** pendant la transition | Le front v1 fonctionne ; changer de framework en même temps que de backend multiplie les risques | Passage immédiat à React + Vite (à trancher dans ADR-002) | [ADR-001](ADR-001-reecriture-backend.md) | en vigueur |

## Backend (API v2)

| Date | Choix | Raisons | Écarté | Sources | Statut |
|---|---|---|---|---|---|
| 2026-10-08 | **FastAPI** (Python) | Contrat OpenAPI généré (documentation Swagger, client TypeScript généré pour le front), injection de dépendances pour imposer le contrôle d'accès à chaque route, pytest | Django + DRF (admin et gabarits inutiles pour un front séparé) ; NestJS (structure plus lourde, le partage de types est obtenu par OpenAPI) | [ADR-001](ADR-001-reecriture-backend.md), [documentation FastAPI](https://fastapi.tiangolo.com/) | en vigueur |
| 2026-10-08 | Routes et accès base **asynchrones** | Mesuré : en synchrone, FastAPI ouvre jusqu'à 40 threads et dépasse la limite `pids` du conteneur (2 697 erreurs sur 3 000 requêtes). En asynchrone : 3 000 réponses 200, 6 PIDs au plus | Routes synchrones avec pool de threads borné (pool de connexions épuisé, mesuré) | [docker/api/README.md](../../docker/api/README.md), [FastAPI, concurrence](https://fastapi.tiangolo.com/async/) | en vigueur |
| 2026-10-08 | **SQLAlchemy 2** (mode asyncio) + **psycopg 3** | ORM mûr, typé (`Mapped[...]`), requêtes paramétrées par défaut (pas d'injection SQL) ; psycopg 3 est le pilote PostgreSQL de référence et gère l'asynchrone | Non comparé formellement au moment du choix. asyncpg est l'alternative à mesurer si les performances le justifient | [SQLAlchemy asyncio](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html), [psycopg 3](https://www.psycopg.org/psycopg3/docs/) | en vigueur |
| 2026-10-08 | **Alembic** pour les migrations, une révision par changement, jamais modifiée après application | Schéma reproductible et versionné, à l'inverse des 131 scripts de la v1 collés à la main | Scripts SQL manuels | [Alembic](https://alembic.sqlalchemy.org/) | en vigueur |
| 2026-10-08 | Versions **figées** : `requirements.in` (dépendances directes) → `requirements.txt` (toutes les versions exactes) | Builds reproductibles ; une mise à jour de dépendance est un changement explicite et relu (C4.1.1) | Versions flottantes | [api/README.md](../../api/README.md) | en vigueur |
| 2026-10-08 | Mot de passe de la base lu dans un **fichier** (secret Docker), pas dans une variable | N'apparaît ni dans `docker inspect` ni dans l'environnement des processus | Variable d'environnement | [Docker, secrets compose](https://docs.docker.com/compose/how-tos/use-secrets/) | en vigueur |
| 2026-10-08 | **Un module par domaine** dans l'API (`app/auth/`, puis `app/nurseries/`…), chacun avec modèles, schémas, services et routes | `main.py` ne peut pas porter toute l'API ; un domaine se lit, se teste et se relit seul | Découpage par couche technique (tous les modèles ensemble, toutes les routes ensemble) | [FastAPI, applications sur plusieurs fichiers](https://fastapi.tiangolo.com/tutorial/bigger-applications/) | en vigueur (LUN-003) |

## Base de données

| Date | Choix | Raisons | Écarté | Sources | Statut |
|---|---|---|---|---|---|
| 2026-10-08 | **PostgreSQL 18**, conteneurisé | Même moteur que la v1 (Supabase), donc modèle de données réutilisable ; contraintes, index et transactions solides | Rester sur Supabase Cloud | [ADR-001](ADR-001-reecriture-backend.md), [PostgreSQL 18](https://www.postgresql.org/docs/18/) | en vigueur |
| 2026-10-08 | Identifiants **UUID** générés par la base (`gen_random_uuid()`) | Non devinables (pas d'énumération par incrément), compatibles avec les identifiants de la v1 | Entiers auto-incrémentés | [PostgreSQL, fonctions UUID](https://www.postgresql.org/docs/18/functions-uuid.html) | en vigueur |
| 2026-10-08 | **Données synthétiques uniquement** (seed de démo) | Données d'enfants et de santé : aucune donnée réelle hors production | Copie de données réelles | [AGENTS.md](../../AGENTS.md), règle 5 | en vigueur |

## Conteneurisation (TP Docker)

| Date | Choix | Raisons | Écarté | Sources | Statut |
|---|---|---|---|---|---|
| 2026-10-08 | Images construites **depuis `scratch`** sur un minirootfs Alpine vérifié par SHA-256 | Contrainte du cours (0 image Docker Hub) ; maîtrise complète du contenu ; image de base de 23 Mo | Images officielles Docker Hub | [M2/cours/docker.md](../cours/docker.md), [Alpine downloads](https://alpinelinux.org/downloads/) | en vigueur |
| 2026-10-08 | **tini** en PID 1 | Relaie SIGTERM au processus applicatif et récupère les processus zombies : arrêt propre en quelques secondes | Processus applicatif en PID 1 (signaux mal gérés) | [tini](https://github.com/krallin/tini) | en vigueur |
| 2026-10-08 | Conteneurs **non-root**, système de fichiers en lecture seule, limites CPU, mémoire et `pids` | Réduit l'impact d'une compromission ; les limites sont des arguments de ressources exigés par le cours | Conteneurs root sans limites | [docker/README.md](../../docker/README.md) | en vigueur |
| 2026-10-08 | Réseau `backend` **interne** pour l'API et la base | La base n'est jamais joignable depuis l'extérieur ni depuis le front | Réseau unique | [docker/README.md](../../docker/README.md) | en vigueur |

## Sécurité et authentification

| Date | Choix | Raisons | Écarté | Sources | Statut |
|---|---|---|---|---|---|
| 2026-10-08 | **Sessions opaques stockées dans PostgreSQL**, jeton de 256 bits, seule son empreinte SHA-256 est en base | Révocation immédiate (départ d'un salarié, appareil volé) ; une fuite de la base ne donne pas les sessions | JWT (révocation difficile, erreurs d'implémentation fréquentes) ; Keycloak (composant critique de plus à maintenir) | [ADR-003](ADR-003-authentification-v2.md), [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) | en vigueur |
| 2026-10-08 | Cookie `__Host-luniqo_session` : `Secure`, `HttpOnly`, `SameSite=Lax` | Jeton inaccessible au JavaScript (XSS) ; le préfixe `__Host-` empêche un sous-domaine de l'écraser | Jeton en localStorage (cas de la v1) | [ADR-003](ADR-003-authentification-v2.md), [MDN, Set-Cookie](https://developer.mozilla.org/docs/Web/HTTP/Reference/Headers/Set-Cookie) | en vigueur |
| 2026-10-08 | Expiration d'inactivité 30 min, absolue 12 h ; nouveau jeton à chaque connexion | Limite la fenêtre d'un jeton volé ; empêche la fixation de session | Sessions sans fin | [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) | en vigueur |
| 2026-10-08 | Mots de passe hachés en **Argon2id** (19 Mio, 2 itérations, parallélisme 1), bibliothèque `argon2-cffi` | Fonction lente et coûteuse en mémoire, recommandée par l'OWASP ; ralentit fortement une attaque hors ligne | bcrypt (tronque au-delà de 72 octets, pas de coût mémoire réglable) ; PBKDF2 | [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [argon2-cffi](https://argon2-cffi.readthedocs.io/) | en vigueur |
| 2026-10-08 | Mots de passe de **15 à 128 caractères, sans règle de composition**, liste de mots de passe interdits | Le NIST impose 15 caractères pour un facteur unique et interdit les règles de composition ; avec la limitation des tentatives, dépasse les 50 bits demandés par la CNIL | 8 caractères avec majuscule, chiffre et symbole obligatoires | [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html), [CNIL, délibération 2022-100](https://www.cnil.fr/sites/cnil/files/atoms/files/deliberation-2022-100-du-21-juillet-2022_recommandation-aux-mots-de-passe.pdf) | en vigueur |
| 2026-10-08 | Même réponse et même temps de réponse que le compte existe ou non | Pas d'énumération des comptes | Message « compte inconnu » | [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) | en vigueur |
| 2026-10-08 | Contrôle de l'en-tête **`Origin`** sur les requêtes qui modifient des données, API en JSON uniquement | Protection CSRF en plus de `SameSite` | Jeton CSRF synchronisé (inutile sur une seule origine avec ces deux protections) | [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) | en vigueur |
| 2026-10-08 | **TOTP obligatoire** pour Developer et Owner | Comptes à privilèges qui voient les données de santé de toutes les crèches | Mot de passe seul ; SMS (vulnérable à l'échange de carte SIM) | [ANSSI, authentification multifacteur et mots de passe](https://cyber.gouv.fr/publications/recommandations-relatives-lauthentification-multifacteur-et-aux-mots-de-passe) | en vigueur (LUN-006) |
| 2026-10-08 | **PIN tablette** vérifié côté serveur, accepté seulement depuis une tablette enrôlée, bloqué après 3 échecs, session d'action de 2 min | Un PIN à 4 chiffres vaut environ 13 bits : la CNIL ne l'admet que lié à un matériel avec blocage après 3 échecs. Corrige la cause d'ANO-001 | PIN vérifié dans le navigateur (v1) | [ADR-003](ADR-003-authentification-v2.md), [CNIL, délibération 2022-100](https://www.cnil.fr/sites/cnil/files/atoms/files/deliberation-2022-100-du-21-juillet-2022_recommandation-aux-mots-de-passe.pdf) | en vigueur (LUN-005) |

## Méthode et outillage

| Date | Choix | Raisons | Écarté | Sources | Statut |
|---|---|---|---|---|---|
| 2026-10-08 | **Scrum** (sprints de 2 semaines) + **Gantt** pour le macro | Le Gantt sert au planning annuel et au prévu/réel ; Scrum livre un incrément démontrable par sprint | Cycle en V seul ; Kanban sans jalons | [AGENTS.md](../../AGENTS.md) | en vigueur |
| 2026-10-08 | **ADR** pour les choix structurants, ce registre pour tous les choix | Trace des options écartées et de leurs raisons (C1.3.2, C3.2.2) | Décisions non écrites | [Michael Nygard, *Documenting Architecture Decisions*](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) | en vigueur |
| 2026-10-08 | Conventional Commits, SemVer, `CHANGELOG.md` | Historique lisible, journal des versions exigé en BC04 (C4.3.2) | Messages libres | [Conventional Commits](https://www.conventionalcommits.org/fr/v1.0.0/), [SemVer](https://semver.org/lang/fr/) | en vigueur |
