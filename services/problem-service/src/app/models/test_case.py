"""TestCase SQLModel definition.

Stores test cases for problems, used by judge-standard via gRPC.
Each test case has input/output data and visibility classification.
"""

from datetime import datetime

from sqlmodel import Field, SQLModel, Column
from sqlalchemy import Text


class TestCase(SQLModel, table=True):
    """Test case entity linked to a problem.

    Attributes:
        id: Auto-incrementing primary key.
        problem_id: Foreign key referencing problems.id.
        input_data: The input fed to the submitted code.
        expected_output: The expected stdout output.
        is_hidden: If True, test case is hidden from users (judge-only).
        test_order: Execution order (lower runs first).
        time_limit_override: Per-test time limit override (ms), None = use problem default.
        memory_limit_override: Per-test memory limit override (MB), None = use problem default.
        created_at: Timestamp of creation (UTC).
        updated_at: Timestamp of last update (UTC).
        is_deleted: Soft delete flag.
    """

    __tablename__ = "test_cases"

    id: int | None = Field(default=None, primary_key=True)

    # Foreign key to problem
    problem_id: int = Field(foreign_key="problems.id", index=True)

    # Test case content
    input_data: str = Field(sa_column=Column(Text, nullable=False))
    expected_output: str = Field(sa_column=Column(Text, nullable=False))

    # Classification
    is_hidden: bool = Field(default=False)
    test_order: int = Field(default=0)

    # Optional per-test overrides
    time_limit_override: int | None = Field(default=None)
    memory_limit_override: int | None = Field(default=None)

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Soft delete
    is_deleted: bool = Field(default=False, index=True)
