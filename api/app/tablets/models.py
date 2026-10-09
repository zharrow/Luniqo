"""Tablette partagée d'une crèche, enrôlée par la direction."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, ForeignKeyConstraint, LargeBinary, String, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models import Base


class TabletDevice(Base):
    """Appareil autorisé à ouvrir des sessions par PIN pour une seule crèche.

    Le jeton d'appareil (256 bits) vit dans un cookie de la tablette ; seule son
    empreinte SHA-256 est stockée. L'entreprise est recopiée pour qu'une clé
    étrangère composite impose la cohérence avec la crèche.
    """

    __tablename__ = "tablet_device"
    __table_args__ = (
        ForeignKeyConstraint(["nursery_id", "enterprise_id"], ["nursery.id", "nursery.enterprise_id"],
                             name="fk_tablet_device_nursery_enterprise", ondelete="CASCADE"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    nursery_id: Mapped[uuid.UUID] = mapped_column(index=True)
    enterprise_id: Mapped[uuid.UUID] = mapped_column()
    label: Mapped[str] = mapped_column(String(100))
    token_digest: Mapped[bytes] = mapped_column(LargeBinary(32), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("app_user.id", ondelete="SET NULL"))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
