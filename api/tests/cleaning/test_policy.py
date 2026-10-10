from datetime import date, timedelta

import pytest
from pydantic import ValidationError

from app.cleaning.models import Frequency
from app.cleaning.policy import can_check, csv_cell, history_range, is_due, normalize_weekdays
from app.cleaning.schemas import RoomTaskIn, short_name

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


@pytest.mark.parametrize(("room", "task", "assignment", "frequency", "weekdays", "expected"), [
    (True, True, True, Frequency.DAILY, None, True),
    (False, True, True, Frequency.DAILY, None, False),  # pièce fermée
    (True, False, True, Frequency.DAILY, None, False),  # tâche retirée du catalogue
    (True, True, False, Frequency.DAILY, None, False),  # tâche retirée de la pièce
    (True, True, True, Frequency.WEEKLY, [2], True),  # mardi
    (True, True, True, Frequency.WEEKLY, [5], False),  # vendredi seulement
])
def test_tache_cochable_le_jour_meme(room, task, assignment, frequency, weekdays, expected):
    assert can_check(room_active=room, task_active=task, assignment_active=assignment, frequency=frequency,
                     weekdays=weekdays, day=date(2026, 10, 6)) is expected


@pytest.mark.parametrize(("full", "short"), [
    ("Léa Bernard", "Léa B."), ("Jean Pierre Martin", "Jean P."), ("Léa", "Léa"),
])
def test_nom_court_sur_la_tablette(full, short):
    assert short_name(full) == short


TODAY = date(2026, 10, 7)


@pytest.mark.parametrize(("start", "end", "expected"), [
    (None, None, (date(2026, 10, 1), TODAY)),  # 7 derniers jours, aujourd'hui compris
    (None, date(2026, 9, 30), (date(2026, 9, 24), date(2026, 9, 30))),
    (date(2026, 10, 7), None, (TODAY, TODAY)),
    (date(2025, 10, 7), TODAY, (date(2025, 10, 7), TODAY)),  # 366 jours : la limite
])
def test_periode_de_l_historique(start, end, expected):
    assert history_range(start, end, TODAY) == expected


@pytest.mark.parametrize(("start", "end"), [
    (date(2026, 10, 8), TODAY),  # début après la fin
    (date(2025, 10, 6), TODAY),  # 367 jours
])
def test_periode_refusee(start, end):
    with pytest.raises(ValueError):
        history_range(start, end, TODAY)


@pytest.mark.parametrize(("value", "expected"), [
    ("Laver les sols", "Laver les sols"),
    ("=HYPERLINK(\"https://exemple.test\")", "'=HYPERLINK(\"https://exemple.test\")"),
    ("+33 6", "'+33 6"), ("-1", "'-1"), ("@SUM(A1)", "'@SUM(A1)"), ("\tx", "'\tx"), ("\rx", "'\rx"),
    ("Sols = propres", "Sols = propres"),  # « = » ailleurs qu'en tête : inoffensif
    (None, ""),
])
def test_cellule_csv_neutralisee(value, expected):
    assert csv_cell(value) == expected
