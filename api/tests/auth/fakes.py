"""Dépôt d'authentification en mémoire, conforme au contrat AuthRepository."""

import uuid
from datetime import datetime

from app.auth.models import AppUser, AuthEvent, AuthEventType, UserSession
from app.auth.policy import FailureStats


class InMemoryAuthRepository:
    def __init__(self) -> None:
        self.users: dict[str, AppUser] = {}
        self.sessions: dict[bytes, UserSession] = {}
        self.events: list[AuthEvent] = []
        self.commits = 0
        # Comptes qui ont un second facteur confirmé (son contenu est testé sur PostgreSQL).
        self.with_factor: set[uuid.UUID] = set()

    def add_user(self, user: AppUser) -> AppUser:
        self.users[user.email] = user
        return user

    def events_of(self, kind: AuthEventType) -> list[AuthEvent]:
        return [event for event in self.events if event.event == kind.value]

    async def get_user_by_email(self, email: str) -> AppUser | None:
        return self.users.get(email)

    async def has_second_factor(self, user_id: uuid.UUID) -> bool:
        return user_id in self.with_factor

    def complete_second_factor(self, token_digest: bytes, now: datetime) -> None:
        """Raccourci de test : la session a présenté son second facteur (parcours testé dans test_mfa_db.py)."""
        self.sessions[token_digest].mfa_verified_at = now

    async def get_session(self, token_digest: bytes) -> tuple[UserSession, AppUser] | None:
        session = self.sessions.get(token_digest)
        if session is None:
            return None
        user = next(user for user in self.users.values() if user.id == session.user_id)
        return session, user

    def add_session(self, session: UserSession) -> None:
        session.id = session.id or uuid.uuid4()
        self.sessions[session.token_digest] = session

    async def delete_session(self, token_digest: bytes) -> UserSession | None:
        return self.sessions.pop(token_digest, None)

    async def delete_user_sessions(self, user_id: uuid.UUID, *, keep: uuid.UUID | None = None) -> int:
        doomed = [digest for digest, session in self.sessions.items()
                  if session.user_id == user_id and session.id != keep]
        for digest in doomed:
            del self.sessions[digest]
        return len(doomed)

    def add_event(self, event: AuthEvent) -> None:
        self.events.append(event)

    async def login_failures(self, *, email: str, ip: str | None, since: datetime) -> tuple[FailureStats, FailureStats]:
        failures = [event for event in self.events_of(AuthEventType.LOGIN_FAILED) if event.occurred_at >= since]

        def stats(matching: list[AuthEvent]) -> FailureStats:
            return FailureStats(len(matching), max((event.occurred_at for event in matching), default=None))

        return (stats([event for event in failures if event.email == email]),
                stats([event for event in failures if ip and event.ip == ip]))

    async def commit(self) -> None:
        self.commits += 1
