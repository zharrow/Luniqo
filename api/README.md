# Luniqo API (v2)

API de la v2 de Luniqo, en FastAPI ([ADR-001](../M2/decisions/ADR-001-reecriture-backend.md)).
Elle remplace progressivement l'accès direct du navigateur à Supabase de la v1.

État au 2026-10-08 : **squelette**. Modèle entreprise/crèche, une migration, un
jeu de données synthétique, deux routes. Pas encore d'authentification
(ADR-003 à venir) : ne pas exposer en dehors d'un environnement de test.

## Routes

| Route | Rôle |
|---|---|
| `GET /api/health` | État de l'API et de la base (200, ou 503 si la base est injoignable) |
| `GET /api/v2/nurseries` | Crèches actives |
| `GET /api/docs` | Swagger UI |
| `GET /api/redoc` | ReDoc |
| `GET /api/openapi.json` | Schéma OpenAPI |

## Structure

```
api/
├── app/
│   ├── main.py        application FastAPI, routes
│   ├── config.py      configuration lue dans l'environnement
│   ├── db.py          moteur SQLAlchemy asynchrone, session par requête
│   ├── models.py      modèle de données (SQLAlchemy 2)
│   ├── schemas.py     schémas Pydantic exposés par l'API
│   └── seed.py        données de démonstration synthétiques
├── migrations/        migrations Alembic
├── tests/             tests unitaires (pytest)
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
- **Isolation par crèche** : à venir. Toutes les routes métier passeront par une
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

## Développement

```bash
cd api
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements-dev.txt

pytest                          # tests unitaires, sans base de données

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
régénérer `requirements.txt` avec `pip freeze`.

## Exécution en conteneur

L'image est construite par le TP Docker (`M2/Docker/`),
qui récupère ce dossier comme contexte de build. Voir son `api/README.md`.
