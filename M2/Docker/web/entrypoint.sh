#!/bin/sh
# Vérifie les arguments, génère la configuration nginx à partir du modèle,
# affiche les ressources allouées au conteneur, puis remplace ce script par
# la commande principale (CMD).
set -eu

. /usr/local/lib/tp/common.sh
SERVICE_NAME=web

require_int NGINX_WORKER_PROCESSES 1 64
require_int NGINX_WORKER_CONNECTIONS 16 65535
require_addr FRONT_ADDR
require_addr API_ADDR

# Tout ce que nginx écrit va dans /tmp : l'image peut être en lecture seule.
mkdir -p /tmp/nginx

sed -e "s|__WORKER_PROCESSES__|$NGINX_WORKER_PROCESSES|" \
    -e "s|__WORKER_CONNECTIONS__|$NGINX_WORKER_CONNECTIONS|" \
    -e "s|__FRONT_ADDR__|$FRONT_ADDR|" \
    -e "s|__API_ADDR__|$API_ADDR|" \
    /etc/nginx/nginx.conf.template > /tmp/nginx/nginx.conf

log "ressources allouées : $(tp-resources)"
log "configuration : NGINX_WORKER_PROCESSES=$NGINX_WORKER_PROCESSES NGINX_WORKER_CONNECTIONS=$NGINX_WORKER_CONNECTIONS FRONT_ADDR=$FRONT_ADDR API_ADDR=$API_ADDR"

# Vérifie la configuration générée avant de démarrer : une erreur arrête le
# conteneur avec un message clair.
nginx -t -q -c /tmp/nginx/nginx.conf -e stderr

# exec : nginx prend la place du shell (même PID). C'est donc lui, et non le
# shell, qui reçoit le signal d'arrêt relayé par tini.
exec "$@"
