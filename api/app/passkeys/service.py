"""Cas d'usage des passkeys (ADR-004) : enregistrement, second facteur, connexion sans mot de passe, retrait.

La vérification cryptographique des réponses du navigateur (signature,
défi, origine, domaine, vérification de l'utilisateur, compteur) est faite
par py_webauthn ; le service décide du reste et tient le journal. Testé sur
une vraie PostgreSQL avec un authentificateur simulé (tests/integration/test_passkeys_db.py).
"""

import uuid
from datetime import datetime
from typing import Any

import webauthn
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from webauthn.helpers import options_to_json_dict, parse_authentication_credential_json, parse_client_data_json
from webauthn.helpers.exceptions import WebAuthnException
from webauthn.helpers.structs import (
    AttestationConveyancePreference,
    AuthenticationCredential,
    AuthenticatorSelectionCriteria,
    PublicKeyCredentialDescriptor,
    ResidentKeyRequirement,
    UserVerificationRequirement,
)

from app.auth import policy as auth_policy
from app.auth import service as auth_service
from app.auth.models import AppUser, AuthEvent, AuthEventType
from app.auth.repository import SqlAuthRepository
from app.auth.service import Client, LoginResult, WebSession
from app.mfa import service as mfa_service
from app.mfa.models import BackupCode, TotpFactor
from app.mfa.policy import MfaState, session_state
from app.mfa.service import Refused, TooManyAttempts
from app.passkeys import policy
from app.passkeys.models import Passkey, WebauthnChallenge
from app.passkeys.policy import Purpose, RelyingParty

# Réponse du navigateur mal formée ou refusée par py_webauthn (base64 invalide : ValueError).
_REJECTED = (WebAuthnException, ValueError, TypeError, KeyError)


class Unavailable(Exception):
    """Aucune origine configurée (APP_ORIGINS) : impossible de lier une passkey à un domaine."""


class InvalidPasskey(Exception):
    """Réponse du navigateur refusée : défi inconnu ou expiré, passkey inconnue, signature, origine…"""


def _event(db: AsyncSession, kind: AuthEventType, client: Client, now: datetime, *,
           user: AppUser | None = None, detail: str | None = None) -> None:
    # Ni défi, ni signature, ni identifiant de passkey dans le journal.
    db.add(AuthEvent(occurred_at=now, event=kind.value, user_id=user.id if user else None, ip=client.ip,
                     user_agent=client.user_agent, detail=detail))


def _rp(rp: RelyingParty | None) -> RelyingParty:
    if rp is None:
        raise Unavailable
    return rp


def _timeout_ms() -> int:
    return int(policy.TIMEOUT.total_seconds() * 1000)


async def _passkeys(db: AsyncSession, user_id: uuid.UUID) -> list[Passkey]:
    return list(await db.scalars(select(Passkey).where(Passkey.user_id == user_id).order_by(Passkey.created_at)))


def _descriptors(passkeys: list[Passkey]) -> list[PublicKeyCredentialDescriptor]:
    return [PublicKeyCredentialDescriptor(id=passkey.credential_id) for passkey in passkeys]


async def _new_challenge(db: AsyncSession, purpose: Purpose, now: datetime, *, session_id: uuid.UUID | None = None,
                         ip: str | None = None) -> bytes:
    if session_id is not None:
        # Un seul défi en attente par session et par usage : redemander annule le précédent.
        await db.execute(delete(WebauthnChallenge).where(WebauthnChallenge.session_id == session_id,
                                                         WebauthnChallenge.purpose == purpose.value))
    challenge = policy.new_challenge()
    db.add(WebauthnChallenge(id=uuid.uuid4(), challenge=challenge, purpose=purpose.value, session_id=session_id,
                             ip=ip, created_at=now, expires_at=now + policy.TIMEOUT))
    await db.commit()
    return challenge


async def _take_challenge(db: AsyncSession, purpose: Purpose, now: datetime, *, session_id: uuid.UUID | None = None,
                          challenge: bytes | None = None) -> bytes | None:
    """Retire le défi en attente (usage unique, même en cas d'échec) ; None s'il n'existe pas ou a expiré."""
    statement = delete(WebauthnChallenge).where(WebauthnChallenge.purpose == purpose.value)
    if session_id is not None:
        statement = statement.where(WebauthnChallenge.session_id == session_id)
    else:
        statement = statement.where(WebauthnChallenge.challenge == challenge)
    row = (await db.execute(statement.returning(WebauthnChallenge.challenge, WebauthnChallenge.expires_at)
                            .execution_options(synchronize_session=False))).first()
    return row.challenge if row is not None and policy.challenge_usable(row.expires_at, now) else None


