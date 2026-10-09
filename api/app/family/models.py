"""Invitation d'un responsable à créer son compte famille."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, LargeBinary, String, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models import Base


class Invitation(Base):
    """Lien à usage unique (7 jours) pour qu'un responsable crée son compte ou relie un compte existant.

    Seule l'empreinte SHA-256 du jeton est stockée. Une nouvelle invitation
    pour le même responsable annule les précédentes.
    """

    __tablename__ = "invitation"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    token_digest: Mapped[bytes] = mapped_column(LargeBinary(32), unique=True)
    guardian_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("guardian.id", ondelete="CASCADE"), index=True)
    # Adresse au moment de l'invitation : le compte sera créé avec elle.
    email: Mapped[str] = mapped_column(String(254))
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("app_user.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
