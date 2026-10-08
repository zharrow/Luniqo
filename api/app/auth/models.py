"""Tables de l'authentification : comptes, sessions, journal des événements."""

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Identity,
    Index,
    LargeBinary,
    String,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models import Base


class UserRole(enum.StrEnum):
    DEVELOPER = "developer"
    OWNER = "owner"
    EMPLOYEE = "employee"
    GUARDIAN = "guardian"


class AppUser(Base):
    """Compte de connexion. Le lien avec une entreprise ou une crèche arrive avec LUN-004."""

    __tablename__ = "app_user"
    __table_args__ = (CheckConstraint("email = lower(email)", name="app_user_email_lowercase"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    # Stockée en minuscules : l'unicité ne dépend pas de la casse saisie.
    email: Mapped[str] = mapped_column(String(254), unique=True)
    # Vide tant que la personne invitée n'a pas choisi son mot de passe.
    password_hash: Mapped[str | None] = mapped_column(String(255))
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", values_callable=lambda roles: [role.value for role in roles])
    )
    is_active: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    password_changed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class UserSession(Base):
    """Session ouverte. Seule l'empreinte SHA-256 du jeton est stockée."""

    __tablename__ = "user_session"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    token_digest: Mapped[bytes] = mapped_column(LargeBinary(32), unique=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("app_user.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    ip: Mapped[str | None] = mapped_column(String(45))
    user_agent: Mapped[str | None] = mapped_column(String(255))


class AuthEventType(enum.StrEnum):
    LOGIN_SUCCEEDED = "login_succeeded"
    LOGIN_FAILED = "login_failed"
    LOGIN_THROTTLED = "login_throttled"
    LOGOUT = "logout"
    SESSION_EXPIRED = "session_expired"
    SESSIONS_REVOKED = "sessions_revoked"


class AuthEvent(Base):
    """Journal des événements d'authentification. Jamais de mot de passe ni de jeton.

    Sert à la limitation des tentatives et, en phase 6, à la supervision.
    """

    __tablename__ = "auth_event"
    __table_args__ = (
        Index("ix_auth_event_email_occurred_at", "email", "occurred_at"),
        Index("ix_auth_event_ip_occurred_at", "ip", "occurred_at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    event: Mapped[str] = mapped_column(String(32))
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("app_user.id", ondelete="SET NULL"))
    # Adresse saisie, même si aucun compte ne lui correspond : nécessaire pour
    # limiter les tentatives par compte sans révéler s'il existe.
    email: Mapped[str | None] = mapped_column(String(254))
    ip: Mapped[str | None] = mapped_column(String(45))
    user_agent: Mapped[str | None] = mapped_column(String(255))
    detail: Mapped[str | None] = mapped_column(String(64))
