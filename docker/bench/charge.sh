#!/bin/sh
# Vérifie les arguments, envoie la charge avec wrk, puis affiche le CPU
# consommé par ce conteneur (lu dans son cgroup).
set -eu

. /usr/local/lib/tp/common.sh
SERVICE_NAME=charge

case "${BENCH_URL:-}" in
    http://?*) ;;
    *)
        log "erreur : BENCH_URL doit commencer par http:// (reçu : '${BENCH_URL:-}')"
        exit 64
        ;;
esac
require_int BENCH_DURATION 1 600
require_int BENCH_CONNECTIONS 1 1000
require_int BENCH_THREADS 1 16
# wrk répartit les connexions entre ses threads : il en faut au moins une par thread.
if [ "$BENCH_CONNECTIONS" -lt "$BENCH_THREADS" ]; then
    log "erreur : BENCH_CONNECTIONS ($BENCH_CONNECTIONS) doit être au moins égal à BENCH_THREADS ($BENCH_THREADS)"
    exit 64
fi

log "ressources allouées : $(tp-resources)"
log "charge : $BENCH_URL, ${BENCH_DURATION} s, $BENCH_CONNECTIONS connexions, $BENCH_THREADS threads"

# Le script ignore SIGINT pour survivre à l'arrêt et afficher le CPU consommé ;
# wrk installe son propre gestionnaire (sigaction), il reçoit donc le signal.
trap '' INT
status=0
wrk --latency -t "$BENCH_THREADS" -c "$BENCH_CONNECTIONS" -d "${BENCH_DURATION}s" "$BENCH_URL" || status=$?

log "CPU consommé par le générateur : $(awk '/^usage_usec/ { printf "%.2f", $2 / 1e6 }' /sys/fs/cgroup/cpu.stat) s"
# Pics depuis le démarrage (cgroup v2, noyau récent seulement), pour BENCH_MEMORY et BENCH_PIDS.
if [ -r /sys/fs/cgroup/memory.peak ] && [ -r /sys/fs/cgroup/pids.peak ]; then
    log "pics : mémoire $(($(cat /sys/fs/cgroup/memory.peak) / 1048576)) Mo, $(cat /sys/fs/cgroup/pids.peak) processus et threads"
fi
exit "$status"
