"""Familles, enfants, responsables et liens (LUN-009)

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-09
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

child_status = sa.Enum("adaptation", "active", "suspended", "departed", name="child_status")
relationship = sa.Enum("parent", "legal_guardian", "other", name="guardian_relationship")


def _uuid_pk() -> sa.Column:
    return sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), primary_key=True)


def _created_at() -> sa.Column:
    return sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False)


def upgrade() -> None:
    op.create_table(
        "family",
        _uuid_pk(),
        sa.Column("nursery_id", sa.Uuid(), sa.ForeignKey("nursery.id", ondelete="CASCADE"), nullable=False),
        sa.Column("label", sa.String(255), nullable=False),
        sa.Column("address", sa.String(255), nullable=True),
        sa.Column("postal_code", sa.String(10), nullable=True),
        sa.Column("city", sa.String(100), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        _created_at(),
        sa.UniqueConstraint("id", "nursery_id", name="uq_family_id_nursery"),
    )
    op.create_index("ix_family_nursery_id", "family", ["nursery_id"])

    op.create_table(
        "child",
        _uuid_pk(),
        sa.Column("family_id", sa.Uuid(), nullable=False),
        sa.Column("nursery_id", sa.Uuid(), nullable=False),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("birth_date", sa.Date(), nullable=False),
        sa.Column("status", child_status, nullable=False),
        sa.Column("enrollment_date", sa.Date(), nullable=False),
        sa.Column("exit_date", sa.Date(), nullable=True),
        _created_at(),
        sa.ForeignKeyConstraint(["family_id", "nursery_id"], ["family.id", "family.nursery_id"],
                                name="fk_child_family_nursery", ondelete="CASCADE"),
        sa.UniqueConstraint("id", "family_id", name="uq_child_id_family"),
        sa.CheckConstraint("enrollment_date >= birth_date", name="child_enrolled_after_birth"),
        sa.CheckConstraint("exit_date IS NULL OR exit_date >= enrollment_date", name="child_exit_after_enrollment"),
        sa.CheckConstraint("(status = 'departed') = (exit_date IS NOT NULL)", name="child_departed_has_exit_date"),
    )
    op.create_index("ix_child_family_id", "child", ["family_id"])
    op.create_index("ix_child_nursery_id", "child", ["nursery_id"])

    op.create_table(
        "guardian",
        _uuid_pk(),
        sa.Column("family_id", sa.Uuid(), nullable=False),
        sa.Column("nursery_id", sa.Uuid(), nullable=False),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("email", sa.String(254), nullable=True),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("app_user.id", ondelete="SET NULL"), nullable=True,
                  unique=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        _created_at(),
        sa.ForeignKeyConstraint(["family_id", "nursery_id"], ["family.id", "family.nursery_id"],
                                name="fk_guardian_family_nursery", ondelete="CASCADE"),
        sa.UniqueConstraint("id", "family_id", name="uq_guardian_id_family"),
        sa.CheckConstraint("email IS NULL OR email = lower(email)", name="guardian_email_lowercase"),
    )
    op.create_index("ix_guardian_family_id", "guardian", ["family_id"])
    op.create_index("ix_guardian_nursery_id", "guardian", ["nursery_id"])

    op.create_table(
        "child_guardian",
        sa.Column("child_id", sa.Uuid(), primary_key=True),
        sa.Column("guardian_id", sa.Uuid(), primary_key=True),
        sa.Column("family_id", sa.Uuid(), nullable=False),
        sa.Column("relationship", relationship, nullable=False),
        sa.Column("has_parental_authority", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("is_authorized_pickup", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("is_emergency_contact", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        _created_at(),
        sa.ForeignKeyConstraint(["child_id", "family_id"], ["child.id", "child.family_id"],
                                name="fk_child_guardian_child_family", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["guardian_id", "family_id"], ["guardian.id", "guardian.family_id"],
                                name="fk_child_guardian_guardian_family", ondelete="CASCADE"),
    )
    op.create_index("ix_child_guardian_guardian_id", "child_guardian", ["guardian_id"])


def downgrade() -> None:
    op.drop_index("ix_child_guardian_guardian_id", table_name="child_guardian")
    op.drop_table("child_guardian")
    op.drop_index("ix_guardian_nursery_id", table_name="guardian")
    op.drop_index("ix_guardian_family_id", table_name="guardian")
    op.drop_table("guardian")
    op.drop_index("ix_child_nursery_id", table_name="child")
    op.drop_index("ix_child_family_id", table_name="child")
    op.drop_table("child")
    op.drop_index("ix_family_nursery_id", table_name="family")
    op.drop_table("family")
    relationship.drop(op.get_bind())
    child_status.drop(op.get_bind())
