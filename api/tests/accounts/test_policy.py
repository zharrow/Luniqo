from datetime import UTC, datetime, timedelta

import pytest

from app.accounts.policy import INVITATION_LIFETIME, invitation_usable

NOW = datetime(2026, 10, 10, 12, 0, tzinfo=UTC)
VALID = {"used_at": None, "revoked_at": None, "expires_at": NOW + timedelta(days=1), "now": NOW,
         "account_active": True, "has_password": False}


def test_invitation_valable():
    assert invitation_usable(**VALID) is True


@pytest.mark.parametrize("change", [
    {"used_at": NOW},  # déjà utilisée
    {"revoked_at": NOW},  # remplacée par une nouvelle, ou compte désactivé
    {"expires_at": NOW},  # expirée à l'instant même
    {"account_active": False},  # salarié parti entre-temps
    {"has_password": True},  # compte déjà activé
])
def test_invitation_inutilisable(change):
    assert invitation_usable(**VALID | change) is False


def test_duree_de_sept_jours():
    assert INVITATION_LIFETIME == timedelta(days=7)
