"""Présence d'un enfant : une arrivée, puis un départ."""

import uuid
from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, ForeignKeyConstraint, Index, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models import Base


class Attendance(Base):
    """Une présence : de l'arrivée au départ. Plusieurs par jour possibles (retour après un rendez-vous).

    Une seule présence ouverte (sans départ) par enfant : index unique partiel.
    Aucune donnée de santé (température, médicaments) : LUN-019.
    """

    __tablename__ = "attendance"
    __table_args__ = (
        ForeignKeyConstraint(["child_id", "nursery_id"], ["child.id", "child.nursery_id"],
                             name="fk_attendance_child_nursery", ondelete="CASCADE"),
        CheckConstraint("departed_at IS NULL OR departed_at >= arrived_at", name="attendance_departure_after_arrival"),
        CheckConstraint("departed_at IS NOT NULL OR picked_up_by IS NULL", name="attendance_pickup_only_on_departure"),
        Index("ix_attendance_nursery_id_day", "nursery_id", "day"),
        Index("uq_attendance_one_open_per_child", "child_id", unique=True,
              postgresql_where=text("departed_at IS NULL")),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    child_id: Mapped[uuid.UUID] = mapped_column(index=True)
    nursery_id: Mapped[uuid.UUID] = mapped_column()
    # Jour de l'arrivée en heure de Paris (une arrivée à 0 h 30 compte pour ce jour-là, pas la veille en UTC).
    day: Mapped[date] = mapped_column(Date)
    arrived_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    arrival_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("app_user.id", ondelete="SET NULL"))
    dropped_off_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("guardian.id", ondelete="SET NULL"))
    departed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    departure_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("app_user.id", ondelete="SET NULL"))
    # Personne venue chercher l'enfant : un responsable autorisé pour cet enfant (vérifié au départ).
    picked_up_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("guardian.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
