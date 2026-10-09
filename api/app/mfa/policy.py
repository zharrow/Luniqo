"""Règles du second facteur (ADR-004) : calcul TOTP, codes de secours, états de session.

Fonctions pures, sans base ni horloge : l'heure courante est passée en
paramètre. Le calcul TOTP est vérifié sur les vecteurs de test de la RFC 6238.
"""

import base64
import enum
import hashlib
import hmac
import secrets
import struct
from dataclasses import dataclass
from datetime import datetime, timedelta
from urllib.parse import quote, urlencode

from app.auth.models import UserRole

# TOTP : paramètres par défaut de la RFC 6238, les seuls que toutes les
# applications d'authentification lisent (SHA-1, 6 chiffres, 30 s). SHA-1 reste
# sûr dans HMAC, qui ne dépend pas de la résistance aux collisions.
STEP_SECONDS = 30
DIGITS = 6
# 160 bits : taille recommandée par la RFC 4226 (§4) et retenue par ADR-004.
SECRET_BYTES = 20
# Un pas de 30 s de tolérance de chaque côté, pour l'horloge du téléphone.
DRIFT_STEPS = 1
ISSUER = "Luniqo"

# Au-delà de 100 échecs consécutifs, le TOTP est bloqué (NIST SP 800-63B-4) ;
# seul un code de secours le débloque. Avec la limitation par fenêtre de
# 15 minutes, un attaquant qui a le mot de passe ne peut pas essayer le
# million de codes possibles.
MAX_CONSECUTIVE_FAILURES = 100

# Ajouter, changer ou retirer un facteur : la session doit avoir prouvé
# l'identité (mot de passe, ou second facteur s'il est exigé) depuis moins de 15 minutes.
REAUTH_WINDOW = timedelta(minutes=15)

BACKUP_CODE_COUNT = 10
# Base 32 de Crockford : ni I, L, O, U, pour qu'un code recopié à la main ne
# soit pas ambigu. 12 caractères = 60 bits, affichés XXXX-XXXX-XXXX.
BACKUP_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
BACKUP_LENGTH = 12
LOOKUP_LENGTH = 4
_BACKUP_CONFUSABLES = str.maketrans({"O": "0", "I": "1", "L": "1"})

PRIVILEGED_ROLES = frozenset({UserRole.OWNER, UserRole.DEVELOPER})


# --- TOTP (RFC 4226 et 6238) ----------------------------------------------------

def new_totp_secret() -> bytes:
    return secrets.token_bytes(SECRET_BYTES)


def secret_to_base32(secret: bytes) -> str:
    """Forme saisie à la main ou lue dans le QR code (sans le bourrage « = »)."""
    return base64.b32encode(secret).decode().rstrip("=")


