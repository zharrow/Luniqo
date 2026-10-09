"""Cas d'usage du second facteur (ADR-004) : activation du TOTP, vérification, retrait, codes de secours.

Comme pour la tablette, le service travaille directement avec la session SQL ;
les routes sont testées sur une vraie PostgreSQL (tests/integration/test_mfa_db.py).
"""

import uuid
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import passwords
from app.auth import policy as auth_policy
from app.auth.models import AuthEvent, AuthEventType, UserSession
from app.auth.service import Client, WebSession
from app.mfa import crypto, policy
from app.mfa.models import BackupCode, TotpFactor
from app.mfa.policy import MfaState


class MfaUnavailable(Exception):
    """Clé de chiffrement absente de la configuration (MFA_KEY_FILE)."""


class Refused(Exception):
    """Opération refusée. `reason` : mfa_pending, reauthentication_required, not_pending,
    no_pending_setup, no_factor, last_factor ou totp_locked."""

    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


class InvalidCode(Exception):
    pass


class TooManyAttempts(Exception):
    def __init__(self, retry_after: int) -> None:
        super().__init__(f"réessayer dans {retry_after} s")
        self.retry_after = retry_after


@dataclass(frozen=True)
class MfaStatus:
    state: MfaState
    totp: TotpFactor | None
    totp_setup_pending: bool
    backup_codes_remaining: int


def _event(db: AsyncSession, kind: AuthEventType, web: WebSession, client: Client, now: datetime,
           detail: str | None = None) -> None:
    db.add(AuthEvent(occurred_at=now, event=kind.value, user_id=web.user.id, email=web.user.email, ip=client.ip,
                     user_agent=client.user_agent, detail=detail))


def _key(key: bytes | None) -> bytes:
    if key is None:
        raise MfaUnavailable
    return key


async def _confirmed_totp(db: AsyncSession, user_id: uuid.UUID, *, lock: bool = False) -> TotpFactor | None:
    statement = select(TotpFactor).where(TotpFactor.user_id == user_id, TotpFactor.confirmed_at.is_not(None))
    # FOR UPDATE : deux requêtes simultanées avec le même code ne passent pas
    # toutes les deux (la seconde attend, puis voit le pas déjà utilisé).
    return await db.scalar(statement.with_for_update() if lock else statement)


async def _pending_totp(db: AsyncSession, user_id: uuid.UUID) -> TotpFactor | None:
    return await db.scalar(select(TotpFactor).where(TotpFactor.user_id == user_id, TotpFactor.confirmed_at.is_(None)))


async def _unused_backup_codes(db: AsyncSession, user_id: uuid.UUID) -> int:
    return await db.scalar(select(func.count()).select_from(BackupCode).where(
        BackupCode.user_id == user_id, BackupCode.used_at.is_(None))) or 0


async def _state(db: AsyncSession, web: WebSession) -> MfaState:
    has_factor = await _confirmed_totp(db, web.user.id) is not None
    return policy.session_state(web.session.mfa_required, web.session.mfa_verified_at, has_factor)


async def _check_management(db: AsyncSession, web: WebSession, now: datetime) -> MfaState:
    state = await _state(db, web)
    recent = policy.recently_authenticated(web.session.created_at, web.session.mfa_verified_at, now)
    refusal = policy.management_refusal(state, recent)
    if refusal:
        raise Refused(refusal)
    return state


async def _revoke_other_sessions(db: AsyncSession, web: WebSession, client: Client, now: datetime) -> None:
    """Un facteur ajouté, changé ou retiré ferme les autres sessions du compte (ADR-004)."""
    result = await db.execute(delete(UserSession).where(UserSession.user_id == web.user.id,
                                                        UserSession.id != web.session.id))
    if result.rowcount:
        _event(db, AuthEventType.SESSIONS_REVOKED, web, client, now, detail="mfa_changed")


async def _new_backup_codes(db: AsyncSession, user_id: uuid.UUID, now: datetime) -> list[str]:
    """Remplace les codes de secours du compte ; renvoie les nouveaux, affichés une seule fois."""
    await db.execute(delete(BackupCode).where(BackupCode.user_id == user_id))
    codes = [policy.new_backup_code() for _ in range(policy.BACKUP_CODE_COUNT)]
    for code in codes:
        lookup, rest = policy.split_backup_code(code)
        db.add(BackupCode(id=uuid.uuid4(), user_id=user_id, lookup=lookup,
                          code_hash=await passwords.hash_password(rest), created_at=now))
    return [policy.format_backup_code(code) for code in codes]


