"""initial integrated platform schema

Revision ID: 20260402_0001
Revises:
Create Date: 2026-04-02 14:20:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260402_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("username", sa.String(length=64), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=128), nullable=False),
        sa.Column("display_name", sa.String(length=120), nullable=False),
        sa.Column("role", sa.String(length=24), nullable=False),
        sa.Column("rank", sa.String(length=24), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_username"), "users", ["username"], unique=True)

    op.create_table(
        "competitions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("slug", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("mode", sa.String(length=24), nullable=False),
        sa.Column("difficulty", sa.String(length=24), nullable=False),
        sa.Column("max_score", sa.Float(), nullable=False),
        sa.Column("queue_name", sa.String(length=64), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_competitions_slug"), "competitions", ["slug"], unique=True)

    op.create_table(
        "submissions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("competition_id", sa.Integer(), nullable=False),
        sa.Column("submission_type", sa.String(length=24), nullable=False),
        sa.Column("queue_name", sa.String(length=64), nullable=False),
        sa.Column("language", sa.String(length=32), nullable=True),
        sa.Column("source_text", sa.Text(), nullable=True),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("score", sa.Float(), nullable=True),
        sa.Column("attempt_count", sa.Integer(), nullable=False),
        sa.Column("max_attempts", sa.Integer(), nullable=False),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("worker_name", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["competition_id"], ["competitions.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_submissions_competition_id"), "submissions", ["competition_id"], unique=False)
    op.create_index(op.f("ix_submissions_user_id"), "submissions", ["user_id"], unique=False)

    op.create_table(
        "results",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("submission_id", sa.String(length=36), nullable=False),
        sa.Column("competition_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("stdout", sa.Text(), nullable=False),
        sa.Column("stderr", sa.Text(), nullable=False),
        sa.Column("metrics", sa.JSON(), nullable=False),
        sa.Column("runtime_ms", sa.Integer(), nullable=False),
        sa.Column("memory_kb", sa.Integer(), nullable=False),
        sa.Column("judged_by", sa.String(length=64), nullable=False),
        sa.Column("judged_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["competition_id"], ["competitions.id"]),
        sa.ForeignKeyConstraint(["submission_id"], ["submissions.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_results_competition_id"), "results", ["competition_id"], unique=False)
    op.create_index(op.f("ix_results_submission_id"), "results", ["submission_id"], unique=True)
    op.create_index(op.f("ix_results_user_id"), "results", ["user_id"], unique=False)

    op.create_table(
        "leaderboard",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("competition_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("best_score", sa.Float(), nullable=False),
        sa.Column("submissions_count", sa.Integer(), nullable=False),
        sa.Column("accepted_count", sa.Integer(), nullable=False),
        sa.Column("last_submission_id", sa.String(length=36), nullable=True),
        sa.Column("last_status", sa.String(length=24), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["competition_id"], ["competitions.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("competition_id", "user_id", name="uq_leaderboard_competition_user"),
    )
    op.create_index(op.f("ix_leaderboard_competition_id"), "leaderboard", ["competition_id"], unique=False)
    op.create_index(op.f("ix_leaderboard_user_id"), "leaderboard", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_leaderboard_user_id"), table_name="leaderboard")
    op.drop_index(op.f("ix_leaderboard_competition_id"), table_name="leaderboard")
    op.drop_table("leaderboard")

    op.drop_index(op.f("ix_results_user_id"), table_name="results")
    op.drop_index(op.f("ix_results_submission_id"), table_name="results")
    op.drop_index(op.f("ix_results_competition_id"), table_name="results")
    op.drop_table("results")

    op.drop_index(op.f("ix_submissions_user_id"), table_name="submissions")
    op.drop_index(op.f("ix_submissions_competition_id"), table_name="submissions")
    op.drop_table("submissions")

    op.drop_index(op.f("ix_competitions_slug"), table_name="competitions")
    op.drop_table("competitions")

    op.drop_index(op.f("ix_users_username"), table_name="users")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
