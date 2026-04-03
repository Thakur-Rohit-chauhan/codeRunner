"""add google auth identity fields

Revision ID: 20260403_0004
Revises: 20260403_0003
Create Date: 2026-04-03 15:25:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260403_0004"
down_revision = "20260403_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("auth_provider", sa.String(length=24), nullable=False, server_default="local"))
    op.add_column("users", sa.Column("oauth_subject", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.create_index(op.f("ix_users_oauth_subject"), "users", ["oauth_subject"], unique=True)
    op.alter_column("users", "auth_provider", server_default=None)
    op.alter_column("users", "email_verified", server_default=None)


def downgrade() -> None:
    op.drop_index(op.f("ix_users_oauth_subject"), table_name="users")
    op.drop_column("users", "email_verified")
    op.drop_column("users", "oauth_subject")
    op.drop_column("users", "auth_provider")
