"""Invitation d'un employé à choisir son mot de passe."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, LargeBinary, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models import Base


class StaffInvitation(Base):
    """Lien à usage unique (7 jours) pour qu'un employé créé par la direction choisisse son mot de passe.

    Le compte existe dès l'invitation, sans mot de passe : la direction peut lui
    ouvrir l'accès à ses crèches tout de suite, et il ne peut pas se connecter
    avant d'avoir accepté. Seule l'empreinte SHA-256 du jeton est stockée ; une
    nouvelle invitation pour le même compte annule les précédentes.
    """

    __tablename__ = "staff_invitation"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    token_digest: Mapped[bytes] = mapped_column(LargeBinary(32), unique=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("app_user.id", ondelete="CASCADE"), index=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("app_user.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
