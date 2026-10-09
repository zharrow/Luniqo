"""Familles, enfants, responsables et liens enfant ↔ responsable.

Chaque table porte sa crèche (et la famille pour les liens) : des clés
étrangères composites imposent en base qu'un enfant et ses responsables
appartiennent à la même famille, et une famille à une seule crèche.

Aucune donnée de santé ici (allergies, PAI, notes médicales) : elles
attendent l'analyse RGPD / hébergement de données de santé (LUN-019).
"""

import enum
import uuid
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    ForeignKeyConstraint,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models import Base


class ChildStatus(enum.StrEnum):
    ADAPTATION = "adaptation"  # période d'adaptation, avant l'accueil régulier
    ACTIVE = "active"
    SUSPENDED = "suspended"
    DEPARTED = "departed"


class Relationship(enum.StrEnum):
    PARENT = "parent"
    LEGAL_GUARDIAN = "legal_guardian"  # tuteur ou tutrice désigné(e)
    OTHER = "other"  # grand-parent, assistant(e) familial(e)…


def _enum(kind: type[enum.StrEnum], name: str) -> Enum:
    return Enum(kind, name=name, values_callable=lambda members: [member.value for member in members])


class Family(Base):
    __tablename__ = "family"
    __table_args__ = (UniqueConstraint("id", "nursery_id", name="uq_family_id_nursery"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    nursery_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("nursery.id", ondelete="CASCADE"), index=True)
    # Nom d'usage du foyer (« Famille Martin-Durand »), pour s'y retrouver.
    label: Mapped[str] = mapped_column(String(255))
    address: Mapped[str | None] = mapped_column(String(255))
    postal_code: Mapped[str | None] = mapped_column(String(10))
    city: Mapped[str | None] = mapped_column(String(100))
    is_active: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Child(Base):
    __tablename__ = "child"
    __table_args__ = (
        ForeignKeyConstraint(["family_id", "nursery_id"], ["family.id", "family.nursery_id"],
                             name="fk_child_family_nursery", ondelete="CASCADE"),
        UniqueConstraint("id", "family_id", name="uq_child_id_family"),
        # Cible de la clé composite de attendance : une présence est dans la crèche de l'enfant.
        UniqueConstraint("id", "nursery_id", name="uq_child_id_nursery"),
        CheckConstraint("enrollment_date >= birth_date", name="child_enrolled_after_birth"),
        CheckConstraint("exit_date IS NULL OR exit_date >= enrollment_date", name="child_exit_after_enrollment"),
        CheckConstraint("(status = 'departed') = (exit_date IS NOT NULL)", name="child_departed_has_exit_date"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    family_id: Mapped[uuid.UUID] = mapped_column(index=True)
    nursery_id: Mapped[uuid.UUID] = mapped_column(index=True)
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    birth_date: Mapped[date] = mapped_column(Date)
    status: Mapped[ChildStatus] = mapped_column(_enum(ChildStatus, "child_status"))
    enrollment_date: Mapped[date] = mapped_column(Date)
    exit_date: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Guardian(Base):
    """Responsable ou contact d'une famille. Compte de connexion facultatif (consultation famille : LUN-011)."""

    __tablename__ = "guardian"
    __table_args__ = (
        ForeignKeyConstraint(["family_id", "nursery_id"], ["family.id", "family.nursery_id"],
                             name="fk_guardian_family_nursery", ondelete="CASCADE"),
        UniqueConstraint("id", "family_id", name="uq_guardian_id_family"),
        CheckConstraint("email IS NULL OR email = lower(email)", name="guardian_email_lowercase"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    family_id: Mapped[uuid.UUID] = mapped_column(index=True)
    nursery_id: Mapped[uuid.UUID] = mapped_column(index=True)
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str | None] = mapped_column(String(254))
    phone: Mapped[str | None] = mapped_column(String(20))
    # Compte du parent (LUN-011). Un même compte peut porter plusieurs fiches : enfants dans deux crèches,
    # familles recomposées.
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("app_user.id", ondelete="SET NULL"), index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ChildGuardian(Base):
    """Lien entre un enfant et un responsable de la même famille, avec ses autorisations."""

    __tablename__ = "child_guardian"
    __table_args__ = (
        ForeignKeyConstraint(["child_id", "family_id"], ["child.id", "child.family_id"],
                             name="fk_child_guardian_child_family", ondelete="CASCADE"),
        ForeignKeyConstraint(["guardian_id", "family_id"], ["guardian.id", "guardian.family_id"],
                             name="fk_child_guardian_guardian_family", ondelete="CASCADE"),
    )

    child_id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    guardian_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, index=True)
    family_id: Mapped[uuid.UUID] = mapped_column()
    relationship: Mapped[Relationship] = mapped_column(_enum(Relationship, "guardian_relationship"))
    has_parental_authority: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    # Peut venir chercher l'enfant : vérifié au départ (pointage, LUN-010).
    is_authorized_pickup: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    is_emergency_contact: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
