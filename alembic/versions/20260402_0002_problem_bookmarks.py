"""add problem bookmarks

Revision ID: 20260402_0002
Revises: 20260402_0001
Create Date: 2026-04-02 21:15:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260402_0002"
down_revision = "20260402_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "problem_bookmarks",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("problem_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "problem_id", name="uq_problem_bookmarks_user_problem"),
    )
    op.create_index(op.f("ix_problem_bookmarks_user_id"), "problem_bookmarks", ["user_id"], unique=False)
    op.create_index(op.f("ix_problem_bookmarks_problem_id"), "problem_bookmarks", ["problem_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_problem_bookmarks_problem_id"), table_name="problem_bookmarks")
    op.drop_index(op.f("ix_problem_bookmarks_user_id"), table_name="problem_bookmarks")
    op.drop_table("problem_bookmarks")
