"""Règles des comptes, sans base ni horloge : testées seules."""

from datetime import datetime, timedelta

# Même durée que l'invitation des familles (LUN-49).
INVITATION_LIFETIME = timedelta(days=7)

# Changement de mot de passe : essais du mot de passe actuel, par compte, sur la
# fenêtre de la connexion (15 min). Même seuil que la confirmation du PIN.
PASSWORD_CHANGE_MAX_FAILURES = 5


def invitation_usable(*, used_at: datetime | None, revoked_at: datetime | None, expires_at: datetime,
                      now: datetime, account_active: bool, has_password: bool) -> bool:
    """L'invitation sert une fois, avant expiration, pour un compte actif qui n'a pas encore de mot de passe."""
    return (used_at is None and revoked_at is None and now < expires_at and account_active
            and not has_password)
