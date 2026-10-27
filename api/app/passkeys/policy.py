"""Règles des passkeys (ADR-004). Fonctions pures, testées seules.

L'API ne fait aucune cryptographie WebAuthn elle-même : la vérification des
réponses du navigateur est confiée à py_webauthn (service.py). Ici, seulement
ce que Luniqo décide : domaine, origines, durées, limites.
"""

import enum
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta
from urllib.parse import urlsplit

from app.auth.models import UserRole
from app.mfa.policy import PRIVILEGED_ROLES

RP_NAME = "Luniqo"

# Délai laissé au navigateur : 5 minutes, valeur recommandée par WebAuthn
# niveau 3 quand la vérification de l'utilisateur est exigée. Le défi expire en même temps.
TIMEOUT = timedelta(minutes=5)
# 32 octets aléatoires : WebAuthn en recommande au moins 16.
CHALLENGE_BYTES = 32

NAME_MAX_LENGTH = 64
# Téléphone, ordinateur, clé de secours… : assez pour un usage réel, borné
# pour qu'un compte volé ne puisse pas en accumuler.
MAX_PASSKEYS_PER_USER = 10
# Défis de connexion sans mot de passe en attente par adresse IP : la route
# est publique, elle ne doit pas permettre de remplir la base.
MAX_PENDING_LOGIN_CHALLENGES_PER_IP = 20


class Purpose(enum.StrEnum):
    REGISTRATION = "registration"
    # Second facteur d'une session ouverte par mot de passe.
    VERIFICATION = "verification"
    # Connexion sans mot de passe : la passkey vaut les deux facteurs.
    LOGIN = "login"


@dataclass(frozen=True)
class RelyingParty:
    """Domaine auquel les passkeys sont liées, et origines admises à s'en servir."""

    id: str
    origins: tuple[str, ...]


def new_challenge() -> bytes:
    return secrets.token_bytes(CHALLENGE_BYTES)


def relying_party(app_origins: tuple[str, ...]) -> RelyingParty | None:
    """Domaine tiré de la première origine de l'application (APP_ORIGINS).

    Une passkey est liée à ce domaine : un faux site ne peut pas s'en servir.
    Seules les origines de ce domaine ou de ses sous-domaines sont admises.
    None si aucune origine n'est configurée.
    """
    if not app_origins:
        return None
    rp_id = urlsplit(app_origins[0]).hostname
    if not rp_id:
        return None
    allowed = tuple(origin for origin in app_origins
                    if (host := urlsplit(origin).hostname) and (host == rp_id or host.endswith("." + rp_id)))
    return RelyingParty(id=rp_id, origins=allowed)


def challenge_usable(expires_at: datetime, now: datetime) -> bool:
    return now < expires_at


def normalize_name(name: str) -> str | None:
    """Nom affiché, espaces superflus retirés ; None s'il est vide ou trop long."""
    compact = " ".join(name.split())
    return compact if 0 < len(compact) <= NAME_MAX_LENGTH else None


def can_remove_factor(role: UserRole, remaining_factors: int) -> bool:
    """Direction et éditeur gardent toujours au moins un facteur (passkey ou TOTP)."""
    return role not in PRIVILEGED_ROLES or remaining_factors > 0
