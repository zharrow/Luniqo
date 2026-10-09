"""Comptes familles : invitations, plusieurs fiches par compte (LUN-011)

Revision ID: 0007
Revises: 0006
Create Date: 2026-10-09
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0007"
down_revision: str | None = "0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Un même compte parent peut porter plusieurs fiches (deux crèches, familles recomposées).
    op.drop_constraint("guardian_user_id_key", "guardian", type_="unique")
    op.create_index("ix_guardian_user_id", "guardian", ["user_id"])

    op.create_table(
        "invitation",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("token_digest", sa.LargeBinary(32), nullable=False, unique=True),
        sa.Column("guardian_id", sa.Uuid(), sa.ForeignKey("guardian.id", ondelete="CASCADE"), nullable=False),
        sa.Column("email", sa.String(254), nullable=False),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("app_user.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_invitation_guardian_id", "invitation", ["guardian_id"])


def downgrade() -> None:
    op.drop_index("ix_invitation_guardian_id", table_name="invitation")
    op.drop_table("invitation")
    op.drop_index("ix_guardian_user_id", table_name="guardian")
    op.create_unique_constraint("guardian_user_id_key", "guardian", ["user_id"])