async def _state(db: AsyncSession, web: WebSession) -> MfaState:
    return session_state(web.session.mfa_required, web.session.mfa_verified_at,
                         await mfa_service.has_factor(db, web.user.id))


def _parse_assertion(credential: dict[str, Any]) -> AuthenticationCredential:
    try:
        return parse_authentication_credential_json(credential)
    except _REJECTED:
        raise InvalidPasskey from None


def _verify_assertion(rp: RelyingParty, parsed: AuthenticationCredential, challenge: bytes,
                      passkey: Passkey, now: datetime) -> None:
    """Vérifie la signature et met à jour la passkey ; InvalidPasskey si la réponse est refusée."""
    try:
        verified = webauthn.verify_authentication_response(
            credential=parsed, expected_challenge=challenge, expected_rp_id=rp.id, expected_origin=list(rp.origins),
            credential_public_key=passkey.public_key, credential_current_sign_count=passkey.sign_count,
            # Biométrie ou code de l'appareil exigés : la passkey vaut alors deux facteurs.
            require_user_verification=True,
        )
    except _REJECTED:
        raise InvalidPasskey from None
    passkey.sign_count = verified.new_sign_count
    passkey.backed_up = verified.credential_backed_up
    passkey.last_used_at = now


# --- Consultation -----------------------------------------------------------------

async def list_passkeys(db: AsyncSession, web: WebSession) -> list[Passkey]:
    if await _state(db, web) == MfaState.REQUIRED:
        # Session ouverte par mot de passe seul, facteur pas encore présenté.
        raise Refused("mfa_pending")
    return await _passkeys(db, web.user.id)


# --- Enregistrement ---------------------------------------------------------------

async def registration_options(db: AsyncSession, web: WebSession, rp: RelyingParty | None,
                               now: datetime) -> dict[str, Any]:
    """Options de navigator.credentials.create() ; le défi est lié à la session."""
    rp = _rp(rp)
    await mfa_service.check_management(db, web, now)
    existing = await _passkeys(db, web.user.id)
    if len(existing) >= policy.MAX_PASSKEYS_PER_USER:
        raise Refused("too_many_passkeys")
    challenge = await _new_challenge(db, Purpose.REGISTRATION, now, session_id=web.session.id)
    options = webauthn.generate_registration_options(
        rp_id=rp.id, rp_name=policy.RP_NAME,
        # Identifiant opaque du compte, sans donnée personnelle (WebAuthn le
        # recommande) : renvoyé par la passkey à la connexion sans mot de passe.
        user_id=web.user.id.bytes, user_name=web.user.email,
        user_display_name=f"{web.user.first_name} {web.user.last_name}",
        challenge=challenge, timeout=_timeout_ms(),
        # Pas d'attestation : Luniqo n'impose pas de modèle d'appareil et ne
        # reçoit ainsi aucune information sur celui-ci.
        attestation=AttestationConveyancePreference.NONE,
        # Passkey « découvrable » (connexion sans saisir son adresse) et
        # vérification de l'utilisateur exigée.
        authenticator_selection=AuthenticatorSelectionCriteria(
            resident_key=ResidentKeyRequirement.REQUIRED,
            user_verification=UserVerificationRequirement.REQUIRED),
        # Une passkey déjà enregistrée sur cet appareil n'est pas recréée.
        exclude_credentials=_descriptors(existing),
    )
    return options_to_json_dict(options)


