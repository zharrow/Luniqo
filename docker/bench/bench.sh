#!/bin/sh
# Banc de mesure : consommation CPU des conteneurs de Luniqo.
#
#   bench/bench.sh                              pile du projet compose « luniqo »
#   STACK_PROJECT=luniqo-essai bench/bench.sh   autre pile (démarrée avec -p)
#
# La pile doit être démarrée. Quatre phases : repos, charge sur l'API, charge
# sur une page du front, chaîne de CI (lint puis tests). Pour chaque phase et
# chaque conteneur : temps CPU exact consommé (compteur usage_usec du cgroup,
# lu avant et après), rapporté à la durée (cœurs utilisés en moyenne) et à la
# limite du conteneur, plus la mémoire en fin de phase.
#
# Sur macOS, Docker tourne dans une VM Linux : son temps CPU, lu depuis l'hôte,
# couvre les conteneurs ET le moteur Docker, le noyau de la VM, le réseau
# virtuel. La différence entre les deux est ce que coûte Docker lui-même.
#
# Résultat : bench/resultats/AAAA-MM-JJ-HHMM.md (à versionner : c'est une preuve).
# Dépendances sur l'hôte : docker, awk, python3 (horloge à la milliseconde).
set -eu

cd "$(dirname "$0")/.."

PROJECT=${STACK_PROJECT:-luniqo}
DURATION=${BENCH_DURATION:-30}
PAGE_PATH=${BENCH_PAGE_PATH:-/connexion}
CONNECTIONS=${BENCH_CONNECTIONS:-32}
THREADS=${BENCH_THREADS:-2}
export STACK_PROJECT="$PROJECT" BENCH_DURATION="$DURATION" BENCH_CONNECTIONS="$CONNECTIONS" BENCH_THREADS="$THREADS"

containers=$(docker ps --filter "label=com.docker.compose.project=$PROJECT" --format '{{.Names}}' | sort)
if [ -z "$containers" ]; then
    echo "Aucun conteneur du projet $PROJECT : démarrer la pile d'abord (./pipeline.sh ou docker compose up -d)." >&2
    exit 1
fi

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
mkdir -p bench/resultats
out=bench/resultats/$(date +%Y-%m-%d-%H%M).md

now() { python3 -c 'import time; print(f"{time.time():.3f}")'; }

# Temps CPU cumulé de chaque conteneur de la pile, en microsecondes.
snapshot() {
    for c in $containers; do
        printf '%s %s\n' "$c" "$(docker exec "$c" cat /sys/fs/cgroup/cpu.stat | awk '/^usage_usec/ { print $2 }')"
    done
}

# Processus de la VM qui fait tourner Docker sur macOS (OrbStack ou Docker
# Desktop). Vide sous Linux, où Docker tourne directement sur l'hôte.
vm_pid=$(pgrep -f 'OrbStack Helper' 2>/dev/null | head -1 || true)
[ -n "$vm_pid" ] || vm_pid=$(pgrep -f 'com.apple.Virtualization.VirtualMachine' 2>/dev/null | head -1 || true)

# Temps CPU cumulé de la VM en secondes (ps l'affiche en [H:]M:SS.ss).
vm_cpu() {
    if [ -n "$vm_pid" ]; then
        ps -o time= -p "$vm_pid" | awk -F: '{ s = 0; for (i = 1; i <= NF; i++) s = s * 60 + $i; printf "%.2f", s }'
    else
        echo ""
    fi
}

# CPU affiché par un conteneur éphémère à la fin de son travail.
cpu_line() {
    sed -n "s/.*\[$1\] CPU consommé par [^:]*: \([0-9.]*\) s.*/\1/p" "$2" | tail -1
}

ncpu=$(docker info --format '{{.NCPU}}')
{
    echo "# Banc de mesure CPU du $(date '+%Y-%m-%d à %H:%M')"
    echo
    echo "\`[RÉEL]\` Mesures produites par \`docker/bench/bench.sh\` (commit \`$(git rev-parse --short HEAD)\`$(git diff --quiet HEAD -- . 2>/dev/null || echo ', avec des modifications non commitées'))."
    echo
    echo "| | |"
    echo "|---|---|"
    echo "| Hôte | $(uname -s) $(uname -m)$( [ "$(uname -s)" = Darwin ] && echo ", $(sysctl -n machdep.cpu.brand_string)") |"
    echo "| Docker | $(docker info --format '{{.ServerVersion}} ({{.OperatingSystem}}, noyau {{.KernelVersion}})'), $ncpu cœurs et $(docker info --format '{{.MemTotal}}' | awk '{ printf "%.1f", $1 / 1073741824 }') Gio visibles par les conteneurs |"
    echo "| VM mesurée depuis l'hôte | $( [ -n "$vm_pid" ] && ps -o comm= -p "$vm_pid" | sed 's|.*/||' || echo 'aucune (Docker natif) : non mesurée') |"
    echo "| Pile | projet \`$PROJECT\` : $(echo "$containers" | tr '\n' ' ') |"
    echo "| Charge | wrk, $CONNECTIONS connexions, $THREADS threads, $DURATION s par phase |"
    echo
    echo "Lecture : *cœurs* = temps CPU consommé ÷ durée de la phase (1,00 = un cœur occupé en permanence) ;"
    echo "*% limite* = part de la limite \`cpus\` du conteneur ; *% hôte* = part des $ncpu cœurs."
} > "$out"

