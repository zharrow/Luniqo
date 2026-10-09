# Luniqo API (v2)

API de la v2 de Luniqo, en FastAPI ([ADR-001](../M2/decisions/ADR-001-reecriture-backend.md)).
Elle remplace progressivement l'accès direct du navigateur à Supabase de la v1.

État au 2026-10-08 : **socle en cours**. Comptes et sessions
([ADR-003](../M2/decisions/ADR-003-authentification-v2.md), LUN-003), entreprises,
crèches et accès par crèche (LUN-004). Pas encore de TOTP (LUN-006) : ne pas
exposer en dehors d'un environnement de test.

## Routes

| Route | Rôle |
|---|---|
| `GET /api/health` | État de l'API et de la base (200, ou 503 si la base est injoignable) |
| `POST /api/v2/auth/login` | Connexion : pose le cookie de session `__Host-luniqo_session`. 401 si refusée, 429 + `Retry-After` si trop de tentatives |
| `POST /api/v2/auth/logout` | Déconnexion : supprime la session en base et le cookie |
| `GET /api/v2/auth/me` | Utilisateur de la session (401 sans session valable) |
| `GET /api/v2/nurseries` | Crèches accessibles : toutes celles de l'entreprise (direction, `?include_inactive=true` pour les fermées), celles accordées (employé) |
| `POST /api/v2/nurseries` | Créer une crèche dans son entreprise (direction) |
| `GET /api/v2/nurseries/{id}` | Lire une crèche (404 si inexistante **ou** inaccessible) |
| `PATCH /api/v2/nurseries/{id}` | Modifier ou fermer une crèche (direction) |
| `GET /api/v2/nurseries/{id}/staff` | Employés ayant accès à la crèche (direction) |
| `PUT`, `DELETE /api/v2/nurseries/{id}/staff/{user_id}` | Accorder, retirer l'accès d'un employé de l'entreprise (direction) ; effet immédiat |
| `GET /api/v2/staff` | Employés de l'entreprise et crèches accessibles à chacun (direction) |

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
│   │   ├── dependencies.py  CurrentUser : point unique de vérification de session
│   │   ├── router.py        routes /api/v2/auth/*
│   │   └── schemas.py       schémas Pydantic
│   ├── nurseries/     entreprises, crèches, accès du personnel (même découpage)
│   │   └── access.py        règle d'accès à une crèche (fonction pure)
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
  limitation des tentatives. Règles et raisons : [ADR-003](../M2/decisions/ADR-003-authentification-v2.md) ;
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

## Développement

```bash
cd api
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements-dev.txt

pytest                          # tests unitaires, sans base de données (134 au 2026-10-08)

# Tests d'intégration sur une vraie PostgreSQL (31 au 2026-10-08), base jetable
# construite avec l'image luniqo/db du TP Docker (cd ../docker && docker compose build db) :
scripts/test-db.sh up           # affiche la ligne export TEST_DB_... à copier
export TEST_DB_ADDR=127.0.0.1:55432 TEST_DB_NAME=luniqo_test TEST_DB_PASSWORD=luniqo-test
pytest                          # unitaires + intégration
pytest -m integration           # intégration seulement
scripts/test-db.sh down

# Avec une base PostgreSQL joignable depuis la machine (celle du TP Docker
# n'est pas publiée sur l'hôte, elle est sur un réseau interne) :
export DB_ADDR=localhost:5432 DB_PASSWORD=...
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
