"""Tablettes enrôlées, PIN des employés, sessions d'action (LUN-005)

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-09
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "tablet_device",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("nursery_id", sa.Uuid(), nullable=False),
        sa.Column("enterprise_id", sa.Uuid(), nullable=False),
        sa.Column("label", sa.String(100), nullable=False),
        sa.Column("token_digest", sa.LargeBinary(32), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("app_user.id", ondelete="SET NULL"), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["nursery_id", "enterprise_id"], ["nursery.id", "nursery.enterprise_id"],
                                name="fk_tablet_device_nursery_enterprise", ondelete="CASCADE"),
    )
    op.create_index("ix_tablet_device_nursery_id", "tablet_device", ["nursery_id"])

    op.add_column("app_user", sa.Column("pin_hash", sa.String(255), nullable=True))
    op.add_column("app_user", sa.Column("pin_failed_attempts", sa.Integer(), server_default=sa.text("0"),
                                        nullable=False))
    op.add_column("app_user", sa.Column("pin_locked_at", sa.DateTime(timezone=True), nullable=True))

    op.add_column("user_session", sa.Column("kind", sa.String(16), server_default=sa.text("'web'"), nullable=False))
    op.add_column("user_session", sa.Column("tablet_id", sa.Uuid(),
                                            sa.ForeignKey("tablet_device.id", ondelete="CASCADE"), nullable=True))
    op.create_index("ix_user_session_tablet_id", "user_session", ["tablet_id"])
    op.create_check_constraint("user_session_kind_valid", "user_session", "kind IN ('web', 'tablet')")
    op.create_check_constraint("user_session_tablet_matches_kind", "user_session",
                               "(kind = 'tablet') = (tablet_id IS NOT NULL)")

    op.add_column("auth_event", sa.Column("tablet_id", sa.Uuid(),
                                          sa.ForeignKey("tablet_device.id", ondelete="SET NULL"), nullable=True))
    op.create_index("ix_auth_event_tablet_id_occurred_at", "auth_event", ["tablet_id", "occurred_at"])


def downgrade() -> None:
    op.drop_index("ix_auth_event_tablet_id_occurred_at", table_name="auth_event")
    op.drop_column("auth_event", "tablet_id")
    op.drop_constraint("user_session_tablet_matches_kind", "user_session", type_="check")
    op.drop_constraint("user_session_kind_valid", "user_session", type_="check")
    op.drop_index("ix_user_session_tablet_id", table_name="user_session")
    op.drop_column("user_session", "tablet_id")
    # Les sessions de tablette n'existent plus sans leur colonne : on les supprime.
    op.execute("DELETE FROM user_session WHERE kind <> 'web'")
    op.drop_column("user_session", "kind")
    op.drop_column("app_user", "pin_locked_at")
    op.drop_column("app_user", "pin_failed_attempts")
    op.drop_column("app_user", "pin_hash")
    op.drop_index("ix_tablet_device_nursery_id", table_name="tablet_device")
    op.drop_table("tablet_device")
