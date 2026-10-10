"""Pièces d'une crèche, catalogue des tâches de l'entreprise, et tâches prévues dans chaque pièce.

Rien ne se supprime : une pièce, une tâche ou une affectation se désactive.
Les fiches remplies (LUN-77) y feront référence et doivent rester lisibles
lors d'un contrôle (LUN-78).

L'isolation est doublée en base : une affectation porte sa crèche et son
entreprise, et trois clés étrangères composites imposent que la pièce soit
dans cette crèche, la crèche dans cette entreprise, et la tâche dans le
catalogue de cette même entreprise.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    ARRAY,
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    SmallInteger,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models import Base


class Frequency(enum.StrEnum):
    DAILY = "daily"
    WEEKLY = "weekly"  # certains jours de la semaine
    MONTHLY = "monthly"  # le premier <jour> du mois


class Room(Base):
    __tablename__ = "room"
    __table_args__ = (
        UniqueConstraint("nursery_id", "name", name="uq_room_nursery_name"),
        # Cible de la clé composite de room_task : une affectation est dans la crèche de la pièce.
        UniqueConstraint("id", "nursery_id", name="uq_room_id_nursery"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    nursery_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("nursery.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(String(500))
    # Ordre de passage sur la fiche (plus petit d'abord), puis le nom.
    display_order: Mapped[int] = mapped_column(Integer, server_default=text("0"))
    is_active: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CleaningTask(Base):
    """Tâche du catalogue de l'entreprise (« Désinfecter le plan de change »), commune à ses crèches."""

    __tablename__ = "cleaning_task"
    __table_args__ = (
        UniqueConstraint("enterprise_id", "name", name="uq_cleaning_task_enterprise_name"),
        UniqueConstraint("id", "enterprise_id", name="uq_cleaning_task_id_enterprise"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    enterprise_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("enterprise.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(150))
    # Consigne : produit, dosage, méthode.
    instructions: Mapped[str | None] = mapped_column(String(1000))
    is_active: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


def _frequency_enum() -> Enum:
    return Enum(Frequency, name="cleaning_frequency", values_callable=lambda members: [m.value for m in members])


class RoomTask(Base):
    """Une tâche du catalogue prévue dans une pièce, avec sa fréquence (règles : app/cleaning/policy.py)."""

    __tablename__ = "room_task"
    __table_args__ = (
        ForeignKeyConstraint(["room_id", "nursery_id"], ["room.id", "room.nursery_id"],
                             name="fk_room_task_room_nursery", ondelete="CASCADE"),
        ForeignKeyConstraint(["nursery_id", "enterprise_id"], ["nursery.id", "nursery.enterprise_id"],
                             name="fk_room_task_nursery_enterprise", ondelete="CASCADE"),
        ForeignKeyConstraint(["task_id", "enterprise_id"], ["cleaning_task.id", "cleaning_task.enterprise_id"],
                             name="fk_room_task_task_enterprise", ondelete="CASCADE"),
        # Une tâche figure au plus une fois par pièce : on change sa fréquence, on ne la duplique pas.
        UniqueConstraint("room_id", "task_id", name="uq_room_task_room_task"),
        CheckConstraint("(frequency = 'daily') = (weekdays IS NULL)", name="room_task_daily_has_no_weekdays"),
        CheckConstraint("weekdays IS NULL OR (cardinality(weekdays) >= 1 "
                        "AND weekdays <@ ARRAY[1, 2, 3, 4, 5, 6, 7]::smallint[])",
                        name="room_task_weekdays_valid"),
        CheckConstraint("frequency <> 'monthly' OR cardinality(weekdays) = 1", name="room_task_monthly_one_weekday"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    room_id: Mapped[uuid.UUID] = mapped_column()
    task_id: Mapped[uuid.UUID] = mapped_column(index=True)
    nursery_id: Mapped[uuid.UUID] = mapped_column(index=True)
    enterprise_id: Mapped[uuid.UUID] = mapped_column()
    frequency: Mapped[Frequency] = mapped_column(_frequency_enum())
    weekdays: Mapped[list[int] | None] = mapped_column(ARRAY(SmallInteger))
    display_order: Mapped[int] = mapped_column(Integer, server_default=text("0"))
    is_active: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
