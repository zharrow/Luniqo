"""Entreprise des comptes, coordonnées des crèches, accès des employés (LUN-004)

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-08
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    for name, column in (
        ("address", sa.String(255)),
        ("postal_code", sa.String(10)),
        ("phone", sa.String(20)),
        ("email", sa.String(254)),
    ):
        op.add_column("nursery", sa.Column(name, column, nullable=True))
    op.create_unique_constraint("uq_nursery_id_enterprise", "nursery", ["id", "enterprise_id"])

    op.add_column("app_user", sa.Column("enterprise_id", sa.Uuid(), sa.ForeignKey("enterprise.id"), nullable=True))
    op.create_index("ix_app_user_enterprise_id", "app_user", ["enterprise_id"])

    # Comptes direction ou employé créés avant cette migration (seed de LUN-003,
    # données synthétiques uniquement) : rattachés à l'entreprise s'il n'y en a
    # qu'une. S'il y en a plusieurs, la contrainte ci-dessous échoue plutôt que
    # de deviner.
    op.execute("""
        UPDATE app_user SET enterprise_id = (SELECT id FROM enterprise)
        WHERE role IN ('owner', 'employee') AND enterprise_id IS NULL
          AND (SELECT count(*) FROM enterprise) = 1
    """)
    op.create_check_constraint("app_user_enterprise_matches_role", "app_user",
                               "(role IN ('owner', 'employee')) = (enterprise_id IS NOT NULL)")
    op.create_unique_constraint("uq_app_user_id_enterprise", "app_user", ["id", "enterprise_id"])

    op.create_table(
        "nursery_access",
        sa.Column("user_id", sa.Uuid(), primary_key=True),
        sa.Column("nursery_id", sa.Uuid(), primary_key=True),
        sa.Column("enterprise_id", sa.Uuid(), nullable=False),
        sa.Column("granted_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("granted_by", sa.Uuid(), sa.ForeignKey("app_user.id", ondelete="SET NULL"), nullable=True),
        sa.ForeignKeyConstraint(["user_id", "enterprise_id"], ["app_user.id", "app_user.enterprise_id"],
                                name="fk_nursery_access_user_enterprise", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["nursery_id", "enterprise_id"], ["nursery.id", "nursery.enterprise_id"],
                                name="fk_nursery_access_nursery_enterprise", ondelete="CASCADE"),
    )
    op.create_index("ix_nursery_access_nursery_id", "nursery_access", ["nursery_id"])


def downgrade() -> None:
    op.drop_index("ix_nursery_access_nursery_id", table_name="nursery_access")
    op.drop_table("nursery_access")
    op.drop_constraint("uq_app_user_id_enterprise", "app_user", type_="unique")
    op.drop_constraint("app_user_enterprise_matches_role", "app_user", type_="check")
    op.drop_index("ix_app_user_enterprise_id", table_name="app_user")
    op.drop_column("app_user", "enterprise_id")
    op.drop_constraint("uq_nursery_id_enterprise", "nursery", type_="unique")
    for name in ("email", "phone", "postal_code", "address"):
        op.drop_column("nursery", name)
