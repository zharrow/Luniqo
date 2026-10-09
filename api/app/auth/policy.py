"""Règles de durée des sessions et de limitation des tentatives (ADR-003).

Fonctions pures, sans base ni horloge : l'heure courante est passée en
paramètre, ce qui rend chaque règle testable directement.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta

IDLE_TIMEOUT = timedelta(minutes=30)
ABSOLUTE_TIMEOUT = timedelta(hours=12)
# La dernière activité n'est réécrite qu'au plus une fois par minute : sinon
# chaque requête authentifiée coûterait une écriture en base.
TOUCH_INTERVAL = timedelta(minutes=1)

# Les échecs de connexion sont comptés sur une fenêtre glissante.
FAILURE_WINDOW = timedelta(minutes=15)


@dataclass(frozen=True)
class Throttle:
    """Seuils d'une limitation : délai croissant à partir de `delay_from` échecs, blocage à `block_from`."""

    delay_from: int
    block_from: int
    max_delay: timedelta = timedelta(minutes=1)
    block: timedelta = FAILURE_WINDOW


# Par compte : 5 échecs puis délai, 10 échecs puis blocage de 15 minutes.
ACCOUNT_THROTTLE = Throttle(delay_from=5, block_from=10)
# Par adresse IP, seuils plus hauts : tout le personnel d'une crèche sort
# souvent sur internet par la même adresse publique (box, NAT). Le blocage
# doit rester atteignable : les délais imposés entre `delay_from` et
# `block_from` doivent tenir dans la fenêtre de 15 minutes (5 min ici).
IP_THROTTLE = Throttle(delay_from=20, block_from=30)


@dataclass(frozen=True)
class FailureStats:
    count: int
    last: datetime | None


def session_expired(created_at: datetime, last_seen_at: datetime, now: datetime) -> bool:
    return now - last_seen_at >= IDLE_TIMEOUT or now - created_at >= ABSOLUTE_TIMEOUT


def needs_touch(last_seen_at: datetime, now: datetime) -> bool:
    return now - last_seen_at >= TOUCH_INTERVAL


def retry_after(stats: FailureStats, throttle: Throttle, now: datetime) -> int:
    """Secondes à attendre avant une nouvelle tentative ; 0 si elle est permise."""
    if stats.last is None or stats.count < throttle.delay_from:
        return 0
    if stats.count >= throttle.block_from:
        wait = throttle.block
    else:
        # 1 s au 5e échec, puis 2, 4, 8… plafonné.
        wait = min(timedelta(seconds=2 ** (stats.count - throttle.delay_from)), throttle.max_delay)
    remaining = stats.last + wait - now
    return max(0, int(remaining.total_seconds() + 0.999))
