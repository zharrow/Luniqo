"""Règles du pointage, sans base ni horloge : testées seules."""

from datetime import date, datetime
from zoneinfo import ZoneInfo

from app.children.models import ChildStatus

# Toutes les crèches de Luniqo sont en France métropolitaine à ce stade. Une
# crèche outre-mer demandera un fuseau par crèche (colonne sur nursery).
NURSERY_TZ = ZoneInfo("Europe/Paris")

# Un enfant suspendu ou parti ne se pointe pas.
CAN_ATTEND = frozenset({ChildStatus.ADAPTATION, ChildStatus.ACTIVE})


def local_day(moment: datetime) -> date:
    """Jour calendaire de la crèche pour un instant donné (CLAUDE.md, règle 3)."""
    if moment.tzinfo is None:
        raise ValueError("instant sans fuseau horaire")
    return moment.astimezone(NURSERY_TZ).date()


def can_attend(status: ChildStatus, enrollment_date: date, day: date) -> bool:
    return status in CAN_ATTEND and enrollment_date <= day


# --- Corrections par la direction (LUN-120) ------------------------------------

# Au-delà, la présence ne se corrige plus (décision de Florent du 2026-11-05, en
# attendant une règle liée à la clôture de la facturation).
CORRECTION_MAX_DAYS = 31

Interval = tuple[datetime, datetime | None]


def overlaps(first: Interval, second: Interval) -> bool:
    """Deux présences se chevauchent ; un départ à l'heure exacte d'un retour ne compte pas."""
    (start_a, end_a), (start_b, end_b) = first, second
    return (end_b is None or start_a < end_b) and (end_a is None or start_b < end_a)


def correction_refusal(day: date, arrived_at: datetime, departed_at: datetime | None, now: datetime,
                       others: list[Interval]) -> str | None:
    """Raison de refuser une présence corrigée, ou None. `others` : les autres présences de l'enfant ce jour-là.

    Le jour d'une présence ne change jamais : une heure corrigée reste dans ce jour, à Paris.
    """
    today = local_day(now)
    if (today - day).days > CORRECTION_MAX_DAYS:
        return "too_old"
    if local_day(arrived_at) != day:
        return "arrival_other_day"
    if departed_at is not None:
        if departed_at < arrived_at:
            return "departure_before_arrival"
        if local_day(departed_at) != day:
            return "departure_other_day"
    if max(arrived_at, departed_at or arrived_at) > now:
        return "in_future"
    if departed_at is None and day != today:
        # Une présence ouverte d'un jour passé bloquerait l'arrivée suivante sur la tablette.
        return "open_in_past"
    if any(overlaps((arrived_at, departed_at), other) for other in others):
        return "overlap"
    return None