async def register(db: AsyncSession, web: WebSession, rp: RelyingParty | None, name: str,
                   credential: dict[str, Any], client: Client, now: datetime) -> tuple[Passkey, list[str] | None]:
    """Enregistre la passkey créée par le navigateur.

    Renvoie aussi les codes de secours s'il a fallu en créer (premier facteur
    du compte), None sinon. Comme l'activation d'un TOTP, la session devient
    complète et les autres sessions du compte sont fermées.
    """
    rp = _rp(rp)
    display_name = policy.normalize_name(name)
    if display_name is None:
        raise Refused("invalid_name")
    await mfa_service.check_management(db, web, now)
    challenge = await _take_challenge(db, Purpose.REGISTRATION, now, session_id=web.session.id)
    if challenge is None:
        await db.commit()
        raise Refused("no_challenge")
    try:
        verified = webauthn.verify_registration_response(
            credential=credential, expected_challenge=challenge, expected_rp_id=rp.id,
            expected_origin=list(rp.origins), require_user_verification=True,
        )
    except _REJECTED:
        await db.commit()  # le défi reste consommé
        raise InvalidPasskey from None
    if await db.scalar(select(Passkey.id).where(Passkey.credential_id == verified.credential_id)):
        await db.commit()
        raise Refused("already_registered")
    if len(await _passkeys(db, web.user.id)) >= policy.MAX_PASSKEYS_PER_USER:
        await db.commit()
        raise Refused("too_many_passkeys")

    passkey = Passkey(id=uuid.uuid4(), user_id=web.user.id, credential_id=verified.credential_id,
                      public_key=verified.credential_public_key, sign_count=verified.sign_count, name=display_name,
                      aaguid=verified.aaguid, backed_up=verified.credential_backed_up, created_at=now)
    db.add(passkey)
    web.session.mfa_required = True
    web.session.mfa_verified_at = now
    codes = (None if await mfa_service.unused_backup_codes(db, web.user.id)
             else await mfa_service.new_backup_codes(db, web.user.id, now))
    await mfa_service.revoke_other_sessions(db, web, client, now)
    _event(db, AuthEventType.PASSKEY_ADDED, client, now, user=web.user)
    if codes:
        _event(db, AuthEventType.BACKUP_CODES_GENERATED, client, now, user=web.user)
    await db.commit()
    return passkey, codes


async def rename(db: AsyncSession, user: AppUser, passkey_id: uuid.UUID, name: str) -> Passkey:
    display_name = policy.normalize_name(name)
    if display_name is None:
        raise Refused("invalid_name")
    passkey = await db.scalar(select(Passkey).where(Passkey.id == passkey_id, Passkey.user_id == user.id))
    if passkey is None:
        raise Refused("not_found")
    passkey.name = display_name
    await db.commit()
    return passkey


async def remove(db: AsyncSession, web: WebSession, passkey_id: uuid.UUID, client: Client, now: datetime) -> None:
    await mfa_service.check_management(db, web, now)
    # Filtré par compte : la passkey d'un autre compte est « introuvable ».
    passkey = await db.scalar(select(Passkey).where(Passkey.id == passkey_id, Passkey.user_id == web.user.id))
    if passkey is None:
        raise Refused("not_found")
    has_totp = await db.scalar(select(func.count()).select_from(TotpFactor).where(
        TotpFactor.user_id == web.user.id, TotpFactor.confirmed_at.is_not(None)))
    remaining = len(await _passkeys(db, web.user.id)) - 1 + (has_totp or 0)
    if not policy.can_remove_factor(web.user.role, remaining):
        raise Refused("last_factor")
    await db.delete(passkey)
    if not remaining:
        # Sans facteur, les codes de secours ne servent plus à rien.
        await db.execute(delete(BackupCode).where(BackupCode.user_id == web.user.id))
    await mfa_service.revoke_other_sessions(db, web, client, now)
    _event(db, AuthEventType.PASSKEY_REMOVED, client, now, user=web.user)
    await db.commit()


# --- Second facteur -----------------------------------------------------------------

async def verification_options(db: AsyncSession, web: WebSession, rp: RelyingParty | None,
                               now: datetime) -> dict[str, Any]:
    """Options de navigator.credentials.get() pour une session ouverte par mot de passe."""
    rp = _rp(rp)
    if not web.session.mfa_pending:
        raise Refused("not_pending")
    passkeys = await _passkeys(db, web.user.id)
    if not passkeys:
        raise Refused("no_passkey")
    challenge = await _new_challenge(db, Purpose.VERIFICATION, now, session_id=web.session.id)
    options = webauthn.generate_authentication_options(
        rp_id=rp.id, challenge=challenge, timeout=_timeout_ms(),
        # Seules les passkeys de ce compte : celle d'un autre compte n'ouvre pas cette session.
        allow_credentials=_descriptors(passkeys),
        user_verification=UserVerificationRequirement.REQUIRED,
    )
    return options_to_json_dict(options)


