"""Règles communes des historiques et des exports CSV (ménage, présences)."""

from datetime import UTC, date, datetime

import pytest

from app.exports import csv_cell, csv_response, history_range, local_time

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


def test_heure_de_paris():
    assert local_time(datetime(2026, 10, 31, 23, 30, tzinfo=UTC)) == "00:30"
    assert local_time(None) == ""


def test_reponse_csv():
    response = csv_response(["Jour", "Enfant"], [["30/10/2026", "Léo Garnier"]], "presences.csv")
    assert response.body.decode() == "\ufeffJour;Enfant\r\n30/10/2026;Léo Garnier\r\n"
    assert response.headers["content-disposition"] == 'attachment; filename="presences.csv"'
    assert response.headers["cache-control"] == "no-store"
