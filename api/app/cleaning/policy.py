"""Fréquence des tâches de ménage, sans base ni horloge : testée seule.

| Fréquence | Jours (`weekdays`, ISO : 1 = lundi … 7 = dimanche) | Tâche prévue                      |
|-----------|-----------------------------------------------------|-----------------------------------|
| daily     | aucun                                               | chaque jour                       |
| weekly    | un ou plusieurs                                     | chacun de ces jours               |
| monthly   | exactement un                                       | le premier de ces jours du mois   |

« Chaque jour » veut dire chaque jour où la fiche est ouverte : les jours
d'ouverture de la crèche ne sont pas encore modélisés. Le mensuel se fixe
sur un jour de semaine (« le premier lundi du mois ») plutôt que sur une
date, qui tomberait parfois un week-end, crèche fermée.
"""

from collections.abc import Iterable
from datetime import date, timedelta

from app.cleaning.models import Frequency


def normalize_weekdays(frequency: Frequency, weekdays: Iterable[int] | None) -> list[int] | None:
    """Jours triés et sans doublon, ou ValueError si la combinaison n'a pas de sens."""
    days = sorted(set(weekdays)) if weekdays is not None else None
    if days is not None and not all(1 <= day <= 7 for day in days):
        raise ValueError("Un jour de la semaine va de 1 (lundi) à 7 (dimanche)")
    if frequency == Frequency.DAILY:
        if days:
            raise ValueError("Une tâche quotidienne ne précise pas de jours")
        return None
    if not days:
        raise ValueError("Préciser le ou les jours de la tâche")
    if frequency == Frequency.MONTHLY and len(days) != 1:
        raise ValueError("Une tâche mensuelle se fait un seul jour : le premier de ce jour de semaine du mois")
    return days


def is_due(frequency: Frequency, weekdays: list[int] | None, day: date) -> bool:
    """La tâche figure-t-elle sur la fiche de ce jour ?"""
    if frequency == Frequency.DAILY:
        return True
    if day.isoweekday() not in (weekdays or ()):
        return False
    # Mensuel : seule la première occurrence du jour dans le mois (du 1er au 7).
    return frequency == Frequency.WEEKLY or day.day <= 7


def can_check(*, room_active: bool, task_active: bool, assignment_active: bool, frequency: Frequency,
              weekdays: list[int] | None, day: date) -> bool:
    """Seule une tâche prévue ce jour-là, dans une pièce ouverte, se coche (LUN-77)."""
    return room_active and task_active and assignment_active and is_due(frequency, weekdays, day)


# Historique (LUN-78) : une semaine par défaut ; un an au plus par requête, pour borner la réponse.
HISTORY_DEFAULT_DAYS = 7
HISTORY_MAX_DAYS = 366


def history_range(start: date | None, end: date | None, today: date) -> tuple[date, date]:
    """Période demandée, complétée par défaut (les 7 derniers jours), ou ValueError si elle n'a pas de sens."""
    end = end or today
    start = start or end - timedelta(days=HISTORY_DEFAULT_DAYS - 1)
    if start > end:
        raise ValueError("La date de début suit la date de fin")
    if (end - start).days + 1 > HISTORY_MAX_DAYS:
        raise ValueError(f"Période limitée à {HISTORY_MAX_DAYS} jours par requête")
    return start, end


# Une cellule qui commence par l'un de ces caractères est interprétée comme une formule par les tableurs.
_FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def csv_cell(value: str | None) -> str:
    """Neutralise l'injection de formule dans un export CSV (OWASP).

    Un nom de tâche « =HYPERLINK(…) » saisi par un compte reste du texte dans le tableur de la direction.
    """
    if value is None:
        return ""
    return "'" + value if value.startswith(_FORMULA_PREFIXES) else value
