# Image `luniqo/db`

La base de données de Luniqo : PostgreSQL 18, installé depuis les dépôts
officiels d'Alpine sur l'image de base. Elle n'est reliée qu'au réseau interne
`backend` : ni l'hôte ni internet ne peuvent la joindre, seule l'API lui parle.

L'image ne contient aucun schéma applicatif : elle crée au premier démarrage
une base et un rôle pour l'API, qui applique ensuite ses propres migrations
(voir l'image `api`).

## Construction

### Dépendances installées

| Paquet | Pourquoi |
|---|---|
| `postgresql18` | Le serveur (`postgres`, `initdb`, `pg_ctl`). Il installe aussi `postgresql18-client` (`psql`, `pg_isready`, utilisés par l'entrypoint et le healthcheck) et `postgresql-common` (liens vers la version par défaut). Version 18.6 dans Alpine 3.24. |

### Manipulations sur l'OS

| Instruction | Pourquoi |
|---|---|
| `mkdir -p /var/lib/postgresql/data` | Dossier des données, point de montage du volume `pgdata`. |
| `chown app:app /var/lib/postgresql /var/lib/postgresql/data` | Le paquet crée `/var/lib/postgresql` pour son propre utilisateur `postgres`, en droits 750 : l'utilisateur `app` ne pourrait même pas le traverser (`initdb: could not access directory ... Permission denied`, rencontré au premier essai). Le serveur tournant sous `app`, on lui donne ces dossiers. |
| `chmod 700 /var/lib/postgresql/data` | PostgreSQL refuse de démarrer si d'autres utilisateurs peuvent lire ses données. Quand Docker crée le volume, il recopie ce dossier avec son propriétaire et ses droits. |
| `VOLUME ["/var/lib/postgresql/data"]` | Les données vivent hors de l'image : elles survivent à la recréation du conteneur et à la reconstruction de l'image. |
| `USER app` | Le serveur ne tourne pas en root (PostgreSQL refuse d'ailleurs de démarrer en root). |

Le système de fichiers de l'image est en lecture seule (`read_only: true` dans
le compose). PostgreSQL n'écrit que dans le volume et dans `/tmp` (tmpfs) où
l'on place ses sockets locaux (`unix_socket_directories=/tmp`), car le dossier
par défaut `/run/postgresql` n'est pas modifiable.

### Port

`EXPOSE 5432/tcp`, le port standard de PostgreSQL. Il n'est **pas publié** sur
l'hôte : seul le réseau interne y accède.

## Arguments attendus au run

### Arguments de l'application (variables d'environnement)

| Variable | Défaut | Contrôle | Rôle |
|---|---|---|---|
| `DB_NAME` | `luniqo` | identifiant `[a-z_][a-z0-9_]*` | Base créée pour l'API au premier démarrage. |
| `DB_USER` | `luniqo` | identifiant | Rôle propriétaire de cette base, avec lequel l'API se connecte. |
| `DB_PASSWORD_FILE` | `/run/secrets/db_password` | fichier lisible non vide | Fichier contenant le mot de passe de ce rôle (secret Docker). |
| `DB_MAX_CONNECTIONS` | `20` | 5 à 1000 | Paramètre `max_connections`. PostgreSQL crée **un processus par connexion** : cette valeur doit tenir dans la limite `pids` et rester au-dessus des connexions de l'API (`API_WORKERS × API_DB_POOL_SIZE`, 8 par défaut). 3 connexions sont réservées au superutilisateur. |
| `DB_SHARED_BUFFERS` | `64MB` | forme `64MB`, `128kB`, `1GB` | Paramètre `shared_buffers` : cache des pages en mémoire partagée. Règle usuelle : environ 25 % de la mémoire allouée (64 Mo pour 256 Mo). |

Pourquoi passer ces deux réglages explicitement ? Sans eux, PostgreSQL prend
`max_connections=100` et `shared_buffers=128MB`, valeurs qui ne tiennent pas
compte de la limite du conteneur : 100 processus dépasseraient la limite
`pids`, et le cache seul occuperait la moitié de la mémoire allouée.

Le mot de passe n'est jamais passé en variable d'environnement : il serait
visible avec `docker inspect`. L'entrypoint le fait lire par `psql` lui-même
(`\set password \`cat ...\``), il n'apparaît donc pas non plus dans les
arguments d'un processus.

### Arguments Docker (ressources)

| Option `docker run` | Équivalent compose | Valeur | Rôle |
|---|---|---|---|
| `--cpus 1.0` | `deploy.resources.limits.cpus` | `DB_CPUS` | Un cœur : les requêtes SQL sont le travail le plus coûteux de la plateforme. |
| `--memory 256m` | `deploy.resources.limits.memory` | `DB_MEMORY` | Mémoire partagée (`shared_buffers`) + mémoire de chaque processus. |
| `--pids-limit 48` | `deploy.resources.limits.pids` | `DB_PIDS` | `max_connections` (20) + processus de fond (une dizaine) + healthcheck. |
| `--mount source=pgdata,target=/var/lib/postgresql/data` | `volumes:` | | Persistance des données. |
| `-v fichier:/run/secrets/db_password:ro` | `secrets: [db_password]` | `DB_PASSWORD_FILE` du `.env` | Mot de passe dans `/run/secrets/db_password`. Hors Swarm, compose monte le fichier en lecture seule. |

```sh
docker run -d --name db --network backend \
  --cpus 1.0 --memory 256m --pids-limit 48 \
  --read-only --tmpfs /tmp:size=16m \
  -v pgdata:/var/lib/postgresql/data \
  -v "$PWD/secrets/db_password.dev:/run/secrets/db_password:ro" \
  -e DB_MAX_CONNECTIONS=20 -e DB_SHARED_BUFFERS=64MB \
  luniqo/db:1.0
```

## Entrypoint

```dockerfile
ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/entrypoint.sh"]
CMD ["postgres", "-c", "listen_addresses=*", "-c", "unix_socket_directories=/tmp"]
```

1. **tini** (PID 1) lance `entrypoint.sh` et relaiera les signaux.
2. **`entrypoint.sh`** :
   - vérifie les arguments (code 64 et message clair sinon) ;
   - **si le volume est vide** (pas de `PG_VERSION`) :
     - `initdb` crée le cluster : encodage UTF-8, locale `builtin` `C.UTF-8`
       (indépendante des locales du système, que musl ne fournit pas),
       connexions locales sans mot de passe (`trust`, uniquement par le socket
       du conteneur), connexions réseau avec mot de passe (`scram-sha-256`) ;
     - ajoute à `pg_hba.conf` l'autorisation réseau pour les autres conteneurs,
       toujours avec mot de passe ;
     - démarre un serveur **temporaire sans réseau**, crée le rôle et la base
       de l'API, puis l'arrête ;
   - affiche les ressources allouées (`tp-resources`) ;
   - fait `exec "$@" -c max_connections=... -c shared_buffers=...`.
3. **`exec`** remplace le shell par PostgreSQL : c'est lui qui reçoit le signal
   d'arrêt relayé par tini.

Pendant l'initialisation, le serveur temporaire n'écoute que sur son socket :
le healthcheck (en TCP) échoue, le conteneur n'est donc pas déclaré sain tant
que le vrai serveur n'a pas démarré.

## Gestion des signaux d'arrêt

PostgreSQL a trois modes d'arrêt :

| Signal | Mode | Comportement |
|---|---|---|
| `SIGTERM` | *smart* | attend que **tous les clients se déconnectent** : avec le pool de connexions de l'API, cela peut ne jamais arriver avant le `SIGKILL` |
| `SIGINT` | *fast* | annule les transactions en cours, ferme les connexions, écrit un point de reprise, s'arrête proprement |
| `SIGQUIT` | *immediate* | arrêt brutal, récupération au prochain démarrage |

L'image déclare donc `STOPSIGNAL SIGINT`. Le compose laisse 30 s
(`stop_grace_period`). Arrêt mesuré : moins d'une seconde, code de sortie 0.

```
db-1  | LOG:  received fast shutdown request
db-1  | LOG:  shutting down
db-1  | LOG:  checkpoint starting: shutdown immediate
db-1  | LOG:  database system is shut down
```

## Healthcheck

```dockerfile
HEALTHCHECK --interval=5s --timeout=3s --start-period=20s --retries=5 \
    CMD pg_isready -q -h 127.0.0.1 -p 5432 -U "$DB_USER" -d "$DB_NAME" || exit 1
```

`pg_isready` vérifie que le serveur accepte les connexions sur le réseau. Le
`start-period` de 20 s couvre l'initialisation du premier démarrage.
