"""Règles des corrections de présence par la direction (LUN-120), sans base."""

from datetime import UTC, date, datetime, timedelta

import pytest
from pydantic import ValidationError

from app.attendance.policy import CORRECTION_MAX_DAYS, correction_refusal, overlaps
from app.attendance.schemas import PresenceCancel, PresenceUpdate

DAY = date(2026, 7, 15)
# 18 h à Paris le 15 juillet (UTC+2).
NOW = datetime(2026, 7, 15, 16, 0, tzinfo=UTC)


def at(hour: int, minute: int = 0, day: date = DAY) -> datetime:
    """Heure de Paris en été, en UTC."""
    return datetime(day.year, day.month, day.day, hour - 2, minute, tzinfo=UTC)


def refusal(arrived, departed, *, day=DAY, now=NOW, others=()):
    return correction_refusal(day, arrived, departed, now, list(others))


def test_correction_valable():
    assert refusal(at(8, 30), at(17, 45)) is None
    assert refusal(at(8, 30), None) is None  # enfant encore là aujourd'hui


def test_arrivee_et_depart_restent_le_jour_de_la_presence_a_paris():
    # 0 h 30 le 16 à Paris, soit 22 h 30 le 15 en UTC : ce n'est plus le jour de la présence.
    assert refusal(datetime(2026, 7, 15, 22, 30, tzinfo=UTC), None, now=NOW + timedelta(days=1)) \
        == "arrival_other_day"
    assert refusal(at(7, 0, date(2026, 7, 14)), None) == "arrival_other_day"
    yesterday = date(2026, 7, 14)
    assert refusal(at(8, 0, yesterday), datetime(2026, 7, 14, 22, 30, tzinfo=UTC), day=yesterday) \
        == "departure_other_day"


def test_depart_avant_arrivee():
    assert refusal(at(9), at(8, 59)) == "departure_before_arrival"
    assert refusal(at(9), at(9)) is None


def test_aucune_heure_future():
    assert refusal(at(18, 1), None) == "in_future"
    assert refusal(at(8), at(18, 1)) == "in_future"
    assert refusal(at(8), at(18)) is None


def test_une_presence_passee_doit_avoir_un_depart():
    yesterday = date(2026, 7, 14)
    assert refusal(at(8, 0, yesterday), None, day=yesterday) == "open_in_past"
    assert refusal(at(8, 0, yesterday), at(17, 0, yesterday), day=yesterday) is None


def test_delai_de_correction():
    limit = DAY - timedelta(days=CORRECTION_MAX_DAYS)
    assert refusal(at(8, 0, limit), at(17, 0, limit), day=limit) is None
    too_old = limit - timedelta(days=1)
    assert refusal(at(8, 0, too_old), at(17, 0, too_old), day=too_old) == "too_old"


def test_chevauchement_avec_une_autre_presence_du_jour():
    morning = (at(8), at(11))
    assert refusal(at(10), at(12), others=[morning]) == "overlap"
    assert refusal(at(11), at(12), others=[morning]) is None  # retour à l'heure exacte du départ
    assert refusal(at(7), None, others=[morning]) == "overlap"  # ouverte, elle couvre la matinée
    assert refusal(at(14), at(15), others=[(at(13), None)]) == "overlap"


@pytest.mark.parametrize(("first", "second", "expected"), [
    ((1, 2), (2, 3), False),
    ((1, 3), (2, 4), True),
    ((2, 4), (1, 3), True),
    ((1, 4), (2, 3), True),
    ((1, None), (5, 6), True),
    ((5, 6), (1, None), True),
    ((3, None), (1, 2), False),
])
def test_overlaps(first, second, expected):
    def interval(pair):
        return at(8 + pair[0]), None if pair[1] is None else at(8 + pair[1])

    assert overlaps(interval(first), interval(second)) is expected


@pytest.mark.parametrize("reason", ["", "    ", "oui", "  ok  ", "x" * 501])
def test_motif_obligatoire(reason):
    with pytest.raises(ValidationError):
        PresenceCancel(reason=reason)


def test_motif_nettoye():
    assert PresenceCancel(reason="  Départ oublié  ").reason == "Départ oublié"


def test_seuls_les_champs_envoyes_changent():
    body = PresenceUpdate.model_validate({"departed_at": None, "reason": "Départ pointé par erreur"})
    assert body.changes() == {"departed_at": None}
    assert PresenceUpdate(reason="Rien à changer").changes() == {}


def test_heure_sans_fuseau_refusee():
    with pytest.raises(ValidationError):
        PresenceUpdate.model_validate({"arrived_at": "2026-07-15T08:30:00", "reason": "Heure d'arrivée"})
