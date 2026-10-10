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
from datetime import date

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
