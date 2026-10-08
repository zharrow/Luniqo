# Luniqo API (v2)

API de la v2 de Luniqo, en FastAPI ([ADR-001](../M2/decisions/ADR-001-reecriture-backend.md)).
Elle remplace progressivement l'accès direct du navigateur à Supabase de la v1.

État au 2026-10-08 : **socle en cours**. Entreprises et crèches, comptes et
sessions ([ADR-003](../M2/decisions/ADR-003-authentification-v2.md), LUN-003).
Les droits d'accès par crèche arrivent avec LUN-004 : `GET /api/v2/nurseries`
reste ouverte, sur données synthétiques. Ne pas exposer en dehors d'un
environnement de test.

## Routes

| Route | Rôle |
|---|---|
| `GET /api/health` | État de l'API et de la base (200, ou 503 si la base est injoignable) |
| `GET /api/v2/nurseries` | Crèches actives (sans contrôle d'accès jusqu'à LUN-004) |
| `POST /api/v2/auth/login` | Connexion : pose le cookie de session `__Host-luniqo_session`. 401 si refusée, 429 + `Retry-After` si trop de tentatives |
| `POST /api/v2/auth/logout` | Déconnexion : supprime la session en base et le cookie |
| `GET /api/v2/auth/me` | Utilisateur de la session (401 sans session valable) |
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
│   ├── security.py    contrôle de l'en-tête Origin (CSRF)
│   ├── config.py      configuration lue dans l'environnement
│   ├── db.py          moteur SQLAlchemy asynchrone, session par requête
│   ├── models.py      modèle de données (SQLAlchemy 2)
│   ├── schemas.py     schémas Pydantic exposés par l'API
│   └── seed.py        données de démonstration synthétiques
├── migrations/        migrations Alembic
├── tests/             tests unitaires (pytest) ; tests/auth/ utilise un dépôt en mémoire
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
- **Dépendances FastAPI toujours `async def`** : une dépendance `def` est
  exécutée dans un thread, ce qui recrée le problème de limite de processus.
  Un test (`test_aucune_dependance_synchrone`) le vérifie.
- **Isolation par crèche** : à venir (LUN-004). Toutes les routes métier passeront par une
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

pytest                          # tests unitaires, sans base de données (73 au 2026-10-08)

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
