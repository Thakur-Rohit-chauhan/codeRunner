"""Unit tests for the judge-ml execution engine."""

import json

import pytest

from app.services.execution_engine import ExecutionEngine


def _valid_notebook(source: list[str]) -> str:
    """Build a minimal notebook JSON string for tests."""
    return json.dumps(
        {
            "cells": [
                {
                    "cell_type": "markdown",
                    "source": ["# Model Training"],
                },
                {
                    "cell_type": "code",
                    "source": source,
                },
            ]
        }
    )


@pytest.mark.asyncio
async def test_execute_notebook_with_runtime_metrics_passes() -> None:
    """Notebook submissions should pass when runtime metrics satisfy metadata."""
    engine = ExecutionEngine()
    submission = _valid_notebook(
        [
            "import math\n",
            "\n",
            "def train_model():\n",
            "    return {'accuracy': 0.94, 'f1': 0.88}\n",
            "\n",
            "metrics = train_model()\n",
        ]
    )

    result = await engine.execute(
        code=submission,
        language="notebook",
        test_cases=[],
        problem={
            "metadata": {
                "required_imports": ["math"],
                "required_functions": ["train_model"],
                "expected_metrics": {"accuracy": 0.9, "f1": 0.8},
                "minimum_cells": 1,
            }
        },
    )

    assert result["verdict"] == "AC"
    assert result["test_passed"] == result["test_total"]


@pytest.mark.asyncio
async def test_execute_python_with_missing_required_keyword_fails() -> None:
    """Successful execution should still produce WA when metadata checks fail."""
    engine = ExecutionEngine()
    submission = "metrics = {'accuracy': 0.92}\n"

    result = await engine.execute(
        code=submission,
        language="python",
        test_cases=[],
        problem={
            "metadata": {
                "required_keywords": ["fit("],
            }
        },
    )

    assert result["verdict"] == "WA"
    assert "fit(" in result["error_message"]


@pytest.mark.asyncio
async def test_execute_python_timeout_returns_tle() -> None:
    """Long-running code should be terminated with TLE."""
    engine = ExecutionEngine()

    result = await engine.execute(
        code="import time\ntime.sleep(1.2)\nmetrics = {'accuracy': 1.0}\n",
        language="python",
        test_cases=[],
        problem={"metadata": {"expected_metrics": {"accuracy": 0.9}}},
        time_limit=100,
    )

    assert result["verdict"] == "TLE"


@pytest.mark.asyncio
async def test_invalid_notebook_json_returns_ce() -> None:
    """Malformed notebook JSON should fail fast with CE."""
    engine = ExecutionEngine()

    result = await engine.execute(
        code="{not-valid-json}",
        language="notebook",
        test_cases=[],
        problem={},
    )

    assert result["verdict"] == "CE"
    assert "Notebook JSON is invalid" in result["error_message"]


@pytest.mark.asyncio
async def test_forbidden_import_returns_ce() -> None:
    """Host-facing imports should be blocked before execution."""
    engine = ExecutionEngine()

    result = await engine.execute(
        code="import os\nmetrics = {'accuracy': 1.0}\n",
        language="python",
        test_cases=[],
        problem={},
    )

    assert result["verdict"] == "CE"
    assert "Forbidden import detected" in result["error_message"]


@pytest.mark.asyncio
async def test_forbidden_open_call_returns_ce() -> None:
    """Direct file access should be blocked before execution."""
    engine = ExecutionEngine()

    result = await engine.execute(
        code="handle = open('secrets.txt', 'w')\n",
        language="python",
        test_cases=[],
        problem={},
    )

    assert result["verdict"] == "CE"
    assert "Forbidden runtime call detected" in result["error_message"]
