"""Lance pytest et garantit un arrêt rapide sur SIGINT (signal d'arrêt de l'image).

Au premier SIGINT, pytest fait comme pour un Ctrl-C : il interrompt le test
en cours, nettoie les fixtures, écrit le rapport JUnit, puis rend la main.

Deux blocages ont été observés après l'interruption (mesuré le 2026-10-29 :
3 arrêts sur 6, tués par Docker au bout de 15 s avec le code 137). Les deux
viennent de l'API, qui hache les mots de passe dans les threads de travail
d'anyio (anyio.to_thread.run_sync). Si le signal tombe pendant du code
synchrone, la boucle asyncio meurt sans arrêter proprement ce qui dépend
d'elle :

1. la fixture asynchrone en cours de nettoyage attend une tâche morte, avant
   même que pytest.main() rende la main ;
2. à la sortie, l'interpréteur attend les threads de travail d'anyio, qui ne
   sont pas des démons et attendent un ordre d'arrêt qui ne viendra plus.

Remèdes : os._exit() une fois pytest.main() revenu (2), et un délai de grâce
après le signal (1) : passé TEST_STOP_TIMEOUT secondes, sortie forcée avec le
code d'interruption de pytest. Seuls les gestionnaires atexit sont sautés ;
aucun ne sert ici.
"""

import os
import signal
import sys
import threading

import pytest

STOP_TIMEOUT = float(os.environ.get("TEST_STOP_TIMEOUT", "5"))


def leave(code: int) -> None:
    # Temps CPU du conteneur (cgroup v2), repris par bench/bench.sh.
    with open("/sys/fs/cgroup/cpu.stat") as stat:
        usec = next(int(line.split()[1]) for line in stat if line.startswith("usage_usec "))
    print(f"[test] CPU consommé par le conteneur : {usec / 1e6:.2f} s", file=sys.stderr)
    # Pics depuis le démarrage, pour dimensionner TEST_MEMORY et TEST_PIDS (noyau récent seulement).
    try:
        with open("/sys/fs/cgroup/memory.peak") as mem, open("/sys/fs/cgroup/pids.peak") as pids:
            print(f"[test] pics : mémoire {int(mem.read()) // 1048576} Mo, {pids.read().strip()} processus et threads",
                  file=sys.stderr)
    except OSError:
        pass
    sys.stdout.flush()
    sys.stderr.flush()
    os._exit(code)


def on_sigint(signum, frame):
    timer = threading.Timer(STOP_TIMEOUT, leave, args=[pytest.ExitCode.INTERRUPTED])
    timer.daemon = True
    timer.start()
    # Comportement normal ensuite : KeyboardInterrupt, que pytest intercepte.
    signal.signal(signal.SIGINT, signal.default_int_handler)
    signal.default_int_handler(signum, frame)


signal.signal(signal.SIGINT, on_sigint)
code = pytest.main()  # arguments : sys.argv[1:], plus PYTEST_ADDOPTS
leave(int(code))
