"""Tables des passkeys : clés publiques enregistrées, défis WebAuthn en attente."""

import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    LargeBinary,
    String,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models import Base


class Passkey(Base):
    """Passkey d'un compte : seule sa clé publique est stockée.

    La biométrie ou le code de l'appareil ne quittent jamais l'appareil ;
    Luniqo ne reçoit qu'une signature (ADR-004, aucune donnée biométrique).
    """

    __tablename__ = "passkey"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("app_user.id", ondelete="CASCADE"), index=True)
    # Identifiant choisi par l'authentificateur (1023 octets au plus selon WebAuthn).
    # Unique : une même passkey ne peut appartenir à deux comptes.
    credential_id: Mapped[bytes] = mapped_column(LargeBinary(1023), unique=True)
    # Clé publique au format COSE, telle que renvoyée à l'enregistrement.
    public_key: Mapped[bytes] = mapped_column(LargeBinary)
    # Compteur de signatures : une valeur qui ne croît pas trahit une passkey
    # clonée. Les passkeys synchronisées renvoient toujours 0.
    sign_count: Mapped[int] = mapped_column(BigInteger, server_default=text("0"))
    # Nom donné par la personne (« iPhone de Camille »).
    name: Mapped[str] = mapped_column(String(64))
    # Modèle d'authentificateur (AAGUID), sans donnée personnelle ; zéros si inconnu.
    aaguid: Mapped[str] = mapped_column(String(36))
    # Passkey sauvegardée ou synchronisée (trousseau iCloud, Google…).
    backed_up: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class WebauthnChallenge(Base):
    """Défi envoyé au navigateur, à usage unique, supprimé dès sa première présentation.

    - registration et verification : liés à la session web qui les a demandés ;
    - login : connexion sans mot de passe, sans session ni compte connu à
      l'avance ; l'adresse IP sert à limiter les défis en attente.
    """

    __tablename__ = "webauthn_challenge"
    __table_args__ = (
        CheckConstraint("purpose IN ('registration', 'verification', 'login')", name="webauthn_challenge_purpose"),
        CheckConstraint("(purpose = 'login') = (session_id IS NULL)", name="webauthn_challenge_session_matches"),
        # Au plus un défi en attente par session et par usage.
        Index("uq_webauthn_challenge_session_purpose", "session_id", "purpose", unique=True,
              postgresql_where=text("session_id IS NOT NULL")),
        Index("ix_webauthn_challenge_ip_expires_at", "ip", "expires_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    challenge: Mapped[bytes] = mapped_column(LargeBinary(32), unique=True)
    purpose: Mapped[str] = mapped_column(String(16))
    session_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("user_session.id", ondelete="CASCADE"))
    ip: Mapped[str | None] = mapped_column(String(45))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
