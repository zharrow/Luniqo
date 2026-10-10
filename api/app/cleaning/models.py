"""Pièces d'une crèche, catalogue des tâches de l'entreprise, tâches prévues dans chaque pièce, et tâches cochées.

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
from datetime import date, datetime

from sqlalchemy import (
    ARRAY,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
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
        # Cible de la clé composite de cleaning_check : une tâche se coche dans sa crèche.
        UniqueConstraint("id", "nursery_id", name="uq_room_task_id_nursery"),
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


class CleaningCheck(Base):
    """Une tâche cochée un jour donné : la ligne de la fiche papier (LUN-77).

    L'heure et l'auteur sont fixés par le serveur. Les noms de la pièce, de la
    tâche et de l'auteur sont recopiés au moment de la coche : renommer le
    catalogue ou supprimer un compte ne change pas une fiche déjà remplie.
    Décocher ne supprime rien : la ligne est annulée (qui, quand) et reste
    lisible ; une seule coche non annulée par tâche et par jour (index unique partiel).
    """

    __tablename__ = "cleaning_check"
    __table_args__ = (
        ForeignKeyConstraint(["room_task_id", "nursery_id"], ["room_task.id", "room_task.nursery_id"],
                             name="fk_cleaning_check_room_task_nursery", ondelete="CASCADE"),
        CheckConstraint("cancelled_at IS NULL OR cancelled_at >= done_at", name="cleaning_check_cancel_after_done"),
        CheckConstraint("(cancelled_at IS NULL) = (cancelled_by_name IS NULL)",
                        name="cleaning_check_cancel_has_author"),
        Index("ix_cleaning_check_nursery_id_day", "nursery_id", "day"),
        Index("uq_cleaning_check_one_per_day", "room_task_id", "day", unique=True,
              postgresql_where=text("cancelled_at IS NULL")),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    room_task_id: Mapped[uuid.UUID] = mapped_column()
    nursery_id: Mapped[uuid.UUID] = mapped_column()
    # Jour de la fiche en heure de Paris (une coche à 0 h 30 compte pour ce jour-là).
    day: Mapped[date] = mapped_column(Date)
    room_name: Mapped[str] = mapped_column(String(100))
    task_name: Mapped[str] = mapped_column(String(150))
    done_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    done_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("app_user.id", ondelete="SET NULL"))
    done_by_name: Mapped[str] = mapped_column(String(201))
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancelled_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("app_user.id", ondelete="SET NULL"))
    cancelled_by_name: Mapped[str | None] = mapped_column(String(201))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
