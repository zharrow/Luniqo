#!/bin/sh
# Vérifie les arguments, prépare le cache de Next.js, règle la mémoire de
# Node.js, puis remplace ce script par le serveur.
set -eu

. /usr/local/lib/tp/common.sh
SERVICE_NAME=front

require_int NODE_HEAP_MB 64 4096
require_int PORT 1024 65535

# Cache de Next.js (lien .next/cache → /tmp/next-cache, en mémoire).
mkdir -p /tmp/next-cache

# Tas JavaScript borné explicitement, sous la limite mémoire du conteneur :
# le reste sert au code natif de Node.js et aux tampons.
export NODE_OPTIONS="--max-old-space-size=$NODE_HEAP_MB"
# Docker fixe HOSTNAME au nom du conteneur, et Next.js écouterait alors sur
# cette seule adresse : on écoute sur toutes les interfaces.
export HOSTNAME=0.0.0.0

log "ressources allouées : $(tp-resources)"
log "configuration : NODE_HEAP_MB=$NODE_HEAP_MB PORT=$PORT"

# exec : Node.js prend la place du shell et reçoit directement SIGTERM.
exec "$@"
