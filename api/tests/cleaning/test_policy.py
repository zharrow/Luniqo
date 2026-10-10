from datetime import date, timedelta

import pytest
from pydantic import ValidationError

from app.cleaning.models import Frequency
from app.cleaning.policy import is_due, normalize_weekdays
from app.cleaning.schemas import RoomTaskIn

# Octobre 2026 : le 1er est un jeudi, le 5 le premier lundi, le 12 le deuxième.
OCTOBER = [date(2026, 10, 1) + timedelta(days=n) for n in range(31)]


@pytest.mark.parametrize(("frequency", "weekdays", "expected"), [
    (Frequency.DAILY, None, None),
    (Frequency.DAILY, [], None),
    (Frequency.WEEKLY, [5, 1, 3, 1], [1, 3, 5]),  # trié, sans doublon
    (Frequency.MONTHLY, [1], [1]),
    (Frequency.WEEKLY, [7], [7]),
])
def test_jours_normalises(frequency, weekdays, expected):
    assert normalize_weekdays(frequency, weekdays) == expected


@pytest.mark.parametrize(("frequency", "weekdays"), [
    (Frequency.DAILY, [1]),  # quotidien : pas de jours
    (Frequency.WEEKLY, None),  # hebdomadaire sans jour
    (Frequency.WEEKLY, []),
    (Frequency.WEEKLY, [0]),  # hors de 1..7
    (Frequency.WEEKLY, [8]),
    (Frequency.MONTHLY, None),
    (Frequency.MONTHLY, [1, 3]),  # mensuel : un seul jour
])
def test_jours_incoherents_refuses(frequency, weekdays):
    with pytest.raises(ValueError):
        normalize_weekdays(frequency, weekdays)


def test_quotidien_tous_les_jours():
    assert all(is_due(Frequency.DAILY, None, day) for day in OCTOBER)


def test_hebdomadaire_les_jours_choisis():
    due = [day.day for day in OCTOBER if is_due(Frequency.WEEKLY, [1, 5], day)]
    assert due == [2, 5, 9, 12, 16, 19, 23, 26, 30]  # vendredis et lundis


@pytest.mark.parametrize(("weekday", "expected"), [
    (1, date(2026, 10, 5)),  # premier lundi
    (4, date(2026, 10, 1)),  # premier jeudi : le 1er lui-même
    (3, date(2026, 10, 7)),  # premier mercredi : le 7, dernier jour possible
])
def test_mensuel_une_seule_fois_le_premier_jour_choisi(weekday, expected):
    assert [day for day in OCTOBER if is_due(Frequency.MONTHLY, [weekday], day)] == [expected]


def test_schema_d_affectation_normalise_et_refuse():
    assert RoomTaskIn(frequency="weekly", weekdays=[3, 1]).weekdays == [1, 3]
    with pytest.raises(ValidationError):
        RoomTaskIn(frequency="monthly", weekdays=[1, 2])
