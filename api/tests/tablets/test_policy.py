from datetime import UTC, datetime, timedelta

import pytest

from app.tablets.policy import (
    DeviceState,
    PinPolicyError,
    action_session_expired,
    check_pin,
    device_throttled,
    device_usable,
)

T0 = datetime(2026, 10, 9, 9, 0, tzinfo=UTC)


@pytest.mark.parametrize("pin", ["2580", "0472", "9137", "1029"])
def test_pin_accepte(pin):
    check_pin(pin)


@pytest.mark.parametrize(("pin", "message"), [
    ("123", "exactement 4"), ("12345", "exactement 4"), ("12a4", "exactement 4"), ("１２３４", "exactement 4"),
    ("0000", "identiques"), ("7777", "identiques"),
    ("1234", "suite"), ("6789", "suite"), ("4321", "suite"), ("9876", "suite"),
])
def test_pin_refuse(pin, message):
    with pytest.raises(PinPolicyError, match=message):
        check_pin(pin)


def test_tablette_utilisable():
    assert device_usable(DeviceState(T0 + timedelta(days=1), None), True, T0)


@pytest.mark.parametrize(("state", "nursery_active"), [
    (DeviceState(T0, None), True),  # expirée
    (DeviceState(T0 + timedelta(days=1), T0), True),  # révoquée
    (DeviceState(T0 + timedelta(days=1), None), False),  # crèche fermée
])
def test_tablette_inutilisable(state, nursery_active):
    assert not device_usable(state, nursery_active, T0)


def test_session_d_action_de_2_minutes():
    assert not action_session_expired(T0, T0 + timedelta(seconds=119))
    assert action_session_expired(T0, T0 + timedelta(minutes=2))


def test_blocage_de_la_tablette_a_10_echecs():
    assert not device_throttled(9)
    assert device_throttled(10)
