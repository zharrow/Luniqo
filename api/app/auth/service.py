"""Cas d'usage de l'authentification : connexion, vérification de session, déconnexion."""

import uuid
from dataclasses import dataclass
from datetime import datetime

from app.auth import passwords, policy
from app.auth.models import AppUser, AuthEvent, AuthEventType, SessionKind, UserSession
from app.auth.repository import AuthRepository
from app.auth.tokens import new_token, token_digest


class InvalidCredentials(Exception):
    """Adresse inconnue, mot de passe faux ou compte désactivé : une seule erreur pour les trois."""


class TooManyAttempts(Exception):
    def __init__(self, retry_after: int) -> None:
        super().__init__(f"réessayer dans {retry_after} s")
        self.retry_after = retry_after


@dataclass(frozen=True)
class Client:
    """Origine d'une requête, consignée dans les sessions et le journal."""

    ip: str | None
    user_agent: str | None

    def __post_init__(self) -> None:
        # Tronqués à la taille des colonnes : l'agent utilisateur est fourni par le client.
        object.__setattr__(self, "ip", self.ip[:45] if self.ip else None)
        object.__setattr__(self, "user_agent", self.user_agent[:255] if self.user_agent else None)


@dataclass(frozen=True)
class LoginResult:
    user: AppUser
    token: str


def normalize_email(email: str) -> str:
    return email.strip().lower()


def _event(kind: AuthEventType, client: Client, now: datetime, *, user_id: uuid.UUID | None = None,
           email: str | None = None, detail: str | None = None) -> AuthEvent:
    return AuthEvent(occurred_at=now, event=kind.value, user_id=user_id, email=email,
                     ip=client.ip, user_agent=client.user_agent, detail=detail)


async def login(repo: AuthRepository, email: str, password: str, client: Client, now: datetime,
                previous_token: str | None = None) -> LoginResult:
    email = normalize_email(email)

    by_email, by_ip = await repo.login_failures(email=email, ip=client.ip, since=now - policy.FAILURE_WINDOW)
    wait = max(policy.retry_after(by_email, policy.ACCOUNT_THROTTLE, now),
               policy.retry_after(by_ip, policy.IP_THROTTLE, now))
    if wait:
        # Refusée sans vérifier le mot de passe, et non comptée comme un
        # échec : insister pendant le blocage ne le prolonge pas.
        repo.add_event(_event(AuthEventType.LOGIN_THROTTLED, client, now, email=email))
        await repo.commit()
        raise TooManyAttempts(wait)

    user = await repo.get_user_by_email(email)
    valid, needs_rehash = await passwords.verify_password(user.password_hash if user else None, password)
    if not valid or user is None or not user.is_active:
        detail = "unknown_account" if user is None else "bad_password" if not valid else "inactive_account"
        repo.add_event(_event(AuthEventType.LOGIN_FAILED, client, now,
                              user_id=user.id if user else None, email=email, detail=detail))
        await repo.commit()
        raise InvalidCredentials

    if needs_rehash:
        user.password_hash = await passwords.hash_password(password)

    # Nouveau jeton à chaque connexion ; l'éventuelle session précédente du
    # navigateur est supprimée (pas de fixation de session).
    if previous_token:
        await repo.delete_session(token_digest(previous_token))
    token = new_token()
    repo.add_session(UserSession(token_digest=token_digest(token), user_id=user.id, created_at=now,
                                 last_seen_at=now, ip=client.ip, user_agent=client.user_agent,
                                 kind=SessionKind.WEB.value))
    repo.add_event(_event(AuthEventType.LOGIN_SUCCEEDED, client, now, user_id=user.id, email=email))
    await repo.commit()
    return LoginResult(user=user, token=token)


async def authenticate(repo: AuthRepository, token: str, client: Client, now: datetime) -> AppUser | None:
    """Utilisateur de la session portée par ce jeton, ou None si elle n'est pas (ou plus) valable."""
    found = await repo.get_session(token_digest(token))
    if found is None:
        return None
    session, user = found
    if session.kind != SessionKind.WEB.value:
        # Jeton d'une session de tablette présenté comme session web : refusé,
        # la session d'action ne donne jamais accès à l'espace web.
        return None
    if not user.is_active or policy.session_expired(session.created_at, session.last_seen_at, now):
        await repo.delete_session(session.token_digest)
        repo.add_event(_event(AuthEventType.SESSION_EXPIRED, client, now, user_id=user.id,
                              detail=None if user.is_active else "inactive_account"))
        await repo.commit()
        return None
    if policy.needs_touch(session.last_seen_at, now):
        session.last_seen_at = now
        await repo.commit()
    return user


async def logout(repo: AuthRepository, token: str, client: Client, now: datetime) -> None:
    session = await repo.delete_session(token_digest(token))
    if session is not None:
        repo.add_event(_event(AuthEventType.LOGOUT, client, now, user_id=session.user_id))
    await repo.commit()


async def revoke_all_sessions(repo: AuthRepository, user_id: uuid.UUID, client: Client, now: datetime,
                              reason: str) -> int:
    """À appeler au changement de mot de passe ou à la désactivation d'un compte (ADR-003)."""
    count = await repo.delete_user_sessions(user_id)
    repo.add_event(_event(AuthEventType.SESSIONS_REVOKED, client, now, user_id=user_id, detail=reason))
    await repo.commit()
    return count
