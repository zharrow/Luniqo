from datetime import UTC, date, datetime

import pytest

from app.attendance.policy import can_attend, local_day
from app.children.models import ChildStatus


@pytest.mark.parametrize(("moment", "expected"), [
    # CLAUDE.md, règle 3 : un pointage à 0 h 30 en France ne tombe pas la veille.
    (datetime(2026, 7, 14, 22, 30, tzinfo=UTC), date(2026, 7, 15)),  # été, UTC+2 : 0 h 30 le 15
    (datetime(2026, 1, 10, 23, 30, tzinfo=UTC), date(2026, 1, 11)),  # hiver, UTC+1 : 0 h 30 le 11
    (datetime(2026, 1, 10, 22, 59, tzinfo=UTC), date(2026, 1, 10)),  # 23 h 59 le 10
    (datetime(2026, 3, 29, 0, 30, tzinfo=UTC), date(2026, 3, 29)),  # nuit du passage à l'heure d'été
    (datetime(2026, 10, 24, 22, 30, tzinfo=UTC), date(2026, 10, 25)),  # nuit du passage à l'heure d'hiver
])
def test_jour_en_heure_de_paris(moment, expected):
    assert local_day(moment) == expected


def test_instant_sans_fuseau_refuse():
    with pytest.raises(ValueError):
        local_day(datetime(2026, 7, 14, 22, 30))


@pytest.mark.parametrize(("status", "enrolled", "expected"), [
    (ChildStatus.ACTIVE, date(2025, 9, 1), True),
    (ChildStatus.ADAPTATION, date(2026, 7, 15), True),
    (ChildStatus.ACTIVE, date(2026, 7, 16), False),  # pas encore inscrit
    (ChildStatus.SUSPENDED, date(2025, 9, 1), False),
    (ChildStatus.DEPARTED, date(2025, 9, 1), False),
])
def test_enfant_attendu(status, enrolled, expected):
    assert can_attend(status, enrolled, date(2026, 7, 15)) is expected
