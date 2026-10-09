"""Règles de la tablette et du PIN (ADR-003). Fonctions pures, testées seules.

Un PIN à 4 chiffres vaut environ 13 bits d'entropie. La CNIL ne l'admet que
lié à un matériel, avec blocage après 3 échecs : il n'est accepté que depuis
une tablette enrôlée, et bloqué au 3e échec consécutif. Son haché Argon2id ne
protège presque rien hors ligne (10 000 valeurs possibles) : la vraie
protection est qu'il ne quitte jamais le serveur.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta

PIN_LENGTH = 4
PIN_MAX_FAILURES = 3

# Durée de vie d'une tablette enrôlée : la direction la réenrôle ensuite.
DEVICE_LIFETIME = timedelta(days=90)
# Session ouverte par PIN : le temps d'un geste de terrain (pointer, cocher une tâche).
ACTION_SESSION_LIFETIME = timedelta(minutes=2)

# Échecs de PIN comptés aussi par tablette, tous employés confondus : sans cela,
# on pourrait essayer 2 PIN sur chaque employé sans jamais déclencher de blocage.
DEVICE_FAILURE_WINDOW = timedelta(minutes=15)
DEVICE_MAX_FAILURES = 10


class PinPolicyError(ValueError):
    """PIN refusé ; le message est destiné à l'utilisateur."""


def check_pin(pin: str) -> None:
    if len(pin) != PIN_LENGTH or not pin.isascii() or not pin.isdigit():
        raise PinPolicyError(f"Le PIN doit contenir exactement {PIN_LENGTH} chiffres.")
    if len(set(pin)) == 1:
        raise PinPolicyError("Ce PIN est trop prévisible (chiffres identiques).")
    steps = {int(b) - int(a) for a, b in zip(pin, pin[1:], strict=False)}
    if steps in ({1}, {-1}):
        raise PinPolicyError("Ce PIN est trop prévisible (suite de chiffres).")


@dataclass(frozen=True)
class DeviceState:
    expires_at: datetime
    revoked_at: datetime | None


def device_usable(device: DeviceState, nursery_active: bool, now: datetime) -> bool:
    return device.revoked_at is None and now < device.expires_at and nursery_active


def action_session_expired(created_at: datetime, now: datetime) -> bool:
    return now - created_at >= ACTION_SESSION_LIFETIME


def device_throttled(recent_failures: int) -> bool:
    return recent_failures >= DEVICE_MAX_FAILURES
