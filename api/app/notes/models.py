"""Transmissions de la journée sur un enfant (LUN-146)."""

import uuid
from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, ForeignKeyConstraint, Index, String, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models import Base


class ChildNote(Base):
    """Une transmission : ce qu'une employée note sur un enfant pour celle qui prend le relais.

    Jour, heure et auteur sont fixés par le serveur. Le nom de l'auteur est
    recopié au moment de l'écriture : supprimer son compte ne change pas
    l'historique. Pas de donnée de santé (allergies, traitements) : LUN-57.
    Ni modification ni suppression par l'application (hors périmètre de LUN-146) ;
    durée de conservation à décider avec la purge RGPD (LUN-54).
    """

    __tablename__ = "child_note"
    __table_args__ = (
        # Isolation doublée en base : l'enfant appartient bien à la crèche de la transmission.
        ForeignKeyConstraint(["child_id", "nursery_id"], ["child.id", "child.nursery_id"],
                             name="fk_child_note_child_nursery", ondelete="CASCADE"),
        CheckConstraint("char_length(btrim(text)) BETWEEN 1 AND 500", name="child_note_text_length"),
        Index("ix_child_note_nursery_id_day", "nursery_id", "day"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    nursery_id: Mapped[uuid.UUID] = mapped_column()
    child_id: Mapped[uuid.UUID] = mapped_column()
    # Jour de l'écriture, à Paris (CLAUDE.md, règle 3).
    day: Mapped[date] = mapped_column(Date)
    text: Mapped[str] = mapped_column(String(500))
    author_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("app_user.id", ondelete="SET NULL"))
    author_name: Mapped[str] = mapped_column(String(201))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
