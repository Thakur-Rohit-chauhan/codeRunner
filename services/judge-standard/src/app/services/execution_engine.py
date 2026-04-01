"""Mock code execution engine.

Simulates code compilation and execution against test cases.
Real sandboxed execution (Docker containers) would replace
the mock logic in a future phase.
"""

import asyncio
import random
from typing import Any

from app.logger import get_logger

logger = get_logger(__name__)


class ExecutionEngine:
    """Execute code against test cases (mock implementation)."""

    async def execute(
        self,
        code: str,
        language: str,
        test_cases: list[dict],
        time_limit: int = 1000,
        memory_limit: int = 256,
    ) -> dict[str, Any]:
        """Execute code and evaluate against test cases.

        Args:
            code: Source code string.
            language: Programming language.
            test_cases: List of {input, expected_output, hidden} dicts.
            time_limit: Max execution time per test (ms).
            memory_limit: Max memory (MB).

        Returns:
            Dict with verdict, test_passed, test_total, execution_time,
            execution_memory, error_message.
        """
        total = len(test_cases)
        logger.info(
            "Executing %s code against %d test cases (time_limit=%dms)",
            language,
            total,
            time_limit,
        )

        # Step 1: Syntax check
        if not self._check_syntax(code, language):
            logger.warning("Compilation error detected in %s code", language)
            return {
                "verdict": "CE",
                "test_passed": 0,
                "test_total": total,
                "execution_time": 0,
                "execution_memory": 0,
                "error_message": "Syntax error in submitted code",
            }

        # Step 2: Run each test case
        test_passed = 0
        total_time = 0

        for i, tc in enumerate(test_cases, 1):
            result = await self._run_test(
                code=code,
                language=language,
                input_data=tc["input"],
                expected_output=tc["expected_output"],
                time_limit=time_limit,
            )

            total_time += result["execution_time"]

            if result["verdict"] == "TLE":
                logger.info("  Test case %d/%d: TLE (%dms)", i, total, result["execution_time"])
                return {
                    "verdict": "TLE",
                    "test_passed": test_passed,
                    "test_total": total,
                    "execution_time": total_time,
                    "execution_memory": result["execution_memory"],
                    "error_message": result.get("error_message"),
                }

            if result["verdict"] == "RE":
                logger.info("  Test case %d/%d: RE", i, total)
                return {
                    "verdict": "RE",
                    "test_passed": test_passed,
                    "test_total": total,
                    "execution_time": total_time,
                    "execution_memory": result["execution_memory"],
                    "error_message": result.get("error_message"),
                }

            if result["passed"]:
                test_passed += 1
                logger.info("  Test case %d/%d: AC (%dms)", i, total, result["execution_time"])
            else:
                logger.info("  Test case %d/%d: WA (%dms)", i, total, result["execution_time"])

        # Step 3: Final verdict
        verdict = "AC" if test_passed == total else "WA"
        memory = random.randint(32, memory_limit)

        logger.info(
            "Execution complete: %s (%d/%d) in %dms",
            verdict,
            test_passed,
            total,
            total_time,
        )

        return {
            "verdict": verdict,
            "test_passed": test_passed,
            "test_total": total,
            "execution_time": total_time,
            "execution_memory": memory,
            "error_message": None,
        }

    async def _run_test(
        self,
        code: str,
        language: str,
        input_data: str,
        expected_output: str,
        time_limit: int,
    ) -> dict[str, Any]:
        """Run a single test case (mock).

        Simulates execution with asyncio.sleep and random outcomes.
        """
        try:
            # Mock execution delay (50-200ms)
            exec_time = random.randint(50, 200)
            await asyncio.sleep(exec_time / 1000)

            # Mock timeout check
            if exec_time > time_limit:
                return {
                    "passed": False,
                    "verdict": "TLE",
                    "execution_time": exec_time,
                    "execution_memory": 128,
                    "error_message": f"Time limit exceeded ({exec_time}ms > {time_limit}ms)",
                }

            # Mock pass/fail (80% pass rate for realistic demo)
            passed = random.random() < 0.8

            return {
                "passed": passed,
                "verdict": "AC" if passed else "WA",
                "execution_time": exec_time,
                "execution_memory": random.randint(32, 256),
                "error_message": None if passed else "Output mismatch",
            }

        except Exception as exc:
            return {
                "passed": False,
                "verdict": "RE",
                "execution_time": 0,
                "execution_memory": 0,
                "error_message": str(exc),
            }

    @staticmethod
    def _check_syntax(code: str, language: str) -> bool:
        """Basic mock syntax validation.

        Real implementation would compile the code.
        """
        if not code or not code.strip():
            return False

        if language == "python":
            try:
                compile(code, "<submission>", "exec")
                return True
            except SyntaxError:
                return False

        # For other languages, basic bracket matching
        if language in ("cpp", "java", "c"):
            if code.count("{") != code.count("}"):
                return False
            if code.count("(") != code.count(")"):
                return False

        return True
