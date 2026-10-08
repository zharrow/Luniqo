"""Entreprises, crèches et accès des employés aux crèches."""

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models import Base


class Enterprise(Base):
    """Compte commercial : une crèche indépendante ou un groupe de crèches."""

    __tablename__ = "enterprise"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    name: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    nurseries: Mapped[list["Nursery"]] = relationship(back_populates="enterprise")


class Nursery(Base):
    """Établissement physique. Les données opérationnelles lui sont rattachées."""

    __tablename__ = "nursery"
    __table_args__ = (
        CheckConstraint("capacity > 0", name="nursery_capacity_positive"),
        # Cible des clés étrangères composites de nursery_access.
        UniqueConstraint("id", "enterprise_id", name="uq_nursery_id_enterprise"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    enterprise_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("enterprise.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    address: Mapped[str | None] = mapped_column(String(255))
    postal_code: Mapped[str | None] = mapped_column(String(10))
    city: Mapped[str] = mapped_column(String(100))
    phone: Mapped[str | None] = mapped_column(String(20))
    email: Mapped[str | None] = mapped_column(String(254))
    capacity: Mapped[int] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    enterprise: Mapped[Enterprise] = relationship(back_populates="nurseries")


class NurseryAccess(Base):
    """Accès d'un employé à une crèche.

    L'entreprise est recopiée dans la ligne pour que la base elle-même refuse
    un accès entre deux entreprises : les deux clés étrangères composites
    imposent que l'employé et la crèche appartiennent à la même entreprise.
    """

    __tablename__ = "nursery_access"
    __table_args__ = (
        ForeignKeyConstraint(["user_id", "enterprise_id"], ["app_user.id", "app_user.enterprise_id"],
                             name="fk_nursery_access_user_enterprise", ondelete="CASCADE"),
        ForeignKeyConstraint(["nursery_id", "enterprise_id"], ["nursery.id", "nursery.enterprise_id"],
                             name="fk_nursery_access_nursery_enterprise", ondelete="CASCADE"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    nursery_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, index=True)
    enterprise_id: Mapped[uuid.UUID] = mapped_column()
    granted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    granted_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("app_user.id", ondelete="SET NULL"))
