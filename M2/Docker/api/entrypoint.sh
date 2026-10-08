#!/bin/sh
# Vérifie les arguments, applique les migrations de la base, insère les
# données de démonstration si demandé, puis remplace ce script par uvicorn.
set -eu

. /usr/local/lib/tp/common.sh
SERVICE_NAME=api

require_int API_WORKERS 1 16
require_int DB_POOL_SIZE 1 100
require_addr DB_ADDR
require_ident DB_NAME
require_ident DB_USER
require_secret DB_PASSWORD_FILE
require_bool SEED_DEMO

log "ressources allouées : $(tp-resources)"
log "configuration : API_WORKERS=$API_WORKERS DB_POOL_SIZE=$DB_POOL_SIZE DB_ADDR=$DB_ADDR SEED_DEMO=$SEED_DEMO"
# Chaque worker a son propre pool de DB_POOL_SIZE connexions.
log "connexions à la base au maximum : $((API_WORKERS * DB_POOL_SIZE))"

# Migrations au démarrage : le schéma suit toujours la version du code.
# Une seule réplique de l'API : pas de risque de migrations concurrentes.
alembic -c /app/alembic.ini upgrade head

if [ "$SEED_DEMO" = true ]; then
    python -m app.seed
fi

# uvicorn lit le nombre de workers dans WEB_CONCURRENCY.
# FORWARDED_ALLOW_IPS=* : l'API n'est joignable que depuis le réseau interne,
# où seule la passerelle lui parle ; on fait donc confiance à ses en-têtes.
export WEB_CONCURRENCY="$API_WORKERS" FORWARDED_ALLOW_IPS='*'

# exec : uvicorn prend la place du shell et reçoit directement SIGTERM.
exec "$@"
