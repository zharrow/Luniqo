#!/bin/sh
# Vérifie les arguments, lit le mot de passe de la base de test, puis remplace
# ce script par pytest.
set -eu

. /usr/local/lib/tp/common.sh
# Guillemets : sans eux, ShellCheck prend « test » pour la commande du même nom (SC2209).
SERVICE_NAME='test'

require_addr TEST_DB_ADDR
require_ident TEST_DB_NAME
require_ident TEST_DB_USER
require_secret TEST_DB_PASSWORD_FILE
# Délai laissé à pytest après le signal d'arrêt (voir run_pytest.py), sous le
# stop_grace_period du compose (15 s).
require_int TEST_STOP_TIMEOUT 1 60
# Garde-fou repris des tests : la base est vidée, jamais une autre que celle de test.
case "$TEST_DB_NAME" in
    *_test) ;;
    *)
        log "erreur : TEST_DB_NAME doit finir par _test (reçu : '$TEST_DB_NAME')"
        exit 64
        ;;
esac
if [ ! -f pytest.ini ]; then
    log "erreur : code de l'API absent de /workspace/api (montage manquant ?)"
    exit 64
fi

log "ressources allouées : $(tp-resources)"
log "base de test : $TEST_DB_USER@$TEST_DB_ADDR/$TEST_DB_NAME"

# Les tests lisent le mot de passe dans TEST_DB_PASSWORD : il passe du secret
# monté à l'environnement du seul processus pytest (pas dans docker inspect).
TEST_DB_PASSWORD=$(cat "$TEST_DB_PASSWORD_FILE")
export TEST_DB_PASSWORD

# exec : pytest prend la place du shell et reçoit directement le signal d'arrêt.
exec "$@"
