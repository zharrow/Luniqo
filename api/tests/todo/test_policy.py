"""Règles de la liste « À traiter » (LUN-153) : seuils à leurs bornes, ordre, jour de Paris."""

import uuid
from datetime import UTC, date, datetime, timedelta

import pytest

from app.nurseries.policy import OnboardingFacts, StaffAccess, Tablet
from app.todo import policy
from app.todo.policy import (
    LockedPin,
    NurseryOnboardingFacts,
    NurseryRef,
    OpenPresence,
    TabletFact,
    ToDoKind,
    departure_window,
    tablet_kind,
    to_do,
)

NOW = datetime(2026, 11, 20, 10, 0, tzinfo=UTC)  # 11 h à Paris, vendredi 20 novembre
NORD = NurseryRef(uuid.uuid4(), "Crèche nord")
SUD = NurseryRef(uuid.uuid4(), "Crèche sud")


def _pin(at=NOW - timedelta(hours=1), *, active=True, nursery=NORD, name="Camille Exemple") -> LockedPin:
    return LockedPin(nursery, uuid.uuid4(), name, active, at)


def _tablet(expires_at, revoked_at=None, nursery=NORD) -> TabletFact:
    return TabletFact(nursery, uuid.uuid4(), "Tablette de l'entrée", expires_at, revoked_at)


def _presence(day, arrived_at=None, nursery=NORD) -> OpenPresence:
    arrived = arrived_at or datetime(day.year, day.month, day.day, 7, 30, tzinfo=UTC)
    return OpenPresence(nursery, uuid.uuid4(), "Léo Fictif", day, arrived)


def _onboarding(facts, nursery=NORD, created_at=datetime(2026, 9, 1, tzinfo=UTC)) -> NurseryOnboardingFacts:
    return NurseryOnboardingFacts(nursery, created_at, facts)


def _kinds(now=NOW, **facts) -> list[ToDoKind]:
    lists = {"pins": [], "tablets": [], "presences": [], "onboarding": []} | facts
    return [item.kind for item in to_do(**lists, now=now)]


def test_ordre_des_genres():
    assert list(ToDoKind) == [ToDoKind.PIN_LOCKED, ToDoKind.TABLET_EXPIRED, ToDoKind.DEPARTURE_MISSING,
                              ToDoKind.TABLET_EXPIRING, ToDoKind.ONBOARDING_INCOMPLETE]


def test_seuils():
    assert (policy.TABLET_EXPIRING_DAYS, policy.TABLET_EXPIRED_DAYS, policy.DEPARTURE_MISSING_DAYS) == (7, 30, 31)


# --- PIN bloqué ------------------------------------------------------------------

def test_pin_bloque_d_un_employe_actif():
    locked_at = NOW - timedelta(days=2)
    [item] = to_do(pins=[_pin(locked_at)], tablets=[], presences=[], onboarding=[], now=NOW)
    assert (item.kind, item.subject_name, item.since, item.day) == (
        ToDoKind.PIN_LOCKED, "Camille Exemple", locked_at, None)


def test_employe_parti_ou_pin_non_bloque_ignores():
    assert _kinds(pins=[_pin(active=False), _pin(None)]) == []


# --- Tablettes -------------------------------------------------------------------

@pytest.mark.parametrize(("expires_at", "expected"), [
    (NOW + timedelta(days=7, seconds=1), None),
    (NOW + timedelta(days=7), ToDoKind.TABLET_EXPIRING),
    (NOW + timedelta(seconds=1), ToDoKind.TABLET_EXPIRING),
    (NOW, ToDoKind.TABLET_EXPIRED),  # expirée à l'instant même, comme tablet_active
    (NOW - timedelta(days=30), ToDoKind.TABLET_EXPIRED),
    (NOW - timedelta(days=30, seconds=1), None),
])
def test_tablette_aux_bornes(expires_at, expected):
    assert tablet_kind(expires_at, None, NOW) == expected


@pytest.mark.parametrize("expires_at", [NOW - timedelta(days=1), NOW + timedelta(days=1)])
def test_tablette_revoquee_jamais_signalee(expires_at):
    assert tablet_kind(expires_at, NOW - timedelta(days=3), NOW) is None
    assert _kinds(tablets=[_tablet(expires_at, NOW - timedelta(days=3))]) == []


def test_tablette_qui_expire_datee_de_son_expiration():
    expires_at = NOW + timedelta(days=3)
    [item] = to_do(pins=[], tablets=[_tablet(expires_at)], presences=[], onboarding=[], now=NOW)
    assert (item.kind, item.subject_name, item.since) == (ToDoKind.TABLET_EXPIRING, "Tablette de l'entrée",
                                                         expires_at)


# --- Départs non pointés ---------------------------------------------------------

def test_fenetre_des_departs():
    assert departure_window(date(2026, 11, 20)) == (date(2026, 10, 20), date(2026, 11, 19))


