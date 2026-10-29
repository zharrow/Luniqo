# Image `luniqo/test`

Conteneur de **tests** de la chaîne d'intégration (consigne supplémentaire du
TP). Lancé une fois, après un lint réussi, il exécute toute la suite de tests
de l'API avec pytest : tests **unitaires** et tests **d'intégration** sur une
vraie PostgreSQL, fournie par le conteneur `test-db` (image `luniqo/db` de la
pile, données en mémoire). Code de sortie 0 : tous les tests passent, la pile
peut être déployée.

Mesuré le 2026-10-29 sur `develop` (`f500052`) : **543 tests, 0 ignoré, en
50 s** ; 88 s pour la chaîne complète (construction en cache, lint, base de
test, tests).

Le code n'est pas copié dans l'image, il est **monté en lecture seule** au
run. La même image teste n'importe quelle version du code, et les tests ne
peuvent pas le modifier.

## Construction

Deux étapes, comme l'image `api` :

1. **`build`** : `python3`, environnement virtuel, installation de
   `api/requirements-dev.txt` (dépendances de l'API, plus pytest et httpx2),
   puis retrait de pip.
2. **image finale** : `python3`, l'environnement virtuel, l'entrypoint et le
   lanceur `run_pytest.py`.

### Dépendances installées

| Dépendance | Source | Pourquoi |
|---|---|---|
| `python3` (3.14) | apk | Interpréteur, même version que l'image `api` et que la CI GitHub. |
| Dépendances de l'API (`fastapi`, `sqlalchemy`, `psycopg`, `alembic`, `argon2-cffi`, `cryptography`...) | PyPI, versions de `api/requirements.txt` | Le code testé doit tourner avec exactement les versions de production. |
| `pytest` 9.1.1, `httpx2` 2.13.1 | PyPI, versions de `api/requirements-dev.txt` | Lanceur de tests ; client HTTP qui appelle l'application en mémoire (sans serveur). |

Toutes existent en paquets précompilés pour musl : `--only-binary=:all:`
interdit toute compilation, aucun compilateur n'est installé.

### Manipulations sur l'OS

| Instruction | Pourquoi |
|---|---|
| `python3 -m venv /opt/venv`, puis `pip uninstall pip` | Environnement isolé ; pip ne sert qu'au build. |
| `install -d -o app -g app -m 0755 /reports` | Dossier du rapport JUnit, à `app` (voir [lint](../lint/README.md) : propriétaire hérité par le volume). |
| `ENV PYTHONDONTWRITEBYTECODE=1` | Aucun `.pyc` écrit dans le code monté en lecture seule. |
| `ENV CI=true` | Les tests d'intégration ne peuvent pas être ignorés en silence : sans base, `api/tests/integration/conftest.py` arrête tout avec une erreur. |
| `WORKDIR /workspace/api` | Point de montage du code de l'API. |
| `USER app` | Les tests ne tournent pas en root. |

### Ports

Aucun port exposé. Le conteneur rejoint le réseau `ci` (`internal: true`) pour
joindre `test-db:5432` : aucune sortie vers internet, rien de joignable depuis
l'hôte.

## Arguments attendus au run

### Montages et secret

| Montage | Rôle |
|---|---|
| `../api:/workspace/api:ro` | Code et tests de l'API, en lecture seule. |
| volume `reports:/reports` | Rapport JUnit `pytest.xml`, format lu par toutes les CI. |
| secret `db_password` | Mot de passe de la base de test, en fichier. |

### Arguments de l'application

| Variable | Défaut | Contrôle | Rôle |
|---|---|---|---|
| `TEST_DB_ADDR` | `test-db:5432` | forme `hôte:port` | Base des tests d'intégration. |
| `TEST_DB_NAME` | `luniqo_test` | identifiant **terminé par `_test`** | Garde-fou repris des tests : la base est vidée à chaque passage, jamais une autre que celle de test. |
| `TEST_DB_USER` | `luniqo` | identifiant | Rôle PostgreSQL. |
| `TEST_DB_PASSWORD_FILE` | `/run/secrets/db_password` | fichier lisible non vide | Lu par l'entrypoint, transmis au seul processus pytest (`TEST_DB_PASSWORD`) : il n'apparaît pas dans `docker inspect`. |
| `TEST_STOP_TIMEOUT` | `5` | 1 à 60 | Secondes laissées à pytest pour s'arrêter après le signal d'arrêt (voir plus bas). |
| `PYTEST_ADDOPTS` | vide | (lu par pytest) | Options supplémentaires, par ex. `-x -k cleaning` pour s'arrêter au premier échec et ne lancer qu'un domaine. |

### Arguments Docker (ressources)

| Option `docker run` | Équivalent compose | Variable | Mesure (2026-10-29) |
|---|---|---|---|
| `--cpus 1.0` | `deploy.resources.limits.cpus` | `TEST_CPUS` | 47,6 s de CPU pour 50 s de tests : le conteneur est **au plafond de sa limite**. pytest exécute les tests l'un après l'autre dans un seul processus : un cœur de plus ne raccourcirait presque rien. |
| `--memory 512m` | `deploy.resources.limits.memory` | `TEST_MEMORY` | Voir ci-dessous : **224 Mo** de mémoire propre aux processus au plus, plus le cache des fichiers lus. |
| `--pids-limit 32` | `deploy.resources.limits.pids` | `TEST_PIDS` | 10 à 11 au plus (tini, pytest, la boucle asyncio, les threads de hachage des mots de passe d'anyio). |

**Une limite à 256 Mo frôlait l'arrêt pour manque de mémoire.** Première
valeur choisie : 256 Mo. Le pic relevé par le cgroup (`memory.peak`) valait
exactement 256 Mo. Ce compteur inclut le cache des fichiers, que le noyau peut
libérer : il fallait séparer les deux, en relevant chaque seconde
`memory.stat` pendant les tests.

| Limite | Mémoire propre (`anon`) au plus | Cache (`file`) au plus | Durée des tests |
|---|---|---|---|
| 1 Go (sans contrainte réelle) | 224 Mo | 89 Mo | 49,1 s |
| 256 Mo | **248 Mo** | 18 Mo (réduit par le noyau) | 48,7 s |

À 256 Mo, le noyau réduisait le cache pour faire de la place, et les tests ne
gardaient que 8 Mo de marge : un test de plus, ou une dépendance plus
gourmande, et le noyau aurait tué pytest (OOM). La durée ne bougeait pas, donc
rien ne le signalait. La répartition de ces 224 Mo n'a pas été mesurée :
interpréteur et bibliothèques chargées, 543 tests collectés, et 19 Mio par
hachage Argon2id en cours (ADR-003). Limite retenue : **512 Mo**, deux fois
le besoin mesuré.

La base de test (`test-db`) a les siennes : `TEST_DB_CPUS` (1.0),
`TEST_DB_MEMORY` (256M, **tmpfs des données compris**), `TEST_DB_PIDS` (48,
un processus par connexion), `TEST_DB_TMPFS` (128m), `TEST_DB_MAX_CONNECTIONS`
(30), `TEST_DB_SHARED_BUFFERS` (32MB). Mesuré : 98 Mo au plus (`memory.peak`,
données comprises) et 16 processus au plus, 4 s de CPU.

## Entrypoint

```dockerfile
ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/entrypoint.sh"]
CMD ["python", "/usr/local/lib/tp/run_pytest.py", "-ra", "-p", "no:cacheprovider",
     "--junitxml=/reports/pytest.xml"]
```

1. **tini** (PID 1) lance `entrypoint.sh`.
2. **`entrypoint.sh`** vérifie les arguments (code 64 si l'un est invalide ou
   si le code n'est pas monté), affiche les ressources, lit le secret, puis
   `exec "$@"`.
3. **`run_pytest.py`** lance pytest (`pytest.main()`) et sort avec son code.
   `-p no:cacheprovider` : pas de dossier `.pytest_cache` dans le code en
   lecture seule.

Les dépendances de démarrage sont dans le compose : `test` attend que `lint`
se **termine avec succès** (`service_completed_successfully`) et que
`test-db` soit **saine** (`service_healthy`, `pg_isready`).

## Gestion des signaux d'arrêt

`STOPSIGNAL SIGINT` plutôt que SIGTERM : pytest traite SIGINT comme un
Ctrl-C. Il interrompt le test en cours, exécute les nettoyages des fixtures
et **écrit quand même son rapport**. SIGTERM le tuerait net, sans rapport.

### Le blocage trouvé, et sa correction

Premiers essais de `docker stop` pendant les tests (2026-10-29, sur la suite
de 473 tests d'avant les passkeys), pytest lancé directement : **3 arrêts sur 6 restaient bloqués** jusqu'au SIGKILL de
Docker, 15 s plus tard (code 137). Diagnostic, mené dans le conteneur
bloqué :

1. `/proc/<pid>/task/*` : le thread principal attend (`futex_wait`) un thread
   nommé `AnyIO worker thread`.
2. Code d'anyio 4.15.1 : ces threads de travail servent ici à hacher les mots
   de passe (`anyio.to_thread.run_sync`). Ils **ne sont pas des démons** et
   attendent dans `queue.get()` un ordre d'arrêt que la boucle asyncio envoie
   en se terminant.
3. Quand le signal tombe pendant du code synchrone (SQLAlchemy, `inspect`),
   la boucle meurt sans envoyer cet ordre. Deux attentes infinies en
   découlent : la fixture asynchrone en cours de nettoyage attend une tâche
   morte, et l'interpréteur, à la sortie, attend des threads qui ne
   finiront jamais.

Le même blocage frappe un développeur qui fait Ctrl-C en local : il lui faut
un second Ctrl-C.

Correction, limitée au conteneur, sans toucher au code des tests :
`run_pytest.py` appelle `pytest.main()`, puis termine le processus avec
`os._exit(code)` une fois les rapports écrits. Au premier SIGINT, il arme en
plus un délai de grâce (`TEST_STOP_TIMEOUT`, 5 s) : passé ce délai, sortie
forcée avec le code d'interruption de pytest (2).

| Version | Arrêts propres | Bloqués (SIGKILL après 15 s) |
|---|---|---|
| pytest lancé directement | 3 sur 6 | 3 |
| `os._exit` après `pytest.main()` | 6 sur 8 | 2 |
| `os._exit` + délai de grâce sur SIGINT | **10 sur 10** (9 en moins d'une seconde, 1 en 5,2 s) | 0 |

Dans les dix cas, le code de sortie est 2 (« interrompu ») et le rapport
JUnit est écrit, avec les tests passés jusqu'à l'arrêt.