async def _throttle(db: AsyncSession, web: WebSession, client: Client, now: datetime) -> None:
    """Mêmes seuils que le mot de passe, comptés par compte (ADR-004)."""
    count, last = (await db.execute(
        select(func.count(), func.max(AuthEvent.occurred_at)).where(
            AuthEvent.user_id == web.user.id, AuthEvent.event == AuthEventType.MFA_FAILED.value,
            AuthEvent.occurred_at >= now - auth_policy.FAILURE_WINDOW)
    )).one()
    wait = auth_policy.retry_after(auth_policy.FailureStats(count, last), auth_policy.ACCOUNT_THROTTLE, now)
    if wait:
        _event(db, AuthEventType.MFA_THROTTLED, web, client, now)
        await db.commit()
        raise TooManyAttempts(wait)


async def _consecutive_failures(db: AsyncSession, user_id: uuid.UUID) -> int:
    """Échecs depuis la dernière réussite ou la dernière activation d'un TOTP."""
    last_success = (
        select(func.max(AuthEvent.occurred_at))
        .where(AuthEvent.user_id == user_id,
               AuthEvent.event.in_([AuthEventType.MFA_SUCCEEDED.value, AuthEventType.TOTP_ENABLED.value]))
        .scalar_subquery()
    )
    return await db.scalar(select(func.count()).select_from(AuthEvent).where(
        AuthEvent.user_id == user_id, AuthEvent.event == AuthEventType.MFA_FAILED.value,
        AuthEvent.occurred_at > func.coalesce(last_success, func.to_timestamp(0)))) or 0


async def _fail(db: AsyncSession, web: WebSession, client: Client, now: datetime, detail: str) -> InvalidCode:
    _event(db, AuthEventType.MFA_FAILED, web, client, now, detail=detail)
    await db.commit()
    return InvalidCode()


# --- Consultation -----------------------------------------------------------------

async def status(db: AsyncSession, web: WebSession) -> MfaStatus:
    totp = await _confirmed_totp(db, web.user.id)
    state = policy.session_state(web.session.mfa_required, web.session.mfa_verified_at, totp is not None)
    return MfaStatus(state=state, totp=totp, totp_setup_pending=await _pending_totp(db, web.user.id) is not None,
                     backup_codes_remaining=await _unused_backup_codes(db, web.user.id))


# --- Activation du TOTP -----------------------------------------------------------

async def start_totp(db: AsyncSession, web: WebSession, key: bytes | None, now: datetime) -> tuple[str, str]:
    """Crée un secret en attente de confirmation ; renvoie (secret en base 32, URI du QR code)."""
    key = _key(key)
    await _check_management(db, web, now)
    # Une seule activation en cours : recommencer annule la précédente.
    await db.execute(delete(TotpFactor).where(TotpFactor.user_id == web.user.id, TotpFactor.confirmed_at.is_(None)))
    secret = policy.new_totp_secret()
    db.add(TotpFactor(id=uuid.uuid4(), user_id=web.user.id, secret_ciphertext=crypto.encrypt_secret(key, web.user.id,
                                                                                                    secret),
                      created_at=now))
    await db.commit()
    return policy.secret_to_base32(secret), policy.otpauth_uri(secret, web.user.email)


async def confirm_totp(db: AsyncSession, web: WebSession, code: str, key: bytes | None, client: Client,
                       now: datetime) -> list[str] | None:
    """Active le TOTP en attente si le code est bon.

    Renvoie les codes de secours s'il a fallu en créer (premier facteur du
    compte), None sinon : les codes existants restent valables.
    """
    key = _key(key)
    await _check_management(db, web, now)
    pending = await _pending_totp(db, web.user.id)
    if pending is None:
        raise Refused("no_pending_setup")
    await _throttle(db, web, client, now)
    secret = crypto.decrypt_secret(key, web.user.id, pending.secret_ciphertext)
    match = policy.check_totp(secret, code, now, last_used_step=None)
    if match.step is None:
        raise await _fail(db, web, client, now, "totp_setup")

    replaced = await _confirmed_totp(db, web.user.id) is not None
    # L'ancien TOTP disparaît avant que le nouveau soit confirmé : un seul TOTP
    # confirmé par compte (index unique partiel).
    await db.execute(delete(TotpFactor).where(TotpFactor.user_id == web.user.id,
                                              TotpFactor.confirmed_at.is_not(None)))
    await db.flush()
    pending.confirmed_at = now
    pending.last_used_step, pending.last_used_at = match.step, now
    # La personne vient de prouver qu'elle détient le facteur : la session est
    # complète, et les prochaines connexions l'exigeront.
    web.session.mfa_required = True
    web.session.mfa_verified_at = now
    codes = None if await _unused_backup_codes(db, web.user.id) else await _new_backup_codes(db, web.user.id, now)
    await _revoke_other_sessions(db, web, client, now)
    _event(db, AuthEventType.TOTP_ENABLED, web, client, now, detail="replaced" if replaced else None)
    if codes:
        _event(db, AuthEventType.BACKUP_CODES_GENERATED, web, client, now)
    await db.commit()
    return codes


