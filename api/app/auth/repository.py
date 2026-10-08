"""Accès aux données de l'authentification.

Le service ne parle à la base qu'à travers ce contrat : les tests unitaires
lui substituent une implémentation en mémoire (tests/auth/fakes.py).
"""

import uuid
from datetime import datetime
from typing import Protocol

from sqlalchemy import delete, false, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import AppUser, AuthEvent, AuthEventType, UserSession
from app.auth.policy import FailureStats


class AuthRepository(Protocol):
    async def get_user_by_email(self, email: str) -> AppUser | None: ...
    async def get_session(self, token_digest: bytes) -> tuple[UserSession, AppUser] | None: ...
    def add_session(self, session: UserSession) -> None: ...
    async def delete_session(self, token_digest: bytes) -> UserSession | None: ...
    async def delete_user_sessions(self, user_id: uuid.UUID) -> int: ...
    def add_event(self, event: AuthEvent) -> None: ...
    async def login_failures(
        self, *, email: str, ip: str | None, since: datetime
    ) -> tuple[FailureStats, FailureStats]: ...
    async def commit(self) -> None: ...


class SqlAuthRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_user_by_email(self, email: str) -> AppUser | None:
        return await self.session.scalar(select(AppUser).where(AppUser.email == email))

    async def get_session(self, token_digest: bytes) -> tuple[UserSession, AppUser] | None:
        row = (
            await self.session.execute(
                select(UserSession, AppUser)
                .join(AppUser, AppUser.id == UserSession.user_id)
                .where(UserSession.token_digest == token_digest)
            )
        ).first()
        return (row[0], row[1]) if row else None

    def add_session(self, session: UserSession) -> None:
        self.session.add(session)

    async def delete_session(self, token_digest: bytes) -> UserSession | None:
        return await self.session.scalar(
            delete(UserSession).where(UserSession.token_digest == token_digest).returning(UserSession)
        )

    async def delete_user_sessions(self, user_id: uuid.UUID) -> int:
        result = await self.session.execute(delete(UserSession).where(UserSession.user_id == user_id))
        return result.rowcount

    def add_event(self, event: AuthEvent) -> None:
        self.session.add(event)

    async def login_failures(self, *, email: str, ip: str | None, since: datetime) -> tuple[FailureStats, FailureStats]:
        """Échecs récents pour cette adresse e-mail, puis pour cette adresse IP."""
        failed = (AuthEvent.event == AuthEventType.LOGIN_FAILED.value) & (AuthEvent.occurred_at >= since)
        by_email = AuthEvent.email == email
        by_ip = AuthEvent.ip == ip if ip else false()
        # Une seule requête, servie par les index (email, occurred_at) et (ip, occurred_at).
        statement = select(
            func.count().filter(by_email),
            func.max(AuthEvent.occurred_at).filter(by_email),
            func.count().filter(by_ip),
            func.max(AuthEvent.occurred_at).filter(by_ip),
        ).where(failed, or_(by_email, by_ip))
        email_count, email_last, ip_count, ip_last = (await self.session.execute(statement)).one()
        return FailureStats(email_count, email_last), FailureStats(ip_count, ip_last)

    async def commit(self) -> None:
        await self.session.commit()
