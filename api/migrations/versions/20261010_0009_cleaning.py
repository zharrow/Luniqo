"""Fiche de ménage : pièces, catalogue des tâches, tâches prévues par pièce (LUN-76)

Revision ID: 0009
Revises: 0008
Create Date: 2026-10-10
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0009"
down_revision: str | None = "0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

frequency = sa.Enum("daily", "weekly", "monthly", name="cleaning_frequency")


def _uuid_pk() -> sa.Column:
    return sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), primary_key=True)


def _flags() -> list[sa.Column]:
    return [
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    ]


def upgrade() -> None:
    op.create_table(
        "room",
        _uuid_pk(),
        sa.Column("nursery_id", sa.Uuid(), sa.ForeignKey("nursery.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("display_order", sa.Integer(), server_default=sa.text("0"), nullable=False),
        *_flags(),
        sa.UniqueConstraint("nursery_id", "name", name="uq_room_nursery_name"),
        sa.UniqueConstraint("id", "nursery_id", name="uq_room_id_nursery"),
    )

    op.create_table(
        "cleaning_task",
        _uuid_pk(),
        sa.Column("enterprise_id", sa.Uuid(), sa.ForeignKey("enterprise.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("instructions", sa.String(1000), nullable=True),
        *_flags(),
        sa.UniqueConstraint("enterprise_id", "name", name="uq_cleaning_task_enterprise_name"),
        sa.UniqueConstraint("id", "enterprise_id", name="uq_cleaning_task_id_enterprise"),
    )

    op.create_table(
        "room_task",
        _uuid_pk(),
        sa.Column("room_id", sa.Uuid(), nullable=False),
        sa.Column("task_id", sa.Uuid(), nullable=False),
        sa.Column("nursery_id", sa.Uuid(), nullable=False),
        sa.Column("enterprise_id", sa.Uuid(), nullable=False),
        sa.Column("frequency", frequency, nullable=False),
        sa.Column("weekdays", sa.ARRAY(sa.SmallInteger()), nullable=True),
        sa.Column("display_order", sa.Integer(), server_default=sa.text("0"), nullable=False),
        *_flags(),
        sa.ForeignKeyConstraint(["room_id", "nursery_id"], ["room.id", "room.nursery_id"],
                                name="fk_room_task_room_nursery", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["nursery_id", "enterprise_id"], ["nursery.id", "nursery.enterprise_id"],
                                name="fk_room_task_nursery_enterprise", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["task_id", "enterprise_id"], ["cleaning_task.id", "cleaning_task.enterprise_id"],
                                name="fk_room_task_task_enterprise", ondelete="CASCADE"),
        sa.UniqueConstraint("room_id", "task_id", name="uq_room_task_room_task"),
        sa.CheckConstraint("(frequency = 'daily') = (weekdays IS NULL)", name="room_task_daily_has_no_weekdays"),
        sa.CheckConstraint("weekdays IS NULL OR (cardinality(weekdays) >= 1 "
                           "AND weekdays <@ ARRAY[1, 2, 3, 4, 5, 6, 7]::smallint[])",
                           name="room_task_weekdays_valid"),
        sa.CheckConstraint("frequency <> 'monthly' OR cardinality(weekdays) = 1",
                           name="room_task_monthly_one_weekday"),
    )
    op.create_index("ix_room_task_task_id", "room_task", ["task_id"])
    op.create_index("ix_room_task_nursery_id", "room_task", ["nursery_id"])


def downgrade() -> None:
    op.drop_index("ix_room_task_nursery_id", table_name="room_task")
    op.drop_index("ix_room_task_task_id", table_name="room_task")
    op.drop_table("room_task")
    op.drop_table("cleaning_task")
    op.drop_table("room")
    frequency.drop(op.get_bind())
