"""Fiche de ménage : tâches cochées depuis la tablette (LUN-77)

Revision ID: 0010
Revises: 0009
Create Date: 2026-10-10
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0010"
down_revision: str | None = "0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_unique_constraint("uq_room_task_id_nursery", "room_task", ["id", "nursery_id"])
    op.create_table(
        "cleaning_check",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("room_task_id", sa.Uuid(), nullable=False),
        sa.Column("nursery_id", sa.Uuid(), nullable=False),
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("room_name", sa.String(100), nullable=False),
        sa.Column("task_name", sa.String(150), nullable=False),
        sa.Column("done_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("done_by", sa.Uuid(), sa.ForeignKey("app_user.id", ondelete="SET NULL"), nullable=True),
        sa.Column("done_by_name", sa.String(201), nullable=False),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelled_by", sa.Uuid(), sa.ForeignKey("app_user.id", ondelete="SET NULL"), nullable=True),
        sa.Column("cancelled_by_name", sa.String(201), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["room_task_id", "nursery_id"], ["room_task.id", "room_task.nursery_id"],
                                name="fk_cleaning_check_room_task_nursery", ondelete="CASCADE"),
        sa.CheckConstraint("cancelled_at IS NULL OR cancelled_at >= done_at", name="cleaning_check_cancel_after_done"),
        sa.CheckConstraint("(cancelled_at IS NULL) = (cancelled_by_name IS NULL)",
                           name="cleaning_check_cancel_has_author"),
    )
    op.create_index("ix_cleaning_check_nursery_id_day", "cleaning_check", ["nursery_id", "day"])
    op.create_index("uq_cleaning_check_one_per_day", "cleaning_check", ["room_task_id", "day"], unique=True,
                    postgresql_where=sa.text("cancelled_at IS NULL"))


def downgrade() -> None:
    op.drop_index("uq_cleaning_check_one_per_day", table_name="cleaning_check")
    op.drop_index("ix_cleaning_check_nursery_id_day", table_name="cleaning_check")
    op.drop_table("cleaning_check")
    op.drop_constraint("uq_room_task_id_nursery", "room_task", type_="unique")
