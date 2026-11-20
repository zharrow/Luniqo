"""Transmissions de la journée sur un enfant (LUN-146)

Revision ID: 0015
Revises: 0014
Create Date: 2026-11-20
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0015"
down_revision: str | None = "0014"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "child_note",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("nursery_id", sa.Uuid(), nullable=False),
        sa.Column("child_id", sa.Uuid(), nullable=False),
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("text", sa.String(500), nullable=False),
        sa.Column("author_id", sa.Uuid(), sa.ForeignKey("app_user.id", ondelete="SET NULL"), nullable=True),
        sa.Column("author_name", sa.String(201), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["child_id", "nursery_id"], ["child.id", "child.nursery_id"],
                                name="fk_child_note_child_nursery", ondelete="CASCADE"),
        sa.CheckConstraint("char_length(btrim(text)) BETWEEN 1 AND 500", name="child_note_text_length"),
    )
    op.create_index("ix_child_note_nursery_id_day", "child_note", ["nursery_id", "day"])


def downgrade() -> None:
    op.drop_index("ix_child_note_nursery_id_day", table_name="child_note")
    op.drop_table("child_note")
