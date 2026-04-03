"""add competition ui state

Revision ID: 20260403_0003
Revises: 20260402_0002
Create Date: 2026-04-03 14:10:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260403_0003"
down_revision = "20260402_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "competitions",
        sa.Column("ui_state", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
    )
    op.alter_column("competitions", "ui_state", server_default=None)


def downgrade() -> None:
    op.drop_column("competitions", "ui_state")