@pytest.mark.parametrize(("day", "listed"), [
    (date(2026, 11, 20), False),  # aujourd'hui : l'enfant est peut-être encore là
    (date(2026, 11, 19), True),
    (date(2026, 10, 20), True),  # 31 jours : encore corrigeable (LUN-120)
    (date(2026, 10, 19), False),  # 32 jours : la correction est refusée, rien à proposer
])
def test_depart_non_pointe_aux_bornes(day, listed):
    assert _kinds(presences=[_presence(day)]) == ([ToDoKind.DEPARTURE_MISSING] if listed else [])


def test_depart_non_pointe_porte_son_jour():
    presence = _presence(date(2026, 11, 18))
    [item] = to_do(pins=[], tablets=[], presences=[presence], onboarding=[], now=NOW)
    assert (item.subject_id, item.subject_name, item.day, item.since) == (
        presence.child_id, "Léo Fictif", date(2026, 11, 18), presence.arrived_at)


@pytest.mark.parametrize(("now", "listed"), [
    # 23 h 30 UTC le 19 = 0 h 30 le 20 à Paris : la présence du 19 est d'hier.
    (datetime(2026, 11, 19, 23, 30, tzinfo=UTC), True),
    # 22 h 59 UTC le 19 = 23 h 59 le 19 à Paris : c'est encore aujourd'hui.
    (datetime(2026, 11, 19, 22, 59, tzinfo=UTC), False),
    # 23 h UTC le 19 = minuit pile le 20 à Paris : le 19 devient la veille.
    (datetime(2026, 11, 19, 23, 0, tzinfo=UTC), True),
])
def test_minuit_a_paris(now, listed):
    assert _kinds(presences=[_presence(date(2026, 11, 19))], now=now) == (
        [ToDoKind.DEPARTURE_MISSING] if listed else [])


def test_minuit_a_paris_en_ete():
    presence = _presence(date(2026, 7, 14))
    assert _kinds(presences=[presence], now=datetime(2026, 7, 14, 21, 59, tzinfo=UTC)) == []
    assert _kinds(presences=[presence], now=datetime(2026, 7, 14, 22, 0, tzinfo=UTC)) == [
        ToDoKind.DEPARTURE_MISSING]


# --- Mise en route ---------------------------------------------------------------

def test_mise_en_route_incomplete_datee_de_la_creation():
    created = datetime(2026, 9, 1, tzinfo=UTC)
    [item] = to_do(pins=[], tablets=[], presences=[],
                   onboarding=[_onboarding(OnboardingFacts([], [], None), created_at=created)], now=NOW)
    assert (item.kind, item.subject_id, item.subject_name, item.since) == (
        ToDoKind.ONBOARDING_INCOMPLETE, NORD.id, "Crèche nord", created)


def test_mise_en_route_terminee_rien_a_signaler():
    long_ago = NOW - timedelta(days=60)
    facts = OnboardingFacts([StaffAccess(long_ago, True)], [Tablet(long_ago, NOW + timedelta(days=30), None)],
                            long_ago)
    assert _kinds(onboarding=[_onboarding(facts)]) == []


def test_mise_en_route_perdue_quand_la_tablette_expire():
    long_ago = NOW - timedelta(days=60)
    facts = OnboardingFacts([StaffAccess(long_ago, True)], [Tablet(long_ago, NOW, None)], long_ago)
    assert _kinds(onboarding=[_onboarding(facts)]) == [ToDoKind.ONBOARDING_INCOMPLETE]


# --- Ordre -----------------------------------------------------------------------

def test_ordre_genre_puis_le_plus_ancien():
    items = to_do(
        pins=[_pin(NOW - timedelta(hours=1), name="Récent"), _pin(NOW - timedelta(days=3), name="Ancien")],
        tablets=[_tablet(NOW + timedelta(days=2)), _tablet(NOW - timedelta(days=1))],
        presences=[_presence(date(2026, 11, 19)), _presence(date(2026, 11, 2))],
        onboarding=[_onboarding(OnboardingFacts([], [], None))],
        now=NOW,
    )
    assert [item.kind for item in items] == [
        ToDoKind.PIN_LOCKED, ToDoKind.PIN_LOCKED, ToDoKind.TABLET_EXPIRED, ToDoKind.DEPARTURE_MISSING,
        ToDoKind.DEPARTURE_MISSING, ToDoKind.TABLET_EXPIRING, ToDoKind.ONBOARDING_INCOMPLETE]
    assert [item.subject_name for item in items[:2]] == ["Ancien", "Récent"]
    assert [item.day for item in items[3:5]] == [date(2026, 11, 2), date(2026, 11, 19)]


def test_ordre_stable_a_egalite():
    at = NOW - timedelta(hours=2)
    first = to_do(pins=[_pin(at, nursery=SUD, name="B"), _pin(at, nursery=NORD, name="B"), _pin(at, name="A")],
                  tablets=[], presences=[], onboarding=[], now=NOW)
    assert [(item.nursery.name, item.subject_name) for item in first] == [
        ("Crèche nord", "A"), ("Crèche nord", "B"), ("Crèche sud", "B")]


def test_rien_a_traiter():
    assert to_do(pins=[], tablets=[], presences=[], onboarding=[], now=NOW) == []
