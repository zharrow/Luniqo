#!/bin/sh
# Vérifie les arguments, initialise le cluster au premier démarrage (volume
# vide), affiche les ressources allouées, puis remplace ce script par
# PostgreSQL en lui passant les réglages de ressources.
set -eu

. /usr/local/lib/tp/common.sh
SERVICE_NAME=db

require_ident DB_NAME
require_ident DB_USER
require_secret DB_PASSWORD_FILE
require_int DB_MAX_CONNECTIONS 5 1000
require_size DB_SHARED_BUFFERS

if [ ! -s "$PGDATA/PG_VERSION" ]; then
    log "volume vide : initialisation du cluster dans $PGDATA"

    # Superutilisateur « postgres » sans mot de passe, accessible seulement
    # par le socket local (trust), donc depuis l'intérieur du conteneur.
    # Connexions réseau : mot de passe obligatoire (scram-sha-256).
    # Locale « builtin » C.UTF-8 : tri et casse en UTF-8 sans dépendre des
    # locales du système (musl n'en fournit pas).
    initdb --username=postgres --encoding=UTF8 \
        --locale-provider=builtin --builtin-locale=C.UTF-8 \
        --auth-local=trust --auth-host=scram-sha-256 >/dev/null
    # initdb n'autorise le réseau que depuis 127.0.0.1 : on ouvre aux autres
    # conteneurs, toujours avec mot de passe.
    echo "host all all all scram-sha-256" >> "$PGDATA/pg_hba.conf"

    # Serveur temporaire sans réseau pour créer le rôle et la base de l'API.
    pg_ctl --wait --silent -o "-c listen_addresses='' -c unix_socket_directories=/tmp" start
    # Le mot de passe est lu par psql dans le fichier secret (\set avec
    # backquotes) : il n'apparaît pas dans les arguments d'un processus.
    psql -h /tmp -U postgres -d postgres -v ON_ERROR_STOP=1 -q \
        -v user="$DB_USER" -v db="$DB_NAME" <<'SQL'
\set password `cat "$DB_PASSWORD_FILE"`
CREATE ROLE :"user" LOGIN PASSWORD :'password';
CREATE DATABASE :"db" OWNER :"user";
SQL
    pg_ctl --wait --silent --mode=fast stop
    log "cluster initialisé : base $DB_NAME, rôle $DB_USER"
fi

log "ressources allouées : $(tp-resources)"
log "configuration : DB_MAX_CONNECTIONS=$DB_MAX_CONNECTIONS DB_SHARED_BUFFERS=$DB_SHARED_BUFFERS"

# exec : PostgreSQL prend la place du shell et reçoit directement le signal
# d'arrêt relayé par tini.
exec "$@" -c "max_connections=$DB_MAX_CONNECTIONS" -c "shared_buffers=$DB_SHARED_BUFFERS"
