# Image `luniqo/api`

Le back de Luniqo : l'API de la v2, écrite avec FastAPI et servie par uvicorn.
Elle n'est reliée qu'au réseau interne `backend` : on y accède par la
passerelle `web`, sous `/api/`.

| Route | Rôle |
|---|---|
| `GET /api/health` | État de l'API et de sa connexion à la base (200 ou 503). Utilisé par le healthcheck. |
| `GET /api/v2/nurseries` | Crèches actives, lues dans PostgreSQL (données synthétiques). |
| `GET /api/docs` | Documentation interactive Swagger UI, générée par FastAPI. |
| `GET /api/redoc`, `GET /api/openapi.json` | Documentation ReDoc et schéma OpenAPI. |

## D'où vient le code ?

Le code de l'API vit à la racine du dépôt, dans [`api/`](../../../api/), avec ses
tests et sa documentation : ce dossier `M2/Docker/` ne contient que de quoi le
conteneuriser. Le compose fournit `api/` au build comme un **contexte nommé** :

```yaml
additional_contexts:
  luniqo-api: ../../api
```

Le Dockerfile y puise avec `COPY --from=luniqo-api`. Le contexte principal du
build reste `M2/Docker/api/` (le Dockerfile et l'entrypoint).

## Construction

L'image est construite en **deux étapes** (*multi-stage build*) :

1. **`build`** : installe les dépendances Python dans un environnement virtuel
   `/opt/venv`, puis désinstalle `pip`.
2. **image finale** : repart de l'image de base, installe seulement `python3`
   et recopie `/opt/venv` et le code. Les outils d'installation ne sont pas
   dans l'image livrée.

### Dépendances installées

| Paquet / dépendance | Pourquoi |
|---|---|
| `python3` (apk, 3.14) | Interpréteur. Fournit aussi `venv` et `ensurepip`, utilisés à l'étape `build`. |
| `fastapi` | Framework de l'API : routage, validation par Pydantic, documentation OpenAPI et Swagger générées. |
| `uvicorn` | Serveur ASGI qui exécute l'application. Sans les extras `[standard]` : pas de bibliothèques compilées supplémentaires. |
| `sqlalchemy[asyncio]` | Accès à la base. L'extra `asyncio` ajoute `greenlet`, nécessaire au mode asynchrone. |
| `psycopg[binary]` | Pilote PostgreSQL, avec la libpq précompilée (pas besoin d'installer `libpq` par apk). |
| `alembic` | Migrations versionnées du schéma. |

Les versions exactes, dépendances transitives comprises, sont figées dans
`api/requirements.txt` du dépôt nursery-app. Toutes existent en paquets
précompilés pour musl (`musllinux`) et Python 3.14 : **aucun compilateur** n'est
installé.

### Manipulations sur l'OS

| Instruction | Pourquoi |
|---|---|
| `python3 -m venv /opt/venv` | Environnement isolé : les dépendances ne se mélangent pas aux paquets Python du système (Alpine interdit d'ailleurs `pip install` hors environnement virtuel). |
| `pip uninstall -y pip` | `pip` ne sert qu'à l'installation : retiré de l'environnement livré. |
| `WORKDIR /app` avant les `COPY` | Crée `/app` en 755. Au premier essai, `COPY --chmod=0644 alembic.ini /app/alembic.ini` avait créé `/app` en 644 : dossier impossible à parcourir, et Alembic ne trouvait plus sa configuration. |
| `COPY --from=luniqo-api ...` | Code, migrations et configuration Alembic, appartenant à root : lisibles par `app`, pas modifiables. |
| `ENV PATH=/opt/venv/bin:$PATH` | `uvicorn`, `alembic` et `python` sont ceux du venv. |
| `ENV PYTHONDONTWRITEBYTECODE=1` | Pas de fichiers `.pyc` : le système de fichiers est en lecture seule. |
| `ENV PYTHONUNBUFFERED=1` | Les logs partent immédiatement vers `docker logs`. |
| `USER app` | L'API ne tourne pas en root. |

### Port

`EXPOSE 8000/tcp`. Non publié sur l'hôte : seule la passerelle y accède.

## Arguments attendus au run

### Arguments de l'application (variables d'environnement)

| Variable | Défaut | Contrôle | Rôle |
|---|---|---|---|
| `API_WORKERS` | `1` | 1 à 16 | Nombre de processus uvicorn. Chaque worker est un interpréteur Python complet (~70 Mo mesurés) : la valeur suit la limite CPU (1 worker pour 0,5 CPU). |
| `DB_POOL_SIZE` | `8` | 1 à 100 | Connexions à la base par worker. Borne le nombre de requêtes qui interrogent la base en même temps. `API_WORKERS × DB_POOL_SIZE` doit rester sous `DB_MAX_CONNECTIONS` de l'image `db`. |
| `DB_ADDR` | `db:5432` | forme `hôte:port` | Adresse de la base. |
| `DB_NAME`, `DB_USER` | `luniqo` | identifiants | Base et rôle créés par l'image `db`. |
| `DB_PASSWORD_FILE` | `/run/secrets/db_password` | fichier lisible non vide | Mot de passe (secret Docker), lu par l'application, jamais en variable. |
| `SEED_DEMO` | `false` (`true` dans le compose) | `true`/`false` | Insère au démarrage un jeu de données **synthétique** (un groupe, deux crèches). Idempotent. |

### Arguments Docker (ressources)

| Option `docker run` | Équivalent compose | Valeur | Rôle |
|---|---|---|---|
| `--cpus 0.5` | `deploy.resources.limits.cpus` | `API_CPUS` | Un demi-cœur. |
| `--memory 128m` | `deploy.resources.limits.memory` | `API_MEMORY` | 68 à 72 Mo mesurés au repos, 73 à 77 Mo au plus sous charge selon les essais. Juste après le démarrage, `docker stats` peut afficher davantage : le cache des fichiers lus (bibliothèques Python), récupérable par le noyau avant tout OOM. |
| `--pids-limit 32` | `deploy.resources.limits.pids` | `API_PIDS` | 3 au repos, 6 au plus sous charge (mesuré). Marge pour les threads de résolution DNS d'asyncio. |
| `--dns-option timeout:1 --dns-option attempts:1` | `dns_opt:` | | Voir « Base indisponible » ci-dessous. |

## Entrypoint

```dockerfile
ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000",
     "--proxy-headers", "--timeout-graceful-shutdown", "10", "--no-server-header"]
```

1. **tini** (PID 1) lance `entrypoint.sh`.
2. **`entrypoint.sh`** :
   - vérifie les arguments ;
   - affiche les ressources allouées et le nombre maximum de connexions à la base ;
   - applique les migrations : `alembic upgrade head`. Le schéma suit toujours
     la version du code ; une seule réplique de l'API, donc pas de migrations
     concurrentes ;
   - si `SEED_DEMO=true`, insère les données de démonstration ;
   - exporte `WEB_CONCURRENCY` (lu par uvicorn comme nombre de workers) et
     `FORWARDED_ALLOW_IPS=*` (l'API ne reçoit que des requêtes de la passerelle,
     sur le réseau interne : on fait confiance à ses en-têtes `X-Forwarded-*`) ;
   - fait `exec "$@"`.
3. uvicorn remplace le shell et reçoit directement les signaux.

## Gestion des signaux d'arrêt

`STOPSIGNAL SIGTERM`. uvicorn intercepte le signal : il cesse d'accepter des
connexions, laisse les requêtes en cours se terminer (10 s au plus,
`--timeout-graceful-shutdown`), puis l'application ferme son pool de connexions
à la base (`engine.dispose()` dans le *lifespan* FastAPI).

```
api-1  | INFO:     Shutting down
api-1  | INFO:     Waiting for application shutdown.
api-1  | INFO:     Application shutdown complete.
api-1  | INFO:     Finished server process [6]
```

Arrêt mesuré : moins d'une seconde. Le code de sortie est **143** (128 + 15)
et non 0 : après un arrêt propre, uvicorn se renvoie le signal reçu pour que
son parent sache pourquoi il s'est arrêté (`signal.raise_signal` dans
`uvicorn/server.py`). Un `SIGKILL` donnerait 137, après le délai de 15 s.

## Healthcheck

```dockerfile
HEALTHCHECK --interval=5s --timeout=3s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8000/api/health || exit 1
```

`/api/health` exécute `SELECT 1` : l'API n'est saine que si elle joint la base.

## Ce que les mesures ont fait changer

Les choix ci-dessus viennent de tests réels du 2026-10-08 (3 000 requêtes,
60 simultanées, sur `/api/v2/nurseries` via la passerelle).

| Version | Résultat | Cause | Correction |
|---|---|---|---|
| Routes synchrones, 2 workers | 147 Mo au repos sur 192 Mo | 3 processus Python (superviseur + 2 workers) pour un demi-cœur | 1 worker : 72 Mo |
| Routes synchrones, 1 worker | 2 697 erreurs 500 sur 3 000, API `unhealthy` | FastAPI exécute les routes synchrones dans un pool de 40 threads : la limite `pids` (32) est dépassée, `RuntimeError: can't start new thread` | Borner le pool de threads |
| Pool de threads borné à 8 | Pool de connexions épuisé, requêtes bloquées 30 s | La fermeture des sessions (sortie des dépendances à `yield`) s'exécute dans des threads hors de cette borne (`exit_limiter` recréé à chaque appel, `fastapi/concurrency.py`), qui butent à leur tour sur la limite `pids` | Passer l'API en asynchrone |
| **Routes et accès base asynchrones** | **3 000 réponses 200 en 9 s, 6 PIDs et 77 Mo au plus, aucune erreur** ; l'API plafonne à sa limite de 0,5 CPU | | Version retenue |

## Base indisponible

Quand la base est arrêtée, son nom `db` disparaît du DNS de Docker. Celui-ci
tente alors de relayer la requête vers l'extérieur, impossible sur un réseau
`internal` : le résolveur de musl attendait **5 s** (mesuré) avant d'échouer,
et `/api/health` dépassait le délai du healthcheck.

Corrections : délai de connexion de 2 s côté application et
`dns_opt: [timeout:1, attempts:1]` dans le compose. Mesuré : la base arrêtée,
`/api/health` répond **503 en 1,0 s**, l'API passe `unhealthy`, puis redevient
`healthy` d'elle-même quand la base revient, sans redémarrage.
