"""Passkeys (WebAuthn) et défis en attente (LUN-69)

Revision ID: 0013
Revises: 0012
Create Date: 2026-10-27
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0013"
down_revision: str | None = "0012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "passkey",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("app_user.id", ondelete="CASCADE"), nullable=False),
        sa.Column("credential_id", sa.LargeBinary(1023), nullable=False, unique=True),
        sa.Column("public_key", sa.LargeBinary(), nullable=False),
        sa.Column("sign_count", sa.BigInteger(), server_default=sa.text("0"), nullable=False),
        sa.Column("name", sa.String(64), nullable=False),
        sa.Column("aaguid", sa.String(36), nullable=False),
        sa.Column("backed_up", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_passkey_user_id", "passkey", ["user_id"])

    op.create_table(
        "webauthn_challenge",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("challenge", sa.LargeBinary(32), nullable=False, unique=True),
        sa.Column("purpose", sa.String(16), nullable=False),
        sa.Column("session_id", sa.Uuid(), sa.ForeignKey("user_session.id", ondelete="CASCADE"), nullable=True),
        sa.Column("ip", sa.String(45), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("purpose IN ('registration', 'verification', 'login')",
                           name="webauthn_challenge_purpose"),
        sa.CheckConstraint("(purpose = 'login') = (session_id IS NULL)", name="webauthn_challenge_session_matches"),
    )
    # Au plus un défi en attente par session et par usage.
    op.create_index("uq_webauthn_challenge_session_purpose", "webauthn_challenge", ["session_id", "purpose"],
                    unique=True, postgresql_where=sa.text("session_id IS NOT NULL"))
    op.create_index("ix_webauthn_challenge_ip_expires_at", "webauthn_challenge", ["ip", "expires_at"])


def downgrade() -> None:
    op.drop_index("ix_webauthn_challenge_ip_expires_at", table_name="webauthn_challenge")
    op.drop_index("uq_webauthn_challenge_session_purpose", table_name="webauthn_challenge")
    op.drop_table("webauthn_challenge")
    op.drop_index("ix_passkey_user_id", table_name="passkey")
    op.drop_table("passkey")
