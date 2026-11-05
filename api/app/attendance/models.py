"""Présence d'un enfant : une arrivée, puis un départ. Corrections de la direction (LUN-120)."""

import enum
import uuid
from datetime import date, datetime

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    String,
    func,
    text,
)
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
    # Null pour une présence ajoutée par la direction (correction) : son auteur est dans le journal.
    arrival_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("app_user.id", ondelete="SET NULL"))
    dropped_off_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("guardian.id", ondelete="SET NULL"))
    departed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    departure_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("app_user.id", ondelete="SET NULL"))
    # Personne venue chercher l'enfant : un responsable autorisé pour cet enfant (vérifié au départ).
    picked_up_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("guardian.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CorrectionKind(enum.StrEnum):
    CREATED = "created"  # présence oubliée, ajoutée après coup
    MODIFIED = "modified"  # heure ou personne corrigée
    CANCELLED = "cancelled"  # présence pointée par erreur (mauvais enfant), retirée


class AttendanceCorrection(Base):
    """Une correction d'une présence par la direction : qui, quand, pourquoi, avant et après (LUN-120).

    Journal en ajout seulement : l'application n'y modifie ni n'y supprime rien,
    et la purge (LUN-54) n'y touche pas (pièce justificative de facturation).
    Une présence annulée est supprimée ; sa ligne de journal reste, rattachée à
    l'enfant (`attendance_id` passe à NULL). Les noms sont recopiés au moment
    de la correction, comme pour le ménage : supprimer un compte ou un
    responsable ne change pas l'historique.
    """

    __tablename__ = "attendance_correction"
    __table_args__ = (
        # Isolation doublée en base : l'enfant appartient bien à la crèche de la ligne.
        ForeignKeyConstraint(["child_id", "nursery_id"], ["child.id", "child.nursery_id"],
                             name="fk_attendance_correction_child_nursery", ondelete="CASCADE"),
        CheckConstraint("(kind = 'created') = (old_arrived_at IS NULL)", name="attendance_correction_old_values"),
        CheckConstraint("(kind = 'cancelled') = (new_arrived_at IS NULL)", name="attendance_correction_new_values"),
        CheckConstraint("char_length(reason) BETWEEN 5 AND 500", name="attendance_correction_reason_length"),
        Index("ix_attendance_correction_nursery_id_day", "nursery_id", "day"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    nursery_id: Mapped[uuid.UUID] = mapped_column()
    child_id: Mapped[uuid.UUID] = mapped_column()
    attendance_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("attendance.id", ondelete="SET NULL"),
                                                            index=True)
    child_name: Mapped[str] = mapped_column(String(201))
    # Jour de la présence corrigée (à Paris), pas celui de la correction.
    day: Mapped[date] = mapped_column(Date)
    kind: Mapped[CorrectionKind] = mapped_column(
        Enum(CorrectionKind, name="attendance_correction_kind",
             values_callable=lambda members: [member.value for member in members]))
    reason: Mapped[str] = mapped_column(String(500))
    corrected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    corrected_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("app_user.id", ondelete="SET NULL"))
    corrected_by_name: Mapped[str] = mapped_column(String(201))
    old_arrived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    old_departed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    old_dropped_off_by: Mapped[str | None] = mapped_column(String(201))
    old_picked_up_by: Mapped[str | None] = mapped_column(String(201))
    new_arrived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    new_departed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    new_dropped_off_by: Mapped[str | None] = mapped_column(String(201))
    new_picked_up_by: Mapped[str | None] = mapped_column(String(201))