async def verify(db: AsyncSession, web: WebSession, rp: RelyingParty | None, credential: dict[str, Any],
                 client: Client, now: datetime) -> None:
    """Complète une session en attente du second facteur avec une passkey du compte."""
    rp = _rp(rp)
    if not web.session.mfa_pending:
        raise Refused("not_pending")
    # Même limitation que le TOTP et les codes de secours, comptée par compte.
    await mfa_service.throttle(db, web, client, now)
    challenge = await _take_challenge(db, Purpose.VERIFICATION, now, session_id=web.session.id)
    try:
        if challenge is None:
            raise InvalidPasskey
        parsed = _parse_assertion(credential)
        passkey = await db.scalar(select(Passkey).where(Passkey.credential_id == parsed.raw_id,
                                                        Passkey.user_id == web.user.id).with_for_update())
        if passkey is None:
            raise InvalidPasskey
        _verify_assertion(rp, parsed, challenge, passkey, now)
    except InvalidPasskey:
        # Compté pour la limitation, pas pour le blocage du TOTP : une
        # signature ne se devine pas, ces échecs ne sont pas des essais de code.
        _event(db, AuthEventType.MFA_FAILED, client, now, user=web.user, detail="passkey")
        await db.commit()
        raise
    await mfa_service.complete_verification(db, web, client, now, "passkey")


# --- Connexion sans mot de passe ----------------------------------------------------

async def login_options(db: AsyncSession, rp: RelyingParty | None, client: Client, now: datetime) -> dict[str, Any]:
    """Options de navigator.credentials.get() sans compte désigné : le navigateur propose ses passkeys Luniqo."""
    rp = _rp(rp)
    pending, oldest = (await db.execute(
        select(func.count(), func.min(WebauthnChallenge.expires_at)).where(
            WebauthnChallenge.purpose == Purpose.LOGIN.value, WebauthnChallenge.ip == client.ip,
            WebauthnChallenge.expires_at > now)
    )).one()
    if pending >= policy.MAX_PENDING_LOGIN_CHALLENGES_PER_IP:
        raise TooManyAttempts(max(1, int((oldest - now).total_seconds())))
    challenge = await _new_challenge(db, Purpose.LOGIN, now, ip=client.ip)
    options = webauthn.generate_authentication_options(
        rp_id=rp.id, challenge=challenge, timeout=_timeout_ms(),
        user_verification=UserVerificationRequirement.REQUIRED,
    )
    return options_to_json_dict(options)


async def _login_throttle(db: AsyncSession, client: Client, now: datetime) -> None:
    """Échecs récents depuis cette adresse IP, mot de passe et passkey confondus (mêmes seuils que /login)."""
    count, last = (await db.execute(
        select(func.count(), func.max(AuthEvent.occurred_at)).where(
            AuthEvent.event == AuthEventType.LOGIN_FAILED.value, AuthEvent.ip == client.ip,
            AuthEvent.occurred_at >= now - auth_policy.FAILURE_WINDOW)
    )).one() if client.ip else (0, None)
    wait = auth_policy.retry_after(auth_policy.FailureStats(count, last), auth_policy.IP_THROTTLE, now)
    if wait:
        _event(db, AuthEventType.LOGIN_THROTTLED, client, now, detail="passkey")
        await db.commit()
        raise TooManyAttempts(wait)


async def login(db: AsyncSession, rp: RelyingParty | None, credential: dict[str, Any], client: Client,
                now: datetime, previous_token: str | None) -> LoginResult:
    """Ouvre une session complète avec une passkey : elle vaut les deux facteurs (ADR-004, décision 1)."""
    rp = _rp(rp)
    await _login_throttle(db, client, now)
    user: AppUser | None = None
    try:
        parsed = _parse_assertion(credential)
        try:
            challenge_sent = parse_client_data_json(parsed.response.client_data_json).challenge
        except _REJECTED:
            raise InvalidPasskey from None
        challenge = await _take_challenge(db, Purpose.LOGIN, now, challenge=challenge_sent)
        if challenge is None:
            raise InvalidPasskey
        row = (await db.execute(select(Passkey, AppUser).join(AppUser, AppUser.id == Passkey.user_id)
                                .where(Passkey.credential_id == parsed.raw_id).with_for_update(of=Passkey))).first()
        if row is None:
            raise InvalidPasskey
        passkey, user = row
        # La passkey renvoie l'identifiant du compte pour lequel elle a été créée.
        if parsed.response.user_handle is not None and parsed.response.user_handle != user.id.bytes:
            raise InvalidPasskey
        _verify_assertion(rp, parsed, challenge, passkey, now)
        if not user.is_active:
            raise InvalidPasskey
    except InvalidPasskey:
        detail = "passkey" if user is None or user.is_active else "inactive_account"
        _event(db, AuthEventType.LOGIN_FAILED, client, now, user=user, detail=detail)
        await db.commit()
        raise
    return await auth_service.open_session(SqlAuthRepository(db), user, client, now, previous_token=previous_token,
                                           mfa_verified=True, detail="passkey")