# --- Vérification à la connexion --------------------------------------------------

async def verify(db: AsyncSession, web: WebSession, code: str, key: bytes | None, client: Client,
                 now: datetime) -> str:
    """Complète une session en attente avec un code TOTP ou un code de secours ; renvoie la méthode utilisée."""
    key = _key(key)
    if not web.session.mfa_pending:
        raise Refused("not_pending")
    await _throttle(db, web, client, now)

    if policy.normalize_totp_code(code) is not None:
        method = "totp"
        factor = await _confirmed_totp(db, web.user.id, lock=True)
        if factor is None:
            raise await _fail(db, web, client, now, "no_totp")
        if policy.totp_locked(await _consecutive_failures(db, web.user.id)):
            _event(db, AuthEventType.MFA_FAILED, web, client, now, detail="locked")
            await db.commit()
            raise Refused("totp_locked")
        match = policy.check_totp(crypto.decrypt_secret(key, web.user.id, factor.secret_ciphertext), code, now,
                                  factor.last_used_step)
        if match.step is None:
            raise await _fail(db, web, client, now, "replay" if match.replay else "totp")
        factor.last_used_step, factor.last_used_at = match.step, now
    else:
        method = "backup_code"
        normalized = policy.normalize_backup_code(code)
        if normalized is None:
            raise await _fail(db, web, client, now, "malformed")
        lookup, rest = policy.split_backup_code(normalized)
        candidates = list(await db.scalars(
            select(BackupCode).where(BackupCode.user_id == web.user.id, BackupCode.lookup == lookup,
                                     BackupCode.used_at.is_(None)).with_for_update()
        ))
        used = None
        for candidate in candidates:
            if (await passwords.verify_password(candidate.code_hash, rest))[0]:
                used = candidate
                break
        if not candidates:
            # Même temps de réponse que le code existe ou non (haché factice).
            await passwords.verify_password(None, rest)
        if used is None:
            raise await _fail(db, web, client, now, "backup_code")
        used.used_at = now

    web.session.mfa_verified_at = now
    _event(db, AuthEventType.MFA_SUCCEEDED, web, client, now, detail=method)
    await db.commit()
    return method


# --- Retrait et codes de secours --------------------------------------------------

async def remove_totp(db: AsyncSession, web: WebSession, client: Client, now: datetime) -> None:
    await _check_management(db, web, now)
    if await _confirmed_totp(db, web.user.id) is None:
        raise Refused("no_factor")
    # Seul facteur possible pour l'instant (les passkeys viendront) : la
    # direction et l'éditeur ne peuvent pas le retirer, seulement le remplacer.
    if not policy.can_remove_last_factor(web.user.role):
        raise Refused("last_factor")
    await db.execute(delete(TotpFactor).where(TotpFactor.user_id == web.user.id))
    # Sans facteur, les codes de secours ne servent plus à rien.
    await db.execute(delete(BackupCode).where(BackupCode.user_id == web.user.id))
    await _revoke_other_sessions(db, web, client, now)
    _event(db, AuthEventType.TOTP_REMOVED, web, client, now)
    await db.commit()


async def regenerate_backup_codes(db: AsyncSession, web: WebSession, client: Client, now: datetime) -> list[str]:
    await _check_management(db, web, now)
    if await _confirmed_totp(db, web.user.id) is None:
        raise Refused("no_factor")
    codes = await _new_backup_codes(db, web.user.id, now)
    await _revoke_other_sessions(db, web, client, now)
    _event(db, AuthEventType.BACKUP_CODES_GENERATED, web, client, now, detail="regenerated")
    await db.commit()
    return codes
