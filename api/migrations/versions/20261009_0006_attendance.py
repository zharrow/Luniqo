"""Pointage : présences des enfants (LUN-010)

Revision ID: 0006
Revises: 0005
Create Date: 2026-10-09
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_unique_constraint("uq_child_id_nursery", "child", ["id", "nursery_id"])
    op.create_table(
        "attendance",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("child_id", sa.Uuid(), nullable=False),
        sa.Column("nursery_id", sa.Uuid(), nullable=False),
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("arrived_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("arrival_by", sa.Uuid(), sa.ForeignKey("app_user.id", ondelete="SET NULL"), nullable=True),
        sa.Column("dropped_off_by", sa.Uuid(), sa.ForeignKey("guardian.id", ondelete="SET NULL"), nullable=True),
        sa.Column("departed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("departure_by", sa.Uuid(), sa.ForeignKey("app_user.id", ondelete="SET NULL"), nullable=True),
        sa.Column("picked_up_by", sa.Uuid(), sa.ForeignKey("guardian.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["child_id", "nursery_id"], ["child.id", "child.nursery_id"],
                                name="fk_attendance_child_nursery", ondelete="CASCADE"),
        sa.CheckConstraint("departed_at IS NULL OR departed_at >= arrived_at",
                           name="attendance_departure_after_arrival"),
        sa.CheckConstraint("departed_at IS NOT NULL OR picked_up_by IS NULL",
                           name="attendance_pickup_only_on_departure"),
    )
    op.create_index("ix_attendance_child_id", "attendance", ["child_id"])
    op.create_index("ix_attendance_nursery_id_day", "attendance", ["nursery_id", "day"])
    # Une seule présence ouverte par enfant : deux arrivées simultanées ne passent pas.
    op.create_index("uq_attendance_one_open_per_child", "attendance", ["child_id"], unique=True,
                    postgresql_where=sa.text("departed_at IS NULL"))


def downgrade() -> None:
    op.drop_index("uq_attendance_one_open_per_child", table_name="attendance")
    op.drop_index("ix_attendance_nursery_id_day", table_name="attendance")
    op.drop_index("ix_attendance_child_id", table_name="attendance")
    op.drop_table("attendance")
    op.drop_constraint("uq_child_id_nursery", "child", type_="unique")
