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
    Integer,
    LargeBinary,
    String,
    UniqueConstraint,
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
    """Compte de connexion.

    Direction (owner) et employés appartiennent à une entreprise ; l'éditeur
    (developer) et les familles (guardian) n'en ont pas. Les crèches
    accessibles à un employé sont dans nursery_access.
    """

    __tablename__ = "app_user"
    __table_args__ = (
        CheckConstraint("email = lower(email)", name="app_user_email_lowercase"),
        CheckConstraint("(role IN ('owner', 'employee')) = (enterprise_id IS NOT NULL)",
                        name="app_user_enterprise_matches_role"),
        # Cible de la clé étrangère composite de nursery_access.
        UniqueConstraint("id", "enterprise_id", name="uq_app_user_id_enterprise"),
    )

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
    enterprise_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("enterprise.id"), index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    password_changed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # PIN de la tablette (employés) : haché Argon2id, jamais renvoyé par l'API.
    # Bloqué après 3 échecs consécutifs (CNIL, secret court lié à un matériel).
    pin_hash: Mapped[str | None] = mapped_column(String(255))
    pin_failed_attempts: Mapped[int] = mapped_column(Integer, server_default=text("0"))
    pin_locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    @property
    def has_password(self) -> bool:
        """Faux pour un employé invité qui n'a pas encore choisi son mot de passe (LUN-55) : il ne peut se connecter."""
        return self.password_hash is not None


class SessionKind(enum.StrEnum):
    WEB = "web"
    # Session d'action ouverte par PIN sur une tablette : 2 minutes, une crèche,
    # gestes de terrain seulement. Refusée par toutes les routes de l'espace web.
    TABLET = "tablet"


class UserSession(Base):
    """Session ouverte. Seule l'empreinte SHA-256 du jeton est stockée."""

    __tablename__ = "user_session"
    __table_args__ = (
        CheckConstraint("kind IN ('web', 'tablet')", name="user_session_kind_valid"),
        CheckConstraint("(kind = 'tablet') = (tablet_id IS NOT NULL)", name="user_session_tablet_matches_kind"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    token_digest: Mapped[bytes] = mapped_column(LargeBinary(32), unique=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("app_user.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    ip: Mapped[str | None] = mapped_column(String(45))
    user_agent: Mapped[str | None] = mapped_column(String(255))
    kind: Mapped[str] = mapped_column(String(16), server_default=text("'web'"))
    tablet_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("tablet_device.id", ondelete="CASCADE"),
                                                       index=True)
    # Second facteur (ADR-004). Fixé à la connexion : vrai pour la direction et
    # l'éditeur, et pour tout compte qui a activé un facteur. Tant que
    # mfa_verified_at est vide, la session n'ouvre que /me, la déconnexion et
    # les routes du second facteur.
    mfa_required: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    mfa_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    @property
    def mfa_pending(self) -> bool:
        return self.mfa_required and self.mfa_verified_at is None


class AuthEventType(enum.StrEnum):
    LOGIN_SUCCEEDED = "login_succeeded"
    LOGIN_FAILED = "login_failed"
    LOGIN_THROTTLED = "login_throttled"
    LOGOUT = "logout"
    SESSION_EXPIRED = "session_expired"
    SESSIONS_REVOKED = "sessions_revoked"
    TABLET_ENROLLED = "tablet_enrolled"
    TABLET_REVOKED = "tablet_revoked"
    PIN_SET = "pin_set"
    PIN_SET_REFUSED = "pin_set_refused"
    PIN_SUCCEEDED = "pin_succeeded"
    PIN_FAILED = "pin_failed"
    PIN_LOCKED = "pin_locked"
    PIN_UNLOCKED = "pin_unlocked"
    PIN_THROTTLED = "pin_throttled"
    TABLET_SESSION_ENDED = "tablet_session_ended"
    INVITATION_CREATED = "invitation_created"
    INVITATION_ACCEPTED = "invitation_accepted"
    # Comptes (LUN-55). detail de l'échec : bad_password.
    PASSWORD_CHANGED = "password_changed"  # noqa: S105  (nom d'événement, pas un secret)
    PASSWORD_CHANGE_FAILED = "password_change_failed"  # noqa: S105
    ACCOUNT_DEACTIVATED = "account_deactivated"
    ACCOUNT_REACTIVATED = "account_reactivated"
    # Second facteur (ADR-004). detail : totp ou backup_code ; pour un échec,
    # aussi replay (code TOTP déjà utilisé) ou locked (TOTP bloqué).
    MFA_SUCCEEDED = "mfa_succeeded"
    MFA_FAILED = "mfa_failed"
    MFA_THROTTLED = "mfa_throttled"
    TOTP_ENABLED = "totp_enabled"
    TOTP_REMOVED = "totp_removed"
    BACKUP_CODES_GENERATED = "backup_codes_generated"


class AuthEvent(Base):
    """Journal des événements d'authentification. Jamais de mot de passe ni de jeton.

    Sert à la limitation des tentatives et, en phase 6, à la supervision.
    """

    __tablename__ = "auth_event"
    __table_args__ = (
        Index("ix_auth_event_email_occurred_at", "email", "occurred_at"),
        Index("ix_auth_event_ip_occurred_at", "ip", "occurred_at"),
        Index("ix_auth_event_tablet_id_occurred_at", "tablet_id", "occurred_at"),
        # Échecs du second facteur, comptés par compte.
        Index("ix_auth_event_user_id_occurred_at", "user_id", "occurred_at"),
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
    # Tablette d'où vient l'événement : les échecs de PIN sont aussi comptés par tablette.
    tablet_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("tablet_device.id", ondelete="SET NULL"))
