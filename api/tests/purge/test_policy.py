"""Dates limites de la purge (LUN-54) : jamais avant l'expiration prévue par chaque module."""

from datetime import UTC, date, datetime, timedelta

import pytest

from app.accounts import policy as accounts_policy
from app.auth import policy as auth_policy
from app.passkeys import policy as passkey_policy
from app.purge import policy
from app.tablets import policy as tablet_policy

NOW = datetime(2026, 10, 27, 9, 30, tzinfo=UTC)
TICK = timedelta(microseconds=1)
LIMIT = policy.cutoffs(NOW)


def test_session_web_inactive_supprimee_des_qu_elle_est_refusee():
    created = NOW - timedelta(hours=1)
    assert auth_policy.session_expired(created, LIMIT.web_session_seen, NOW)
    assert not auth_policy.session_expired(created, LIMIT.web_session_seen + TICK, NOW)


def test_session_web_trop_ancienne_supprimee_des_qu_elle_est_refusee():
    assert auth_policy.session_expired(LIMIT.web_session_created, NOW, NOW)
    assert not auth_policy.session_expired(LIMIT.web_session_created + TICK, NOW, NOW)


def test_session_de_tablette_supprimee_des_qu_elle_est_refusee():
    assert tablet_policy.action_session_expired(LIMIT.tablet_session_created, NOW)
    assert not tablet_policy.action_session_expired(LIMIT.tablet_session_created + TICK, NOW)


def test_invitation_supprimee_des_qu_elle_est_inutilisable():
    def usable(expires_at: datetime) -> bool:
        return accounts_policy.invitation_usable(used_at=None, revoked_at=None, expires_at=expires_at, now=NOW,
                                                 account_active=True, has_password=False)

    assert not usable(LIMIT.invitation_expires)
    assert usable(LIMIT.invitation_expires + TICK)


def test_defi_de_passkey_supprime_des_qu_il_est_refuse():
    assert not passkey_policy.challenge_usable(LIMIT.challenge_expires, NOW)
    assert passkey_policy.challenge_usable(LIMIT.challenge_expires + TICK, NOW)


def _months_before(day: date, months: int) -> date:
    """Même jour, `months` mois plus tôt (dernier jour du mois s'il n'existe pas)."""
    year, month = divmod(day.year * 12 + day.month - 1 - months, 12)
    month += 1
    for candidate in (day.day, 30, 29, 28):
        try:
            return date(year, month, candidate)
        except ValueError:
            continue
    raise AssertionError(day)


@pytest.mark.parametrize("year", [2026, 2027, 2028])
def test_journal_garde_6_mois_pleins_et_moins_d_un_an(year):
    day = date(year, 1, 1)
    while day.year == year:
        now = datetime(day.year, day.month, day.day, tzinfo=UTC)
        kept_from = policy.cutoffs(now).auth_event.date()
        assert kept_from <= _months_before(day, 6), day
        assert kept_from > _months_before(day, 12), day
        day += timedelta(days=1)


@pytest.mark.parametrize("window", [
    auth_policy.FAILURE_WINDOW, auth_policy.ACCOUNT_THROTTLE.block, auth_policy.IP_THROTTLE.block,
    tablet_policy.DEVICE_FAILURE_WINDOW,
])
def test_journal_garde_les_fenetres_de_la_limitation_des_tentatives(window):
    assert policy.AUTH_EVENT_RETENTION > window