def hotp(secret: bytes, counter: int, digits: int = DIGITS) -> str:
    """RFC 4226 §5.3 : HMAC-SHA-1 du compteur, troncature dynamique."""
    digest = hmac.new(secret, struct.pack(">Q", counter), hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    value = struct.unpack(">I", digest[offset:offset + 4])[0] & 0x7FFFFFFF
    return str(value % 10 ** digits).zfill(digits)


def time_step(now: datetime) -> int:
    return int(now.timestamp()) // STEP_SECONDS


@dataclass(frozen=True)
class TotpMatch:
    """Résultat d'une vérification : `step` renseigné si le code est accepté."""

    step: int | None = None
    replay: bool = False


def check_totp(secret: bytes, code: str, now: datetime, last_used_step: int | None) -> TotpMatch:
    """Compare le code aux pas courant, précédent et suivant ; refuse un pas déjà utilisé."""
    code = normalize_totp_code(code)
    if code is None:
        return TotpMatch()
    current = time_step(now)
    for step in (current, current - 1, current + 1):
        if hmac.compare_digest(hotp(secret, step), code):
            if last_used_step is not None and step <= last_used_step:
                return TotpMatch(replay=True)
            return TotpMatch(step=step)
    return TotpMatch()


def normalize_totp_code(code: str) -> str | None:
    """« 123 456 » → « 123456 » ; None si ce n'est pas un code TOTP."""
    compact = code.replace(" ", "").strip()
    return compact if len(compact) == DIGITS and compact.isascii() and compact.isdigit() else None


def otpauth_uri(secret: bytes, email: str) -> str:
    """Contenu du QR code, au format lu par les applications d'authentification."""
    label = quote(f"{ISSUER}:{email}", safe=":@")
    query = urlencode({"secret": secret_to_base32(secret), "issuer": ISSUER, "algorithm": "SHA1",
                       "digits": DIGITS, "period": STEP_SECONDS})
    return f"otpauth://totp/{label}?{query}"


# --- Codes de secours -----------------------------------------------------------

def new_backup_code() -> str:
    """Code brut de 12 caractères ; `format_backup_code` le présente à l'utilisateur."""
    return "".join(secrets.choice(BACKUP_ALPHABET) for _ in range(BACKUP_LENGTH))


def format_backup_code(code: str) -> str:
    return "-".join(code[i:i + 4] for i in range(0, BACKUP_LENGTH, 4))


def normalize_backup_code(code: str) -> str | None:
    """Forme canonique d'un code saisi (casse, tirets, espaces, O pour 0…) ; None s'il est mal formé."""
    compact = code.upper().replace("-", "").replace(" ", "").translate(_BACKUP_CONFUSABLES)
    if len(compact) != BACKUP_LENGTH or any(char not in BACKUP_ALPHABET for char in compact):
        return None
    return compact


def split_backup_code(code: str) -> tuple[str, str]:
    """(partie stockée en clair pour retrouver la ligne, partie hachée)."""
    return code[:LOOKUP_LENGTH], code[LOOKUP_LENGTH:]


# --- Sessions -------------------------------------------------------------------

class MfaState(enum.StrEnum):
    """État du second facteur pour une session, renvoyé au front."""

    NOT_REQUIRED = "not_required"
    # Second facteur obligatoire mais aucun facteur enregistré : la session ne
    # peut que l'enregistrer.
    SETUP_REQUIRED = "setup_required"
    # Un facteur existe : la session doit le présenter.
    REQUIRED = "required"
    VERIFIED = "verified"


def second_factor_required(role: UserRole, has_factor: bool) -> bool:
    """Direction et éditeur : toujours. Autres comptes : dès qu'ils ont activé un facteur."""
    return role in PRIVILEGED_ROLES or has_factor


def session_state(mfa_required: bool, mfa_verified_at: datetime | None, has_factor: bool) -> MfaState:
    if mfa_verified_at is not None:
        return MfaState.VERIFIED
    if not mfa_required:
        return MfaState.NOT_REQUIRED
    return MfaState.REQUIRED if has_factor else MfaState.SETUP_REQUIRED


def recently_authenticated(created_at: datetime, mfa_verified_at: datetime | None, now: datetime) -> bool:
    """Dernière preuve d'identité de la session : le second facteur s'il a été présenté, sinon la connexion."""
    return now - (mfa_verified_at or created_at) <= REAUTH_WINDOW


def management_refusal(state: MfaState, recent: bool) -> str | None:
    """Raison de refuser l'ajout, le changement ou le retrait d'un facteur ; None si permis."""
    if state == MfaState.REQUIRED:
        # Session qui n'a pas encore présenté son facteur : elle ne peut pas en
        # ajouter un autre (sinon le mot de passe seul suffirait à contourner le premier).
        return "mfa_pending"
    if not recent:
        return "reauthentication_required"
    return None


def can_remove_last_factor(role: UserRole) -> bool:
    return role not in PRIVILEGED_ROLES


def totp_locked(consecutive_failures: int) -> bool:
    return consecutive_failures >= MAX_CONSECUTIVE_FAILURES
