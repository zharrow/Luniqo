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
