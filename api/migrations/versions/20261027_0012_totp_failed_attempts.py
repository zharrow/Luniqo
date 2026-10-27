"""Échecs du TOTP comptés sur le facteur, indépendamment du journal purgé (LUN-54)

Revision ID: 0012
Revises: 0011
Create Date: 2026-10-27
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0012"
down_revision: str | None = "0011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("totp_factor", sa.Column("failed_attempts", sa.Integer(), server_default=sa.text("0"),
                                           nullable=False))
    # Reprise de l'existant : jusqu'ici, les échecs étaient recomptés dans le
    # journal depuis la dernière réussite ou la dernière activation d'un TOTP.
    # Même calcul, une fois, pour qu'un TOTP déjà bloqué le reste.
    op.execute("""
        UPDATE totp_factor AS factor
        SET failed_attempts = (
            SELECT count(*) FROM auth_event AS failure
            WHERE failure.user_id = factor.user_id AND failure.event = 'mfa_failed'
              AND failure.occurred_at > coalesce((
                  SELECT max(success.occurred_at) FROM auth_event AS success
                  WHERE success.user_id = factor.user_id AND success.event IN ('mfa_succeeded', 'totp_enabled')
              ), to_timestamp(0))
        )
        WHERE factor.confirmed_at IS NOT NULL
    """)


def downgrade() -> None:
    op.drop_column("totp_factor", "failed_attempts")
