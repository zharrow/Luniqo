#!/bin/sh
# Trois contrôles, tous lancés même si l'un échoue (un rapport complet vaut
# mieux qu'un arrêt au premier problème). Code de sortie : 0 si tout est
# conforme, 1 si un contrôle échoue, 64 si un argument est invalide.
#
# Attendu : le dossier api/ du dépôt monté sur /workspace/api et le dossier
# docker/ sur /workspace/docker, en lecture seule.
set -u

. /usr/local/lib/tp/common.sh
SERVICE_NAME=lint

case "${LINT_RUFF_FORMAT:-}" in
    concise | full | github | grouped | pylint) ;;
    *)
        log "erreur : LINT_RUFF_FORMAT doit valoir concise, full, github, grouped ou pylint (reçu : '${LINT_RUFF_FORMAT:-}')"
        exit 64
        ;;
esac
for dir in /workspace/api /workspace/docker; do
    if [ ! -d "$dir" ]; then
        log "erreur : $dir absent (montage manquant ?)"
        exit 64
    fi
done

log "ressources allouées : $(tp-resources)"
cd /workspace || exit 64
status=0

# 1. Code Python de l'API, avec les règles de api/ruff.toml (sécurité comprise).
#    --no-cache : rien à écrire, le code est en lecture seule.
log "ruff $(ruff --version | cut -d' ' -f2) : api/"
if ruff check --no-cache --output-format "$LINT_RUFF_FORMAT" api > /reports/ruff.txt 2>&1; then
    log "ruff : aucun problème"
else
    cat /reports/ruff.txt
    log "ruff : ÉCHEC"
    status=1
fi

# 2. Scripts shell : entrypoints, scripts communs, scripts du dépôt.
#    -x suit les « . /usr/local/lib/tp/common.sh » : ce fichier est présent dans
#    cette image, héritée de luniqo/base, au même chemin que dans les autres.
#    docker/docs (exemples du cours, non versionnés) est exclu.
scripts=$(find docker api/scripts -path docker/docs -prune -o -type f \
    \( -name '*.sh' -o -path 'docker/base/bin/*' \) -print | sort)
log "shellcheck $(shellcheck --version | sed -n 's/^version: //p') : $(echo "$scripts" | wc -l) scripts"
# shellcheck disable=SC2086 # découpage voulu : un argument par script
if shellcheck -x -s sh -f gcc $scripts > /reports/shellcheck.txt 2>&1; then
    log "shellcheck : aucun problème"
else
    cat /reports/shellcheck.txt
    log "shellcheck : ÉCHEC"
    status=1
fi

# 3. Zéro image Docker Hub : chaque FROM doit viser scratch, une image luniqo/*
#    ou une étape déjà déclarée dans le même Dockerfile (« AS nom »). Une étape
#    au nom calculé (rootfs-${TARGETARCH}) est acceptée si son préfixe
#    correspond à une étape déclarée.
dockerfiles=$(find docker -path docker/docs -prune -o -type f -name Dockerfile -print | sort)
log "FROM autorisés : $(echo "$dockerfiles" | wc -l) Dockerfiles"
: > /reports/images.txt
for file in $dockerfiles; do
    awk -v file="$file" '
        toupper($1) == "FROM" {
            i = 2
            if ($i ~ /^--platform=/) i++
            image = $i
            ok = (image == "scratch" || image ~ /^luniqo\//)
            if (!ok) {
                prefix = image
                sub(/\$\{.*$/, "", prefix)
                for (stage in stages)
                    if (stage == image || (prefix != image && prefix != "" && index(stage, prefix) == 1)) ok = 1
            }
            if (!ok) {
                printf "%s:%d: FROM %s : image extérieure au projet (autorisé : scratch, luniqo/*, étapes du Dockerfile)\n", file, NR, image
                bad = 1
            }
            if (toupper($(i + 1)) == "AS") stages[$(i + 2)] = 1
        }
        END { exit bad }
    ' "$file" >> /reports/images.txt || status=1
done
if [ -s /reports/images.txt ]; then
    cat /reports/images.txt
    log "FROM autorisés : ÉCHEC"
else
    log "FROM autorisés : aucune image extérieure"
fi

log "CPU consommé par le conteneur : $(awk '/^usage_usec/ { printf "%.2f", $2 / 1e6 }' /sys/fs/cgroup/cpu.stat) s"
# Pics depuis le démarrage (cgroup v2), pour dimensionner LINT_MEMORY et LINT_PIDS.
# Les fichiers *.peak n'existent qu'avec un noyau récent.
if [ -r /sys/fs/cgroup/memory.peak ] && [ -r /sys/fs/cgroup/pids.peak ]; then
    log "pics : mémoire $(($(cat /sys/fs/cgroup/memory.peak) / 1048576)) Mo, $(cat /sys/fs/cgroup/pids.peak) processus et threads"
fi
if [ "$status" -eq 0 ]; then
    log "lint réussi"
else
    log "lint en échec : rapports dans le volume reports"
fi
exit "$status"
