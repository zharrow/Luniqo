#!/bin/sh
# Base PostgreSQL jetable pour les tests d'intégration (LUN-007).
#
#   scripts/test-db.sh up     démarre la base sur 127.0.0.1:55432 et affiche les variables à exporter
#   scripts/test-db.sh down   l'arrête ; ses données (en mémoire, tmpfs) disparaissent
#
# Construite avec l'image luniqo/db du TP Docker (aucune image Docker Hub) :
# même PostgreSQL que la pile, rien de persistant, joignable seulement depuis
# la machine. Le mot de passe est fixe et public : cette base ne contient que
# des données de test et n'existe que le temps des tests.
set -eu

NAME=luniqo-test-db
PORT="${TEST_DB_PORT:-55432}"
IMAGE="${TEST_DB_IMAGE:-luniqo/db:1.0}"
PASSWORD=luniqo-test
# Le nom finit par _test : les tests refusent toute autre base (ils la vident).
DB=luniqo_test

case "${1:-}" in
up)
    if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
        echo "Image $IMAGE absente : la construire d'abord (cd docker && docker compose build db)." >&2
        exit 1
    fi
    docker rm -f "$NAME" >/dev/null 2>&1 || true
    secret_dir=$(mktemp -d)
    printf '%s' "$PASSWORD" > "$secret_dir/db_password"
    chmod 644 "$secret_dir/db_password"
    docker run -d --name "$NAME" \
        --read-only --tmpfs /tmp:size=16m \
        --tmpfs /var/lib/postgresql/data:rw,uid=10001,gid=10001,mode=0700,size=256m \
        -v "$secret_dir/db_password:/run/secrets/db_password:ro" \
        -e DB_NAME="$DB" -e DB_USER=luniqo -e DB_MAX_CONNECTIONS=30 -e DB_SHARED_BUFFERS=32MB \
        -p "127.0.0.1:$PORT:5432" \
        "$IMAGE" >/dev/null
    printf 'Attente de la base'
    for _ in $(seq 1 60); do
        status=$(docker inspect -f '{{.State.Health.Status}}' "$NAME" 2>/dev/null || echo absent)
        if [ "$status" = healthy ]; then
            rm -rf "$secret_dir"
            echo " : prête."
            echo "export TEST_DB_ADDR=127.0.0.1:$PORT TEST_DB_NAME=$DB TEST_DB_PASSWORD=$PASSWORD"
            exit 0
        fi
        printf '.'
        sleep 1
    done
    echo " : échec." >&2
    docker logs "$NAME" >&2
    exit 1
    ;;
down)
    docker rm -f "$NAME" >/dev/null 2>&1 && echo "Base de test supprimée." || echo "Aucune base de test."
    ;;
*)
    echo "Usage : $0 up|down" >&2
    exit 2
    ;;
esac
