from datetime import UTC, datetime, timedelta

import pytest

from app.auth.policy import (
    ACCOUNT_THROTTLE,
    FAILURE_WINDOW,
    IP_THROTTLE,
    FailureStats,
    needs_touch,
    retry_after,
    session_expired,
)

T0 = datetime(2026, 10, 8, 9, 0, tzinfo=UTC)


def test_session_valable_avant_30_minutes_d_inactivite():
    assert not session_expired(T0, T0, T0 + timedelta(minutes=29, seconds=59))


def test_session_expiree_apres_30_minutes_d_inactivite():
    assert session_expired(T0, T0, T0 + timedelta(minutes=30))


def test_session_expiree_apres_12_heures_meme_active():
    last_seen = T0 + timedelta(hours=11, minutes=59)
    assert not session_expired(T0, last_seen, T0 + timedelta(hours=11, minutes=59, seconds=59))
    assert session_expired(T0, last_seen, T0 + timedelta(hours=12))


def test_derniere_activite_reecrite_au_plus_une_fois_par_minute():
    assert not needs_touch(T0, T0 + timedelta(seconds=59))
    assert needs_touch(T0, T0 + timedelta(minutes=1))


@pytest.mark.parametrize(("failures", "expected"), [
    (0, 0),
    (4, 0),
    (5, 1),
    (6, 2),
    (8, 8),
    (9, 16),
    (10, 900),
    (25, 900),
])
def test_delai_par_compte_juste_apres_le_dernier_echec(failures, expected):
    assert retry_after(FailureStats(failures, T0), ACCOUNT_THROTTLE, T0) == expected


def test_delai_decompte_depuis_le_dernier_echec():
    stats = FailureStats(10, T0)
    assert retry_after(stats, ACCOUNT_THROTTLE, T0 + timedelta(minutes=10)) == 300
    assert retry_after(stats, ACCOUNT_THROTTLE, T0 + timedelta(minutes=15)) == 0


def test_seuils_par_ip_plus_hauts_que_par_compte():
    assert retry_after(FailureStats(19, T0), IP_THROTTLE, T0) == 0
    assert retry_after(FailureStats(20, T0), IP_THROTTLE, T0) == 1
    assert retry_after(FailureStats(30, T0), IP_THROTTLE, T0) == 900


def test_delai_plafonne_a_une_minute_avant_le_blocage():
    assert retry_after(FailureStats(29, T0), IP_THROTTLE, T0) == 60


@pytest.mark.parametrize("throttle", [ACCOUNT_THROTTLE, IP_THROTTLE], ids=["compte", "ip"])
def test_blocage_atteignable_dans_la_fenetre(throttle):
    # Sinon les délais imposés feraient sortir les premiers échecs de la
    # fenêtre avant le seuil, et le blocage ne se déclencherait jamais.
    waits = sum(retry_after(FailureStats(count, T0), throttle, T0) for count in range(throttle.delay_from, throttle.block_from))
    assert waits < FAILURE_WINDOW.total_seconds()
