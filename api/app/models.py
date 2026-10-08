"""Modèle de données v2. Premier lot : entreprises et crèches."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, String, func, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Enterprise(Base):
    """Compte commercial : une crèche indépendante ou un groupe de crèches."""

    __tablename__ = "enterprise"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    name: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    nurseries: Mapped[list["Nursery"]] = relationship(back_populates="enterprise")


class Nursery(Base):
    """Établissement physique. Les données opérationnelles lui seront rattachées."""

    __tablename__ = "nursery"
    __table_args__ = (CheckConstraint("capacity > 0", name="nursery_capacity_positive"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    enterprise_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("enterprise.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    city: Mapped[str] = mapped_column(String(100))
    capacity: Mapped[int] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    enterprise: Mapped[Enterprise] = relationship(back_populates="nurseries")
