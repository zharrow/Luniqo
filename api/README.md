# Luniqo API (v2)

API de la v2 de Luniqo, en FastAPI ([ADR-001](../M2/decisions/ADR-001-reecriture-backend.md)).
Elle remplace progressivement l'accès direct du navigateur à Supabase de la v1.

État au 2026-10-10 : **parcours central complet côté API** (LUN-003 à LUN-011) ;
fiche de ménage : pièces, catalogue des tâches et fréquences (LUN-76), coches depuis la tablette (LUN-77).
Second facteur obligatoire pour la direction et l'éditeur
([ADR-004](../M2/decisions/ADR-004-double-authentification.md), LUN-006) : TOTP
et codes de secours ; les passkeys suivent. Pas encore de données réelles
(LUN-019, LUN-021) : ne pas exposer en dehors d'un environnement de test.

## Routes

| Route | Rôle |
|---|---|
| `GET /api/health` | État de l'API et de la base (200, ou 503 si la base est injoignable) |
| `POST /api/v2/auth/login` | Connexion : pose le cookie de session `__Host-luniqo_session`. 401 si refusée, 429 + `Retry-After` si trop de tentatives |
| `POST /api/v2/auth/logout` | Déconnexion : supprime la session en base et le cookie |
| `GET /api/v2/auth/me` | Utilisateur de la session et état du second facteur `mfa` (401 sans session valable) |
| `GET /api/v2/auth/mfa` | État du second facteur : TOTP actif, activation en cours, codes de secours restants |
| `POST /api/v2/auth/mfa/totp` | Commencer l'activation (ou le remplacement) d'un TOTP : secret et URI du QR code, renvoyés une seule fois |
| `POST /api/v2/auth/mfa/totp/confirm` | Confirmer avec un premier code ; renvoie 10 codes de secours si le compte n'en avait pas ; ferme les autres sessions |
| `POST /api/v2/auth/mfa/verify` | Présenter le second facteur (code TOTP ou code de secours) : la session devient complète. 429 si trop de tentatives |
| `DELETE /api/v2/auth/mfa/totp` | Retirer le TOTP (comptes où il est facultatif ; 409 pour la direction) |
| `POST /api/v2/auth/mfa/backup-codes` | Nouveaux codes de secours, les anciens sont annulés |
| `GET /api/v2/nurseries` | Crèches accessibles : toutes celles de l'entreprise (direction, `?include_inactive=true` pour les fermées), celles accordées (employé) |
| `POST /api/v2/nurseries` | Créer une crèche dans son entreprise (direction) |
| `GET /api/v2/nurseries/{id}` | Lire une crèche (404 si inexistante **ou** inaccessible) |
| `PATCH /api/v2/nurseries/{id}` | Modifier ou fermer une crèche (direction) |
| `GET /api/v2/nurseries/{id}/staff` | Employés ayant accès à la crèche (direction) |
| `PUT`, `DELETE /api/v2/nurseries/{id}/staff/{user_id}` | Accorder, retirer l'accès d'un employé de l'entreprise (direction) ; effet immédiat |
| `GET /api/v2/staff` | Employés de l'entreprise et crèches accessibles à chacun (direction) |
| `POST`, `GET /api/v2/nurseries/{id}/tablets` | Enrôler **l'appareil qui fait la requête** comme tablette de la crèche (cookie d'appareil 90 jours), lister (direction) |
| `DELETE /api/v2/nurseries/{id}/tablets/{tablet_id}` | Révoquer une tablette ; ses sessions sont fermées (direction) |
| `PUT /api/v2/auth/me/pin` | L'employé choisit son PIN (4 chiffres, mot de passe confirmé) ; débloque le PIN |
| `POST /api/v2/staff/{user_id}/pin/unlock` | Débloquer le PIN d'un employé (direction) |
| `GET /api/v2/tablet` | Sur la tablette : crèche et personnel (prénom, initiale) |
| `POST`, `GET`, `DELETE /api/v2/tablet/session` | Ouvrir par PIN une session d'action de 2 minutes, la consulter, la fermer |
| `GET`, `POST /api/v2/nurseries/{id}/families`, `GET`, `PATCH …/families/{family_id}` | Familles de la crèche (lecture : direction et employés ayant accès ; écriture : direction) |
| `POST …/families/{family_id}/children`, `POST …/families/{family_id}/guardians` | Ajouter un enfant, un responsable à une famille (direction) |
| `GET /api/v2/nurseries/{id}/children` | Enfants de la crèche, sauf partis (`?status=` pour filtrer) |
| `GET`, `PATCH …/children/{child_id}` | Fiche de l'enfant avec ses responsables et leurs autorisations ; modifier, déclarer un départ (direction) |
| `PATCH …/guardians/{guardian_id}` | Modifier un responsable (direction) |
| `PUT`, `DELETE …/children/{child_id}/guardians/{guardian_id}` | Relier un responsable **de la même famille** avec ses autorisations, retirer le lien (direction) |
| `GET /api/v2/tablet/children` | Sur la tablette (session par PIN) : enfants attendus aujourd'hui, état de présence, personnes autorisées |
| `POST /api/v2/tablet/children/{child_id}/arrival` | Pointer l'arrivée (heure du serveur), avec le responsable qui dépose l'enfant si connu |
| `POST /api/v2/tablet/children/{child_id}/departure` | Pointer le départ ; refusé si la personne n'est pas autorisée à venir chercher l'enfant |
| `GET /api/v2/nurseries/{id}/attendance`, `…/attendance/present` | Présences d'un jour (`?day=`, aujourd'hui à Paris par défaut), enfants présents maintenant |
| `POST /api/v2/nurseries/{id}/guardians/{guardian_id}/invitation` | Inviter un responsable à créer son compte famille : lien à usage unique, 7 jours (direction) |
| `POST /api/v2/invitations/lookup`, `POST /api/v2/invitations/accept` | Sans session : lire l'invitation, créer le compte (ou relier un compte famille existant) ; jeton dans le corps |
| `GET /api/v2/family/children`, `GET /api/v2/family/children/{child_id}` | Parent connecté : ses enfants (autorité parentale requise), présence du jour, présences récentes (`?days=`, 62 au plus), contacts sans coordonnées |
| `GET`, `POST /api/v2/cleaning-tasks`, `PATCH …/cleaning-tasks/{task_id}` | Catalogue des tâches de ménage de l'entreprise, commun à ses crèches (direction) ; une tâche désactivée sort des fiches de toutes les crèches |
| `GET`, `POST /api/v2/nurseries/{id}/rooms`, `GET`, `PATCH …/rooms/{room_id}` | Pièces de la crèche et, dans le détail, toutes leurs tâches (lecture : direction et employés ayant accès ; écriture : direction) |
| `PUT …/rooms/{room_id}/tasks/{task_id}` | Prévoir une tâche du catalogue dans la pièce avec sa fréquence, ou la remplacer ; `is_active: false` la retire (direction) |
| `GET /api/v2/nurseries/{id}/cleaning/plan` | Fiche du jour (`?day=`, aujourd'hui à Paris par défaut) : tâches prévues, pièce par pièce, dans l'ordre de passage |
| `GET /api/v2/tablet/cleaning` | Sur la tablette (session par PIN) : fiche du jour de la crèche, avec les tâches déjà cochées et par qui |
| `POST`, `DELETE /api/v2/tablet/cleaning/{room_task_id}/check` | Cocher une tâche prévue aujourd'hui (heure et auteur fixés par le serveur ; 409 si déjà cochée ou non prévue) ; la décocher le jour même, la coche restant tracée comme annulée |

### Second facteur (ADR-004)

Après le mot de passe, `/login` renvoie `mfa` :

| `mfa` | Signification | Ce que la session peut faire |
|---|---|---|
| `not_required` | Compte sans second facteur (employé, famille) | tout ce que son rôle permet |
| `setup_required` | Direction ou éditeur sans facteur enregistré | `/me`, déconnexion, activer un TOTP |
| `required` | Un facteur existe et doit être présenté | `/me`, déconnexion, `/mfa/verify` |
| `verified` | Second facteur présenté | tout ce que son rôle permet |

Toute autre route répond **403 « Second facteur requis »** tant que la session est en
attente : le contrôle est dans `CurrentUser`. Ajouter, changer ou retirer un facteur
exige une preuve d'identité de moins de 15 minutes et ferme les autres sessions.

### Qui accède à quoi

| Rôle | Crèches de son entreprise | Autres entreprises |
|---|---|---|
| Direction (`owner`) | toutes, gestion comprise | 404 |
| Employé | lecture des crèches accordées et ouvertes | 404 |
| Éditeur (`developer`), famille (`guardian`) | 403 : aucun accès aux données des crèches (moindre privilège ; familles : LUN-011) | 403 |

Règle : `app/nurseries/access.py`. Appliquée par les dépendances `ReadableNursery` et
`ManagedNursery` (`app/nurseries/dependencies.py`). La base la double : un accès
`nursery_access` ne peut relier qu'un employé et une crèche de la même entreprise
(clés étrangères composites).
| `GET /api/docs` | Swagger UI |
| `GET /api/redoc` | ReDoc |
| `GET /api/openapi.json` | Schéma OpenAPI |

## Structure

```
api/
├── app/
│   ├── main.py        application FastAPI, routes de supervision et crèches
│   ├── auth/          authentification : un module par domaine
│   │   ├── models.py        comptes, sessions, journal des événements
│   │   ├── passwords.py     politique et hachage Argon2id
│   │   ├── policy.py        durées de session, limitation des tentatives (fonctions pures)
│   │   ├── tokens.py        jetons de session et leur empreinte
│   │   ├── repository.py    accès à la base (contrat + implémentation SQL)
│   │   ├── service.py       connexion, vérification de session, déconnexion
│   │   ├── dependencies.py  CurrentUser : point unique de vérification de session et du second facteur
│   │   ├── router.py        routes /api/v2/auth/*
│   │   └── schemas.py       schémas Pydantic
│   ├── nurseries/     entreprises, crèches, accès du personnel (même découpage)
│   │   └── access.py        règle d'accès à une crèche (fonction pure)
│   ├── tablets/       tablettes enrôlées, PIN, sessions d'action (routes testées sur PostgreSQL)
│   ├── children/      familles, enfants, responsables (aucune donnée de santé : LUN-019)
│   ├── attendance/    pointage depuis la tablette, suivi des présences
│   ├── family/        invitations des parents, consultation famille
│   ├── cleaning/      fiche de ménage : pièces, catalogue, fréquences (règles pures : policy.py)
│   ├── mfa/           second facteur : TOTP chiffré (crypto.py), codes de secours, règles pures (policy.py)
│   ├── security.py    contrôle de l'en-tête Origin (CSRF)
│   ├── config.py      configuration lue dans l'environnement
│   ├── db.py          moteur SQLAlchemy asynchrone, session par requête
│   ├── models.py      base commune des modèles SQLAlchemy
│   ├── schemas.py     schémas Pydantic communs
│   └── seed.py        données de démonstration synthétiques
├── migrations/        migrations Alembic
├── scripts/test-db.sh base PostgreSQL jetable pour les tests d'intégration
├── tests/             tests unitaires (pytest) ; tests/auth/ et tests/nurseries/ utilisent des dépôts en mémoire
│   └── integration/   tests sur une vraie PostgreSQL : migrations, contraintes, requêtes SQL, routes
├── requirements.in    dépendances directes
├── requirements.txt   versions exactes, dépendances transitives comprises
└── requirements-dev.txt  outils de test
```

## Choix techniques

- **Routes et accès à la base asynchrones** (SQLAlchemy asyncio + psycopg 3).
  Une requête qui attend la base ne bloque aucun thread. Les routes synchrones
  ont été écartées après mesure : sous charge, le pool de threads de FastAPI
  dépassait la limite de processus du conteneur (détail dans le README de
  l'image `api` du TP Docker).
- **Migrations Alembic** appliquées au démarrage du conteneur, alors que les
  scripts SQL de la v1 étaient collés à la main dans Supabase.
- **Mot de passe de la base lu dans un fichier** (`DB_PASSWORD_FILE`, secret
  Docker), `DB_PASSWORD` en repli pour le développement local.
- **Authentification** : sessions opaques en base, Argon2id, contrôle `Origin`,
  limitation des tentatives, second facteur (TOTP chiffré en AES-256-GCM, codes de
  secours). Règles et raisons : [ADR-003](../M2/decisions/ADR-003-authentification-v2.md),
  [ADR-004](../M2/decisions/ADR-004-double-authentification.md) ;
  choix d'implémentation et mesures : [registre des choix techniques](../M2/decisions/CHOIX-TECHNIQUES.md).
- **Deux niveaux de tests.** Unitaires avec des dépôts en mémoire (rapides,
  sans base) ; intégration sur PostgreSQL : migrations réversibles et conformes
  aux modèles, contraintes de la base, requêtes SQL, routes de bout en bout.
  Chaque test d'intégration tourne dans une transaction annulée à la fin ; la
  base doit s'appeler `*_test` (elle est vidée au début de la session).
- **Dépendances FastAPI toujours `async def`** : une dépendance `def` est
  exécutée dans un thread, ce qui recrée le problème de limite de processus.
  Un test (`test_aucune_dependance_synchrone`) le vérifie.
- **Isolation par crèche** : une dépendance unique par route (`ReadableNursery`,
  `ManagedNursery`), doublée de contraintes en base. Les tests d'isolation ont
  été éprouvés en introduisant volontairement deux failles dans la règle :
  8 et 5 tests échouent (voir le registre des choix techniques). Toutes les routes métier passeront par une
  dépendance unique qui vérifie l'accès de l'utilisateur à la crèche demandée
  (cause d'[ANO-001](../M2/bloc-4-maintien-operationnel/anomalies/ANO-001-pin-tablette.md)).

## Configuration

| Variable | Défaut | Rôle |
|---|---|---|
| `DB_ADDR` | `localhost:5432` | Adresse de PostgreSQL |
| `DB_NAME`, `DB_USER` | `luniqo` | Base et rôle |
| `DB_PASSWORD_FILE` | | Fichier du mot de passe (prioritaire) |
| `DB_PASSWORD` | | Mot de passe en clair, pour le développement local |
| `DB_POOL_SIZE` | `5` | Connexions à la base par processus |
| `APP_ORIGINS` | `http://localhost:8080` | Origines acceptées pour `POST`, `PUT`, `PATCH`, `DELETE` (virgules) |
| `SESSION_COOKIE_SECURE` | `true` | `false` : cookie `luniqo_session` sans `Secure` (développement seulement) |
| `SEED_DEMO_PASSWORD` | | Mot de passe des comptes de démonstration ; absent : aucun compte créé |
| `MFA_KEY_FILE` | | Fichier de la clé AES-256 des secrets TOTP, 32 octets en base64 (prioritaire) |
| `MFA_KEY` | | La même clé en variable, pour les tests et le développement local ; sans clé, routes du second facteur en 503 |

## Développement

```bash
cd api
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements-dev.txt

pytest                          # tests unitaires, sans base de données (276 au 2026-10-10)

# Tests d'intégration sur une vraie PostgreSQL (140 au 2026-10-10), base jetable
# construite avec l'image luniqo/db du TP Docker (cd ../docker && docker compose build db) :
scripts/test-db.sh up           # affiche la ligne export TEST_DB_... à copier
export TEST_DB_ADDR=127.0.0.1:55432 TEST_DB_NAME=luniqo_test TEST_DB_PASSWORD=luniqo-test
pytest                          # unitaires + intégration
pytest -m integration           # intégration seulement
scripts/test-db.sh down

# Avec une base PostgreSQL joignable depuis la machine (celle du TP Docker
# n'est pas publiée sur l'hôte, elle est sur un réseau interne) :
export DB_ADDR=localhost:5432 DB_PASSWORD=...
export MFA_KEY=...               # openssl rand -base64 32, à conserver : une autre clé rend les TOTP illisibles
alembic upgrade head            # appliquer les migrations
python -m app.seed              # données de démonstration
uvicorn app.main:app --reload   # http://localhost:8000/api/docs
```

Nouvelle migration : `alembic revision -m "description"`, puis l'écrire à la
main dans `migrations/versions/`. Une migration déjà appliquée ne se modifie
jamais.

Mettre à jour les dépendances : modifier `requirements.in`, l'installer dans un
venv vierge **sous Alpine / Python 3.14** (même environnement que l'image), puis
régénérer `requirements.txt` avec `pip freeze`. Pour **ajouter** une dépendance
sans faire monter les autres, contraindre par les versions actuelles :

```bash
docker run --rm --user root --entrypoint /bin/sh \
  -v "$PWD/requirements.in:/tmp/requirements.in:ro" -v "$PWD/requirements.txt:/tmp/constraints.txt:ro" \
  luniqo/base:1.0 -c 'apk add -q python3 && python3 -m venv /tmp/v \
  && /tmp/v/bin/pip install -q -r /tmp/requirements.in -c /tmp/constraints.txt && /tmp/v/bin/pip freeze'
```

## Exécution en conteneur

L'image est construite par le TP Docker (`docker/`),
qui récupère ce dossier comme contexte de build. Voir son `api/README.md`.
