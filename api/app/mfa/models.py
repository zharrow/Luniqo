"""Tables du second facteur : secret TOTP chiffré, codes de secours hachés."""

import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Index, Integer, LargeBinary, String, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models import Base


class TotpFactor(Base):
    """Application d'authentification d'un compte.

    Le secret n'est jamais stocké en clair : chiffré en AES-256-GCM avec la clé
    MFA_KEY, lié au compte (crypto.py). Une ligne sans `confirmed_at` est une
    activation commencée, pas encore prouvée par un premier code. Un compte a
    au plus un TOTP confirmé et une activation en cours : changer de
    téléphone se fait sans retirer l'ancien facteur d'abord.
    """

    __tablename__ = "totp_factor"
    __table_args__ = (
        Index("uq_totp_factor_user_confirmed", "user_id", unique=True,
              postgresql_where=text("confirmed_at IS NOT NULL")),
        Index("uq_totp_factor_user_pending", "user_id", unique=True,
              postgresql_where=text("confirmed_at IS NULL")),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("app_user.id", ondelete="CASCADE"))
    secret_ciphertext: Mapped[bytes] = mapped_column(LargeBinary)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Dernier pas de 30 s accepté : un code de ce pas ou d'un pas antérieur est
    # refusé (rejeu d'un code intercepté).
    last_used_step: Mapped[int | None] = mapped_column(BigInteger)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Échecs du second facteur depuis la dernière réussite (TOTP ou code de
    # secours) : au 100e, le TOTP est bloqué. Compté ici plutôt que dans
    # auth_event, que la purge vide au-delà de 6 mois (LUN-54) : des échecs
    # étalés sur plus de 6 mois restent consécutifs (NIST SP 800-63B-4).
    failed_attempts: Mapped[int] = mapped_column(Integer, server_default=text("0"))


class BackupCode(Base):
    """Code de secours à usage unique.

    `lookup` (4 premiers caractères, en clair) retrouve le code sans vérifier
    les dix hachés un par un ; le reste du code est haché en Argon2id.
    """

    __tablename__ = "backup_code"
    __table_args__ = (Index("ix_backup_code_user_id_lookup", "user_id", "lookup"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("app_user.id", ondelete="CASCADE"))
    lookup: Mapped[str] = mapped_column(String(4))
    code_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
