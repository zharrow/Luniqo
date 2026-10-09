"""Second facteur : TOTP chiffré, codes de secours, état des sessions (LUN-006)

Revision ID: 0008
Revises: 0007
Create Date: 2026-10-09
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0008"
down_revision: str | None = "0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Sessions déjà ouvertes : considérées sans second facteur exigé. Les
    # sessions durent 12 h au plus ; la règle s'applique dès la prochaine connexion.
    op.add_column("user_session", sa.Column("mfa_required", sa.Boolean(), server_default=sa.text("false"),
                                            nullable=False))
    op.add_column("user_session", sa.Column("mfa_verified_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_auth_event_user_id_occurred_at", "auth_event", ["user_id", "occurred_at"])

    op.create_table(
        "totp_factor",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("app_user.id", ondelete="CASCADE"), nullable=False),
        sa.Column("secret_ciphertext", sa.LargeBinary(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_used_step", sa.BigInteger(), nullable=True),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
    )
    # Au plus un TOTP confirmé et une activation en cours par compte.
    op.create_index("uq_totp_factor_user_confirmed", "totp_factor", ["user_id"], unique=True,
                    postgresql_where=sa.text("confirmed_at IS NOT NULL"))
    op.create_index("uq_totp_factor_user_pending", "totp_factor", ["user_id"], unique=True,
                    postgresql_where=sa.text("confirmed_at IS NULL"))

    op.create_table(
        "backup_code",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("app_user.id", ondelete="CASCADE"), nullable=False),
        sa.Column("lookup", sa.String(4), nullable=False),
        sa.Column("code_hash", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_backup_code_user_id_lookup", "backup_code", ["user_id", "lookup"])


def downgrade() -> None:
    op.drop_index("ix_backup_code_user_id_lookup", table_name="backup_code")
    op.drop_table("backup_code")
    op.drop_index("uq_totp_factor_user_pending", table_name="totp_factor")
    op.drop_index("uq_totp_factor_user_confirmed", table_name="totp_factor")
    op.drop_table("totp_factor")
    op.drop_index("ix_auth_event_user_id_occurred_at", table_name="auth_event")
    op.drop_column("user_session", "mfa_verified_at")
    op.drop_column("user_session", "mfa_required")
