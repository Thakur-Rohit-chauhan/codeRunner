"""Docker-backed code execution engine.

Runs untrusted submissions inside short-lived Docker containers with
resource limits and sandbox hardening. Supports Python, C++, Java,
and JavaScript.
"""

from __future__ import annotations

import asyncio
import math
import re
import shlex
import subprocess
import tempfile
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from uuid import uuid4

from app.config import settings
from app.logger import get_logger

logger = get_logger(__name__)

MAX_RSS_MARKER = "__MAXRSS_KB__"
FLOAT_TOKEN = re.compile(r"[-+]?\d*\.\d+(?:[eE][-+]?\d+)?|[-+]?\d+(?:[eE][-+]?\d+)?")


@dataclass(frozen=True)
class RuntimeSpec:
    """Execution metadata for a language runtime."""

    image: str
    source_file: str
    compile_cmd: str | None
    run_cmd: str


@dataclass
class RunResult:
    """Result from one container execution."""

    exit_code: int
    stdout: str
    stderr: str
    elapsed_ms: int
    memory_mb: int
    timed_out: bool = False


class ExecutionEngine:
    """Execute user code securely in Docker containers."""

    def __init__(self) -> None:
        self.runtimes: dict[str, RuntimeSpec] = {
            "python": RuntimeSpec(
                image=settings.PYTHON_IMAGE,
                source_file="main.py",
                compile_cmd=None,
                run_cmd="python main.py",
            ),
            "cpp": RuntimeSpec(
                image=settings.CPP_IMAGE,
                source_file="main.cpp",
                compile_cmd="g++ -O2 -std=c++17 -o main main.cpp",
                run_cmd="./main",
            ),
            "java": RuntimeSpec(
                image=settings.JAVA_IMAGE,
                source_file="Main.java",
                compile_cmd="javac Main.java",
                run_cmd="java Main",
            ),
            "javascript": RuntimeSpec(
                image=settings.JAVASCRIPT_IMAGE,
                source_file="main.js",
                compile_cmd=None,
                run_cmd="node main.js",
            ),
        }

    async def execute(
        self,
        code: str,
        language: str,
        test_cases: list[dict],
        time_limit: int = 1000,
        memory_limit: int = 256,
    ) -> dict[str, Any]:
        """Compile/run code in sandbox and compare outputs across test cases."""
        runtime = self.runtimes.get(language)
        if runtime is None:
            return {
                "verdict": "RE",
                "test_passed": 0,
                "test_total": len(test_cases),
                "execution_time": 0,
                "execution_memory": 0,
                "error_message": f"Unsupported language: {language}",
            }

        if not await self._is_docker_available():
            return {
                "verdict": "RE",
                "test_passed": 0,
                "test_total": len(test_cases),
                "execution_time": 0,
                "execution_memory": 0,
                "error_message": "Docker is not available to judge-standard",
            }

        total = len(test_cases)
        passed = 0
        total_time = 0
        peak_memory = 0

        with tempfile.TemporaryDirectory(prefix="submission_") as temp_dir:
            workspace = Path(temp_dir)
            (workspace / runtime.source_file).write_text(code, encoding="utf-8")
            self._write_test_files(workspace, test_cases)

            # Compile once for compiled languages.
            if runtime.compile_cmd:
                compile_result = await self._run_in_sandbox(
                    workdir=workspace,
                    image=runtime.image,
                    command=runtime.compile_cmd,
                    stdin_data="",
                    timeout_ms=settings.COMPILATION_TIMEOUT_MS,
                    memory_limit_mb=memory_limit,
                )

                if compile_result.timed_out:
                    return {
                        "verdict": "CE",
                        "test_passed": 0,
                        "test_total": total,
                        "execution_time": settings.COMPILATION_TIMEOUT_MS,
                        "execution_memory": compile_result.memory_mb,
                        "error_message": "Compilation timed out",
                    }

                if compile_result.exit_code != 0:
                    return {
                        "verdict": "CE",
                        "test_passed": 0,
                        "test_total": total,
                        "execution_time": compile_result.elapsed_ms,
                        "execution_memory": compile_result.memory_mb,
                        "error_message": self._trim_error(compile_result.stderr),
                    }

            for idx, test_case in enumerate(test_cases, start=1):
                input_data = str(test_case.get("input", ""))
                expected = str(test_case.get("expected_output", ""))
                per_test_limit_ms = int(test_case.get("time_limit") or time_limit)

                run_result = await self._run_in_sandbox(
                    workdir=workspace,
                    image=runtime.image,
                    command=runtime.run_cmd,
                    stdin_data=input_data,
                    timeout_ms=per_test_limit_ms,
                    memory_limit_mb=memory_limit,
                )

                total_time += run_result.elapsed_ms
                peak_memory = max(peak_memory, run_result.memory_mb)

                if run_result.timed_out:
                    return {
                        "verdict": "TLE",
                        "test_passed": passed,
                        "test_total": total,
                        "execution_time": total_time,
                        "execution_memory": peak_memory,
                        "error_message": f"Time limit exceeded on test case {idx}",
                    }

                if run_result.exit_code != 0:
                    verdict = "MLE" if self._looks_like_mle(run_result.stderr) else "RE"
                    return {
                        "verdict": verdict,
                        "test_passed": passed,
                        "test_total": total,
                        "execution_time": total_time,
                        "execution_memory": peak_memory,
                        "error_message": self._trim_error(run_result.stderr),
                    }

                compare_ok = self._compare_output(
                    actual=run_result.stdout,
                    expected=expected,
                    options=test_case,
                )
                if not compare_ok:
                    return {
                        "verdict": "WA",
                        "test_passed": passed,
                        "test_total": total,
                        "execution_time": total_time,
                        "execution_memory": peak_memory,
                        "error_message": f"Wrong answer on test case {idx}",
                    }

                passed += 1

        return {
            "verdict": "AC",
            "test_passed": passed,
            "test_total": total,
            "execution_time": total_time,
            "execution_memory": peak_memory,
            "error_message": None,
        }

    async def _is_docker_available(self) -> bool:
        """Check docker CLI reachability once per execution."""
        cmd = [settings.DOCKER_BINARY, "version", "--format", "{{.Server.Version}}"]
        try:
            result = await self._run_local_command(cmd, timeout_sec=5)
            if result.returncode == 0:
                return True
            logger.error("Docker check failed: %s", result.stderr.strip())
            return False
        except Exception as exc:
            logger.error("Docker check exception: %s", exc)
            return False

    async def _run_in_sandbox(
        self,
        *,
        workdir: Path,
        image: str,
        command: str,
        stdin_data: str,
        timeout_ms: int,
        memory_limit_mb: int,
    ) -> RunResult:
        """Create container -> start with stdin -> collect output -> cleanup."""
        container_name = f"judge-{uuid4().hex}"
        memory_cap_mb = max(memory_limit_mb, 32) + settings.EXECUTION_MEMORY_MARGIN_MB
        timeout_sec = max(1.0, (timeout_ms + settings.EXECUTION_TIMEOUT_GRACE_MS) / 1000.0)
        cpu_seconds = max(1, math.ceil(timeout_ms / 1000.0) + 1)

        wrapped_command = self._wrap_with_time_probe(command)

        create_cmd = [
            settings.DOCKER_BINARY,
            "create",
            "--name",
            container_name,
            "--network",
            "none",
            "--read-only",
            "--cpus",
            str(settings.EXECUTION_CPU_COUNT),
            "--memory",
            f"{memory_cap_mb}m",
            "--memory-swap",
            f"{memory_cap_mb}m",
            "--pids-limit",
            str(settings.EXECUTION_PIDS_LIMIT),
            "--ulimit",
            f"nofile={settings.EXECUTION_NOFILE_LIMIT}:{settings.EXECUTION_NOFILE_LIMIT}",
            "--ulimit",
            f"nproc={settings.EXECUTION_NPROC_LIMIT}:{settings.EXECUTION_NPROC_LIMIT}",
            "--ulimit",
            f"fsize={settings.EXECUTION_MAX_FILE_KB}:{settings.EXECUTION_MAX_FILE_KB}",
            "--ulimit",
            f"cpu={cpu_seconds}:{cpu_seconds}",
            "--tmpfs",
            f"/tmp:rw,noexec,nosuid,size={settings.EXECUTION_TMPFS_MB}m",
            "--tmpfs",
            f"/var/tmp:rw,noexec,nosuid,size={settings.EXECUTION_TMPFS_MB}m",
            "--security-opt",
            "no-new-privileges:true",
            "--user",
            f"{settings.DOCKER_RUN_AS_UID}:{settings.DOCKER_RUN_AS_GID}",
            "-v",
            f"{workdir}:{settings.DOCKER_WORKDIR}",
            "-w",
            settings.DOCKER_WORKDIR,
        ]

        if settings.DOCKER_SECCOMP_PROFILE:
            create_cmd.extend(
                ["--security-opt", f"seccomp={settings.DOCKER_SECCOMP_PROFILE}"]
            )

        create_cmd.extend([image, "sh", "-lc", wrapped_command])

        create_result = await self._run_local_command(create_cmd, timeout_sec=20)
        if create_result.returncode != 0:
            raise RuntimeError(f"Failed to create sandbox container: {create_result.stderr}")

        container_id = create_result.stdout.strip()
        start_cmd = [settings.DOCKER_BINARY, "start", "-a", "-i", container_id]

        started_at = time.monotonic()
        try:
            run_result = await self._run_local_command(
                start_cmd,
                stdin_data=stdin_data,
                timeout_sec=timeout_sec,
            )
            elapsed_ms = int((time.monotonic() - started_at) * 1000)
            memory_mb, cleaned_stderr = self._extract_memory_mb(run_result.stderr)

            return RunResult(
                exit_code=run_result.returncode,
                stdout=run_result.stdout,
                stderr=cleaned_stderr,
                elapsed_ms=elapsed_ms,
                memory_mb=memory_mb,
                timed_out=False,
            )

        except subprocess.TimeoutExpired:
            elapsed_ms = int((time.monotonic() - started_at) * 1000)
            await self._force_remove_container(container_name)
            return RunResult(
                exit_code=124,
                stdout="",
                stderr="Execution timed out",
                elapsed_ms=elapsed_ms,
                memory_mb=0,
                timed_out=True,
            )

        finally:
            await self._force_remove_container(container_name)

    @staticmethod
    def _write_test_files(workdir: Path, test_cases: list[dict]) -> None:
        """Materialize test cases under workspace/tests for auditing/debugging."""
        tests_dir = workdir / "tests"
        tests_dir.mkdir(exist_ok=True)

        for idx, test_case in enumerate(test_cases, start=1):
            (tests_dir / f"case_{idx}.in").write_text(
                str(test_case.get("input", "")),
                encoding="utf-8",
            )
            (tests_dir / f"case_{idx}.out").write_text(
                str(test_case.get("expected_output", "")),
                encoding="utf-8",
            )

    @staticmethod
    def _wrap_with_time_probe(command: str) -> str:
        """Wrap command with max RSS collection when GNU time exists."""
        quoted = shlex.quote(command)
        return (
            "if command -v /usr/bin/time >/dev/null 2>&1; then "
            f"/usr/bin/time -f '{MAX_RSS_MARKER}%M' sh -lc {quoted}; "
            f"else sh -lc {quoted}; fi"
        )

    @staticmethod
    def _extract_memory_mb(stderr: str) -> tuple[int, str]:
        """Parse memory marker from stderr and return cleaned stderr text."""
        lines = stderr.splitlines()
        memory_kb = 0
        kept: list[str] = []

        for line in lines:
            if line.startswith(MAX_RSS_MARKER):
                raw = line[len(MAX_RSS_MARKER) :].strip()
                if raw.isdigit():
                    memory_kb = max(memory_kb, int(raw))
                continue
            kept.append(line)

        cleaned = "\n".join(kept).strip()
        memory_mb = max(0, math.ceil(memory_kb / 1024))
        return memory_mb, cleaned

    @staticmethod
    def _looks_like_mle(stderr: str) -> bool:
        """Best-effort memory-limit detection based on runtime stderr."""
        lowered = stderr.lower()
        return "out of memory" in lowered or "cannot allocate memory" in lowered

    @staticmethod
    def _trim_error(text: str, max_chars: int = 2000) -> str:
        """Keep error messages useful and bounded in DB."""
        if not text:
            return "Execution failed"
        text = text.strip()
        return text if len(text) <= max_chars else text[: max_chars - 3] + "..."

    @staticmethod
    def _normalize_output(text: str, *, normalize_ws: bool, case_sensitive: bool) -> str:
        """Normalize output according to comparison settings."""
        normalized = text.replace("\r\n", "\n").replace("\r", "\n")

        if normalize_ws:
            normalized = "\n".join(" ".join(line.split()) for line in normalized.split("\n"))
        else:
            normalized = "\n".join(line.rstrip() for line in normalized.split("\n"))

        if not case_sensitive:
            normalized = normalized.lower()

        return normalized.strip("\n")

    def _compare_output(self, actual: str, expected: str, options: dict[str, Any]) -> bool:
        """Compare outputs using exact/whitespace/case/float-aware modes."""
        normalize_ws = bool(
            options.get(
                "normalize_whitespace",
                settings.COMPARE_NORMALIZE_WHITESPACE,
            )
        )
        ignore_trailing = bool(
            options.get(
                "ignore_trailing_whitespace",
                settings.COMPARE_IGNORE_TRAILING_WHITESPACE,
            )
        )
        case_sensitive = bool(
            options.get("case_sensitive", settings.COMPARE_CASE_SENSITIVE)
        )
        float_tolerance = options.get("float_tolerance")

        if float_tolerance is None:
            rel_tol = settings.COMPARE_FLOAT_REL_TOL
            abs_tol = settings.COMPARE_FLOAT_ABS_TOL
        else:
            tol = float(float_tolerance)
            rel_tol = tol
            abs_tol = tol

        left = self._normalize_output(
            actual,
            normalize_ws=normalize_ws,
            case_sensitive=case_sensitive,
        )
        right = self._normalize_output(
            expected,
            normalize_ws=normalize_ws,
            case_sensitive=case_sensitive,
        )

        if not ignore_trailing:
            left = left + "\n" if actual.endswith("\n") else left
            right = right + "\n" if expected.endswith("\n") else right

        if left == right:
            return True

        return self._float_aware_compare(left, right, rel_tol=rel_tol, abs_tol=abs_tol)

    @staticmethod
    def _float_aware_compare(actual: str, expected: str, *, rel_tol: float, abs_tol: float) -> bool:
        """Compare token by token, allowing tolerances for numeric tokens."""
        actual_tokens = actual.split()
        expected_tokens = expected.split()

        if len(actual_tokens) != len(expected_tokens):
            return False

        for a_tok, e_tok in zip(actual_tokens, expected_tokens):
            if a_tok == e_tok:
                continue

            if FLOAT_TOKEN.fullmatch(a_tok) and FLOAT_TOKEN.fullmatch(e_tok):
                if not math.isclose(float(a_tok), float(e_tok), rel_tol=rel_tol, abs_tol=abs_tol):
                    return False
                continue

            return False

        return True

    async def _force_remove_container(self, container_name: str) -> None:
        """Best-effort cleanup for containers after run/timeout."""
        cmd = [settings.DOCKER_BINARY, "rm", "-f", container_name]
        try:
            await self._run_local_command(cmd, timeout_sec=10)
        except Exception:
            logger.warning("Failed to cleanup container %s", container_name)

    async def _run_local_command(
        self,
        cmd: list[str],
        stdin_data: str | None = None,
        timeout_sec: float | None = None,
    ) -> subprocess.CompletedProcess[str]:
        """Run host command from async flow without blocking the event loop."""

        def _invoke() -> subprocess.CompletedProcess[str]:
            return subprocess.run(
                cmd,
                input=stdin_data,
                capture_output=True,
                text=True,
                timeout=timeout_sec,
                check=False,
            )

        return await asyncio.to_thread(_invoke)
