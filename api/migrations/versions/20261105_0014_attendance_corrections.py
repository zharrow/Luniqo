"""Corrections des présences par la direction (LUN-120)

Revision ID: 0014
Revises: 0013
Create Date: 2026-11-05
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0014"
down_revision: str | None = "0013"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

correction_kind = sa.Enum("created", "modified", "cancelled", name="attendance_correction_kind")


def upgrade() -> None:
    op.create_table(
        "attendance_correction",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("nursery_id", sa.Uuid(), nullable=False),
        sa.Column("child_id", sa.Uuid(), nullable=False),
        sa.Column("attendance_id", sa.Uuid(), sa.ForeignKey("attendance.id", ondelete="SET NULL"), nullable=True),
        sa.Column("child_name", sa.String(201), nullable=False),
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("kind", correction_kind, nullable=False),
        sa.Column("reason", sa.String(500), nullable=False),
        sa.Column("corrected_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("corrected_by", sa.Uuid(), sa.ForeignKey("app_user.id", ondelete="SET NULL"), nullable=True),
        sa.Column("corrected_by_name", sa.String(201), nullable=False),
        sa.Column("old_arrived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("old_departed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("old_dropped_off_by", sa.String(201), nullable=True),
        sa.Column("old_picked_up_by", sa.String(201), nullable=True),
        sa.Column("new_arrived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("new_departed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("new_dropped_off_by", sa.String(201), nullable=True),
        sa.Column("new_picked_up_by", sa.String(201), nullable=True),
        sa.ForeignKeyConstraint(["child_id", "nursery_id"], ["child.id", "child.nursery_id"],
                                name="fk_attendance_correction_child_nursery", ondelete="CASCADE"),
        sa.CheckConstraint("(kind = 'created') = (old_arrived_at IS NULL)", name="attendance_correction_old_values"),
        sa.CheckConstraint("(kind = 'cancelled') = (new_arrived_at IS NULL)",
                           name="attendance_correction_new_values"),
        sa.CheckConstraint("char_length(reason) BETWEEN 5 AND 500", name="attendance_correction_reason_length"),
    )
    op.create_index("ix_attendance_correction_attendance_id", "attendance_correction", ["attendance_id"])
    op.create_index("ix_attendance_correction_nursery_id_day", "attendance_correction", ["nursery_id", "day"])


def downgrade() -> None:
    op.drop_index("ix_attendance_correction_nursery_id_day", table_name="attendance_correction")
    op.drop_index("ix_attendance_correction_attendance_id", table_name="attendance_correction")
    op.drop_table("attendance_correction")
    correction_kind.drop(op.get_bind())
