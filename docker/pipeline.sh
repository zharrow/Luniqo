#!/bin/sh
# Chaîne d'intégration et de déploiement en conteneurs, comme le ferait un
# serveur de CI : construction des images, lint, tests, puis déploiement de la
# pile si (et seulement si) tout est vert.
#
#   ./pipeline.sh               lint → test → déploiement de la pile
#   ./pipeline.sh --no-deploy   lint → test seulement (utilisé par la CI GitHub)
#
# Rapports (ruff, ShellCheck, FROM, JUnit) : docker/reports/, non versionné.
# Variables lues : celles de .env (ressources), STACK_PROJECT (nom du projet
# compose de la pile, luniqo par défaut).
set -u

cd "$(dirname "$0")" || exit 1

deploy=true
case "${1:-}" in
    '') ;;
    --no-deploy) deploy=false ;;
    *)
        echo "Usage : $0 [--no-deploy]" >&2
        exit 64
        ;;
esac

# Projet fixe pour la chaîne : un COMPOSE_PROJECT_NAME exporté ne doit pas la
# mélanger avec la pile.
ci() {
    docker compose -p luniqo-ci -f docker-compose.ci.yml "$@"
}

# Code de sortie d'une étape terminée, « absent » si elle n'a pas tourné
# (barrière non franchie). On ne se fie pas au code de « compose up » :
# avec Compose 5.5.0, il vaut 0 même quand --abort-on-container-failure
# interrompt la chaîne après un échec (mesuré le 2026-10-29).
exit_code() {
    state=$(ci ps -a --format '{{.State}} {{.ExitCode}}' "$1" 2>/dev/null)
    case "$state" in
        exited\ *) echo "${state#exited }" ;;
        *) echo absent ;;
    esac
}

start=$(date +%s)
echo "▶ Construction des images de la chaîne"
ci build --quiet || {
    echo "✗ Construction en échec"
    exit 1
}

# Nettoyage d'un passage précédent interrompu (base de test, rapports).
ci down --volumes --remove-orphans >/dev/null 2>&1

echo "▶ lint → test"
ci up --abort-on-container-failure lint test
lint_rc=$(exit_code lint)
test_rc=$(exit_code test)

# Artefacts : copiés depuis le volume avant sa suppression.
rm -rf reports
mkdir -p reports
ci cp lint:/reports/. reports/ >/dev/null 2>&1
[ "$test_rc" != absent ] && ci cp test:/reports/. reports/ >/dev/null 2>&1
ci down --volumes --remove-orphans >/dev/null 2>&1

echo "Résultat : lint=$lint_rc test=$test_rc ($(($(date +%s) - start)) s) ; rapports dans docker/reports/"
if [ "$lint_rc" != 0 ] || [ "$test_rc" != 0 ]; then
    echo "✗ Chaîne en échec : rien n'est déployé, la version en place continue de tourner."
    exit 1
fi
echo "✓ lint et tests réussis"

[ "$deploy" = true ] || exit 0

# Déploiement : mêmes fichiers d'environnement que le démarrage manuel (README).
echo "▶ Déploiement de la pile (projet ${STACK_PROJECT:-luniqo})"
set -- --env-file .env
[ -f ../.env ] && set -- "$@" --env-file ../.env
docker compose -p "${STACK_PROJECT:-luniqo}" "$@" up -d --build --wait --wait-timeout 180 || {
    echo "✗ La pile ne devient pas saine (docker compose ps, docker compose logs)"
    exit 1
}
echo "✓ Pile déployée : http://localhost:${WEB_PUBLISHED_PORT:-8080}"