# phase TITRE COMMANDE... : mesure la pile pendant que COMMANDE s'exécute.
phase() {
    title=$1
    shift
    echo "▶ $title" >&2
    snapshot > "$tmp/avant"
    vm0=$(vm_cpu)
    t0=$(now)
    "$@" > "$tmp/sortie" 2>&1 || echo "  (la commande a échoué, voir sa sortie dans le rapport)" >&2
    t1=$(now)
    vm1=$(vm_cpu)
    snapshot > "$tmp/apres"
    # shellcheck disable=SC2086 # découpage voulu : un argument par conteneur
    docker stats --no-stream --format '{{.Name}} {{.MemUsage}}' $containers > "$tmp/mem"

    {
        echo
        echo "## $title"
        echo
        echo "| Conteneur | Limite CPU | CPU consommé | Cœurs | % limite | % hôte | Mémoire en fin de phase |"
        echo "|---|---|---|---|---|---|---|"
    } >> "$out"
    total=0
    for c in $containers; do
        limit=$(docker inspect -f '{{.HostConfig.NanoCpus}}' "$c")
        mem=$(awk -v c="$c" '$1 == c { $1 = ""; sub(/^ /, ""); print }' "$tmp/mem")
        line=$(awk -v c="$c" -v t0="$t0" -v t1="$t1" -v lim="$limit" -v n="$ncpu" -v mem="$mem" '
            FNR == NR { if ($1 == c) a = $2; next }
            $1 == c {
                s = ($2 - a) / 1e6; d = t1 - t0; cores = s / d
                l = (lim > 0) ? sprintf("%.2f", lim / 1e9) : "aucune"
                pl = (lim > 0) ? sprintf("%.1f %%", 100 * cores / (lim / 1e9)) : "–"
                printf "%.2f|| %s | %.2f s | %.3f | %s | %.1f %% | %s |\n", s, l, s, cores, pl, 100 * cores / n, mem
            }' "$tmp/avant" "$tmp/apres")
        total=$(awk -v t="$total" -v s="${line%%||*}" 'BEGIN { printf "%.2f", t + s }')
        echo "| $c |${line#*||}" >> "$out"
    done
    d=$(awk -v a="$t0" -v b="$t1" 'BEGIN { printf "%.2f", b - a }')
    awk -v s="$total" -v d="$d" -v n="$ncpu" 'BEGIN {
        printf "| **Pile (total)** | | **%.2f s** | **%.3f** | | **%.1f %%** | |\n", s, s / d, 100 * s / d / n }' >> "$out"

    # Conteneurs éphémères de la phase (générateur de charge, conteneurs de CI).
    extra=0
    for job in charge lint test; do
        cpu=$(cpu_line "$job" "$tmp/sortie")
        [ -n "$cpu" ] || continue
        extra=$(awk -v a="$extra" -v b="$cpu" 'BEGIN { printf "%.2f", a + b }')
        awk -v j="$job" -v s="$cpu" -v d="$d" -v n="$ncpu" 'BEGIN {
            printf "| %s (éphémère) | | %.2f s | %.3f | | %.1f %% | |\n", j, s, s / d, 100 * s / d / n }' >> "$out"
    done
    if [ -s "$tmp/ci-db" ]; then
        cpu=$(cat "$tmp/ci-db")
        extra=$(awk -v a="$extra" -v b="$cpu" 'BEGIN { printf "%.2f", a + b }')
        awk -v s="$cpu" -v d="$d" -v n="$ncpu" 'BEGIN {
            printf "| test-db (éphémère) | | %.2f s | %.3f | | %.1f %% | |\n", s, s / d, 100 * s / d / n }' >> "$out"
        : > "$tmp/ci-db"
    fi
    if [ -n "$vm0" ]; then
        awk -v v0="$vm0" -v v1="$vm1" -v c="$total" -v e="$extra" -v d="$d" -v n="$ncpu" 'BEGIN {
            v = v1 - v0; o = v - c - e
            printf "| **VM Docker, vue de l'\''hôte** | | **%.2f s** | **%.3f** | | **%.1f %%** | |\n", v, v / d, 100 * v / d / n
            printf "| Coût de Docker (VM − conteneurs) | | %.2f s | %.3f | | %.1f %% | |\n", o, o / d, 100 * o / d / n }' >> "$out"
    fi
    {
        echo
        echo "Durée mesurée : $d s."
        if grep -q 'Requests/sec' "$tmp/sortie"; then
            echo
            echo '```'
            sed -n '/Running/,/Transfer\/sec/p' "$tmp/sortie" | sed 's/^charge-[^|]*| //'
            echo '```'
        fi
    } >> "$out"
}

run_charge() {
    BENCH_URL=$1 docker compose -f docker-compose.bench.yml run --rm charge
}

run_ci() {
    docker compose -p luniqo-ci -f docker-compose.ci.yml down --volumes >/dev/null 2>&1
    docker compose -p luniqo-ci -f docker-compose.ci.yml up lint test
    # La base de test tourne encore : son CPU depuis son démarrage = toute la phase.
    docker exec luniqo-ci-test-db-1 cat /sys/fs/cgroup/cpu.stat | awk '/^usage_usec/ { printf "%.2f", $2 / 1e6 }' > "$tmp/ci-db"
}

echo "Construction des images du banc et de la CI" >&2
docker compose -f docker-compose.bench.yml build --quiet
docker compose -p luniqo-ci -f docker-compose.ci.yml build --quiet

phase "Repos ($DURATION s, aucune requête)" sleep "$DURATION"
phase "Charge sur l'API (GET /api/health : passerelle → API → base)" run_charge http://web:8080/api/health
phase "Charge sur le front v2 (GET $PAGE_PATH : nginx sert les fichiers du front)" run_charge "http://web:8080$PAGE_PATH"
phase "Chaîne de CI (lint puis tests de l'API, pendant que la pile tourne)" run_ci
docker compose -p luniqo-ci -f docker-compose.ci.yml down --volumes >/dev/null 2>&1

echo "Résultat : docker/$out" >&2
