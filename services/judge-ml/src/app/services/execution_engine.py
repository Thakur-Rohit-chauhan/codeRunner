"""Production ML execution engine."""

from __future__ import annotations

import asyncio
import ast
import json
import os
import re
import shutil
import subprocess
import sys
import time
import uuid
from pathlib import Path
from typing import Any

from app.logger import get_logger

logger = get_logger(__name__)


class ExecutionEngine:
    """Execute notebook/python submissions and evaluate real runtime output."""

    _SUPPORTED_LANGUAGES = {"python", "notebook"}
    _DEFAULT_TRAINING_KEYWORDS = ("fit(", "train(", "trainer.train(", "model.fit(")
    _DEFAULT_EVALUATION_KEYWORDS = ("predict(", "evaluate(", "score(", "cross_val_score(")
    _DEFAULT_IMPORTS = ("sklearn", "tensorflow", "keras", "torch", "xgboost", "lightgbm", "pandas", "numpy")
    _BLOCKED_IMPORTS = {
        "asyncio",
        "builtins",
        "concurrent",
        "ctypes",
        "ftplib",
        "http",
        "importlib",
        "inspect",
        "multiprocessing",
        "os",
        "pathlib",
        "pickle",
        "pty",
        "requests",
        "resource",
        "selectors",
        "shutil",
        "signal",
        "socket",
        "ssl",
        "subprocess",
        "sys",
        "tempfile",
        "threading",
        "urllib",
        "webbrowser",
    }
    _BLOCKED_CALLS = {"breakpoint", "compile", "eval", "exec", "__import__", "input", "open"}
    _BLOCKED_ATTRIBUTES = {"__closure__", "__code__", "__getattribute__", "__globals__", "__subclasses__"}
    _RUNNER_TIMEOUT_BUFFER_MS = 1500
    _MAX_LOG_CAPTURE_CHARS = 8000

    async def execute(
        self,
        code: str,
        language: str,
        test_cases: list[dict],
        problem: dict | None = None,
        time_limit: int = 1000,
        memory_limit: int = 256,
    ) -> dict[str, Any]:
        """Execute a submission against metadata and hidden ML checks."""
        problem = problem or {}
        metadata = problem.get("metadata") or {}

        normalized = self._normalize_submission(code, language)
        if not normalized["ok"]:
            logger.warning("Invalid ML submission format (%s)", normalized["error"])
            return self._error_result("CE", normalized["error"])

        source = normalized["source"]
        policy_error = self._validate_source_policy(source)
        if policy_error:
            logger.warning("Rejected ML submission due to execution policy: %s", policy_error)
            return self._error_result("CE", policy_error)

        runtime = await self._execute_in_subprocess(
            source=source,
            bootstrap_code=str(metadata.get("setup_code") or metadata.get("bootstrap_code") or ""),
            entrypoint=metadata.get("entrypoint"),
            entrypoint_args=self._as_list(metadata.get("entrypoint_args")),
            entrypoint_kwargs=metadata.get("entrypoint_kwargs") if isinstance(metadata.get("entrypoint_kwargs"), dict) else {},
            time_limit=time_limit,
            memory_limit=memory_limit,
        )
        if not runtime["ok"]:
            logger.warning("ML runtime execution failed: %s", runtime["error_message"])
            return self._error_result(
                runtime["verdict"],
                runtime["error_message"],
                execution_time=runtime["execution_time"],
                execution_memory=runtime["execution_memory"],
            )

        features = self._extract_features(
            source=source,
            raw_submission=code,
            notebook_info=normalized,
            runtime_result=runtime,
        )
        checks = self._build_checks(metadata, test_cases) or self._default_checks()

        logger.info("Evaluating ML submission (%s) against %d checks", language, len(checks))

        test_passed = 0
        failure_messages: list[str] = []
        for index, check in enumerate(checks, 1):
            passed, message = self._evaluate_check(check, features)
            if passed:
                test_passed += 1
                logger.info("  Check %d/%d: AC - %s", index, len(checks), message)
            else:
                failure_messages.append(message)
                logger.info("  Check %d/%d: WA - %s", index, len(checks), message)

        verdict = "AC" if test_passed == len(checks) else "WA"
        return {
            "verdict": verdict,
            "test_passed": test_passed,
            "test_total": len(checks),
            "execution_time": runtime["execution_time"],
            "execution_memory": runtime["execution_memory"],
            "error_message": None if verdict == "AC" else failure_messages[0],
        }

    def _normalize_submission(self, code: str, language: str) -> dict[str, Any]:
        """Parse a Python script or notebook JSON into executable source."""
        if not code or not code.strip():
            return {"ok": False, "error": "Submission is empty"}
        if language not in self._SUPPORTED_LANGUAGES:
            return {"ok": False, "error": f"Unsupported ML submission language: {language}"}

        if language == "python":
            try:
                compile(code, "<ml-submission>", "exec")
            except SyntaxError as exc:
                return {"ok": False, "error": f"Syntax error in submitted code: {exc.msg}"}
            return {"ok": True, "source": code, "notebook_cell_count": 1, "markdown_cell_count": 0}

        try:
            notebook = json.loads(code)
        except json.JSONDecodeError as exc:
            return {"ok": False, "error": f"Notebook JSON is invalid: {exc.msg}"}
        if not isinstance(notebook, dict) or not isinstance(notebook.get("cells"), list):
            return {"ok": False, "error": "Notebook submission must contain a 'cells' list"}

        code_cells: list[str] = []
        markdown_cells = 0
        for cell in notebook["cells"]:
            if not isinstance(cell, dict):
                continue
            source = cell.get("source", [])
            source_text = "".join(str(part) for part in source) if isinstance(source, list) else str(source)
            if cell.get("cell_type") == "code":
                code_cells.append(source_text)
            elif cell.get("cell_type") == "markdown":
                markdown_cells += 1

        if not code_cells:
            return {"ok": False, "error": "Notebook submission has no code cells"}

        normalized_source = "\n\n".join(code_cells)
        try:
            compile(normalized_source, "<ml-notebook>", "exec")
        except SyntaxError as exc:
            return {"ok": False, "error": f"Notebook code failed syntax validation: {exc.msg}"}

        return {
            "ok": True,
            "source": normalized_source,
            "notebook_cell_count": len(code_cells),
            "markdown_cell_count": markdown_cells,
        }

    def _validate_source_policy(self, source: str) -> str | None:
        tree = ast.parse(source)
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    root = alias.name.split(".")[0].lower()
                    if root in self._BLOCKED_IMPORTS:
                        return f"Forbidden import detected: {root}"
            elif isinstance(node, ast.ImportFrom) and node.module:
                root = node.module.split(".")[0].lower()
                if root in self._BLOCKED_IMPORTS:
                    return f"Forbidden import detected: {root}"
            elif isinstance(node, ast.Call):
                call_name = self._call_name(node.func)
                if call_name in self._BLOCKED_CALLS:
                    return f"Forbidden runtime call detected: {call_name}"
            elif isinstance(node, ast.Attribute) and node.attr in self._BLOCKED_ATTRIBUTES:
                return f"Forbidden attribute access detected: {node.attr}"
        return None

    async def _execute_in_subprocess(
        self,
        *,
        source: str,
        bootstrap_code: str,
        entrypoint: Any,
        entrypoint_args: list[Any],
        entrypoint_kwargs: dict[str, Any],
        time_limit: int,
        memory_limit: int,
    ) -> dict[str, Any]:
        runner_path = Path(__file__).with_name("runtime_runner.py")
        timeout_seconds = max(1.0, (time_limit + self._RUNNER_TIMEOUT_BUFFER_MS) / 1000)
        temp_root = self._resolve_temp_root()

        temp_path = temp_root / f"judge-ml-{uuid.uuid4().hex}"
        temp_path.mkdir(parents=True, exist_ok=False)
        try:
            payload_path = temp_path / "payload.json"
            result_path = temp_path / "result.json"
            payload = {
                "source": source,
                "bootstrap_code": bootstrap_code,
                "entrypoint": entrypoint if isinstance(entrypoint, str) else None,
                "entrypoint_args": entrypoint_args,
                "entrypoint_kwargs": entrypoint_kwargs,
                "time_limit_ms": time_limit,
                "memory_limit_mb": memory_limit,
            }
            payload_path.write_text(json.dumps(payload), encoding="utf-8")

            env = {
                "PATH": os.environ.get("PATH", ""),
                "PYTHONUNBUFFERED": "1",
                "PYTHONDONTWRITEBYTECODE": "1",
                "PYTHONNOUSERSITE": "1",
                "HOME": str(temp_path),
                "JOBLIB_TEMP_FOLDER": str(temp_path),
                "MPLCONFIGDIR": str(temp_path),
                "NUMEXPR_NUM_THREADS": "1",
                "OMP_NUM_THREADS": "1",
                "OPENBLAS_NUM_THREADS": "1",
                "MKL_NUM_THREADS": "1",
                "PYTHONHASHSEED": "0",
            }
            if os.name == "nt":
                env["SYSTEMROOT"] = os.environ.get("SYSTEMROOT", "")
                env["WINDIR"] = os.environ.get("WINDIR", "")
                env["TEMP"] = str(temp_path)
                env["TMP"] = str(temp_path)

            stdout_path = temp_path / "stdout.log"
            stderr_path = temp_path / "stderr.log"
            start = time.monotonic()
            try:
                with stdout_path.open("w", encoding="utf-8") as stdout_handle, stderr_path.open("w", encoding="utf-8") as stderr_handle:
                    completed = await asyncio.to_thread(
                        subprocess.run,
                        [
                            sys.executable,
                            "-I",
                            str(runner_path),
                            str(payload_path),
                            str(result_path),
                        ],
                        cwd=str(temp_path),
                        env=env,
                        stdout=stdout_handle,
                        stderr=stderr_handle,
                        timeout=timeout_seconds,
                        check=False,
                    )
            except subprocess.TimeoutExpired:
                elapsed = int((time.monotonic() - start) * 1000)
                return {
                    "ok": False,
                    "verdict": "TLE",
                    "execution_time": elapsed,
                    "execution_memory": memory_limit,
                    "error_message": f"Time limit exceeded after {elapsed}ms",
                }

            elapsed = int((time.monotonic() - start) * 1000)
            stdout_text = self._read_limited_text(stdout_path)
            stderr_text = self._read_limited_text(stderr_path)

            runner_result: dict[str, Any] | None = None
            if result_path.exists():
                try:
                    runner_result = json.loads(result_path.read_text(encoding="utf-8"))
                except json.JSONDecodeError:
                    runner_result = None

            if not runner_result:
                message = stderr_text.strip() or stdout_text.strip() or "Execution process failed without a result payload"
                if completed.returncode not in (0, None):
                    message = f"{message} (exit={completed.returncode})"
                return {"ok": False, "verdict": "RE", "execution_time": elapsed, "execution_memory": 0, "error_message": message}

            peak_memory = int(runner_result.get("execution_memory_mb") or 0)
            status = str(runner_result.get("status", "runtime_error"))
            error_message = str(runner_result.get("error_message") or "").strip()

            if status == "ok":
                if peak_memory > memory_limit > 0:
                    return {
                        "ok": False,
                        "verdict": "MLE",
                        "execution_time": elapsed,
                        "execution_memory": peak_memory,
                        "error_message": f"Memory limit exceeded ({peak_memory}MB > {memory_limit}MB)",
                    }
                if elapsed > time_limit:
                    return {
                        "ok": False,
                        "verdict": "TLE",
                        "execution_time": elapsed,
                        "execution_memory": peak_memory,
                        "error_message": f"Time limit exceeded ({elapsed}ms > {time_limit}ms)",
                    }
                return {
                    "ok": True,
                    "execution_time": elapsed,
                    "execution_memory": peak_memory,
                    "metrics": runner_result.get("metrics") or {},
                    "artifacts": runner_result.get("artifacts") or [],
                    "stdout": self._truncate_text(str(runner_result.get("stdout") or stdout_text)),
                    "stderr": self._truncate_text(str(runner_result.get("stderr") or stderr_text)),
                }

            verdict = "CE" if status == "syntax_error" else "MLE" if status == "memory_error" else "RE"
            return {
                "ok": False,
                "verdict": verdict,
                "execution_time": elapsed,
                "execution_memory": peak_memory,
                "error_message": self._truncate_text(error_message or stderr_text or stdout_text or "Execution failed"),
            }
        finally:
            shutil.rmtree(temp_path, ignore_errors=True)

    def _extract_features(
        self,
        *,
        source: str,
        raw_submission: str,
        notebook_info: dict[str, Any],
        runtime_result: dict[str, Any],
    ) -> dict[str, Any]:
        tree = ast.parse(source)
        imports: set[str] = set()
        functions: set[str] = set()
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                functions.add(node.name)
            elif isinstance(node, ast.Import):
                for alias in node.names:
                    imports.add(alias.name.split(".")[0].lower())
            elif isinstance(node, ast.ImportFrom) and node.module:
                imports.add(node.module.split(".")[0].lower())

        return {
            "lower_source": source.lower(),
            "imports": imports,
            "functions": functions,
            "metrics": runtime_result.get("metrics") or self._extract_metrics(source, raw_submission),
            "artifacts": set(str(item) for item in runtime_result.get("artifacts") or []),
            "notebook_cell_count": notebook_info.get("notebook_cell_count", 0),
        }

    def _extract_metrics(self, source: str, raw_submission: str) -> dict[str, float]:
        metrics: dict[str, float] = {}
        tree = ast.parse(source)
        metric_targets = {"metrics", "results", "scores", "evaluation"}
        for node in ast.walk(tree):
            if not isinstance(node, ast.Assign):
                continue
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id.lower() in metric_targets:
                    literal = self._literal_dict(node.value)
                    if literal:
                        metrics.update(literal)
        for match in re.finditer(r"metrics\s*[:=]\s*(\{[^\n]+\})", raw_submission, flags=re.IGNORECASE):
            try:
                literal = ast.literal_eval(match.group(1))
            except (SyntaxError, ValueError):
                continue
            if isinstance(literal, dict):
                metrics.update(self._coerce_numeric_metrics(literal))
        return metrics

    def _build_checks(self, metadata: dict[str, Any], test_cases: list[dict]) -> list[dict[str, Any]]:
        checks: list[dict[str, Any]] = []
        if values := self._as_list(metadata.get("required_keywords")):
            checks.append({"type": "keyword_all", "values": values, "description": "required ML pipeline keywords"})
        if values := self._as_list(metadata.get("required_any_keywords")):
            checks.append({"type": "keyword_any", "values": values, "description": "at least one required ML keyword"})
        if values := self._as_list(metadata.get("forbidden_keywords")):
            checks.append({"type": "forbidden_keywords", "values": values, "description": "forbidden implementation patterns"})
        if values := self._as_list(metadata.get("required_functions")):
            checks.append({"type": "function_defined", "values": values, "description": "required helper functions"})
        if values := self._as_list(metadata.get("required_imports")):
            checks.append({"type": "import_present", "values": values, "description": "required ML imports"})
        if values := self._as_list(metadata.get("required_artifacts") or metadata.get("required_variables")):
            checks.append({"type": "artifact_present", "values": values, "description": "required runtime artifacts"})
        if framework := metadata.get("framework"):
            checks.append({"type": "keyword_any", "values": self._as_list(framework), "description": "framework usage"})
        expected_metrics = metadata.get("expected_metrics") or metadata.get("required_metrics")
        if isinstance(expected_metrics, dict):
            for metric_name, threshold in expected_metrics.items():
                if isinstance(metric_name, str) and isinstance(threshold, (int, float)):
                    checks.append({"type": "metric_threshold", "metric": metric_name, "min": float(threshold), "description": f"{metric_name} threshold"})
        minimum_cells = metadata.get("minimum_cells")
        if isinstance(minimum_cells, int) and minimum_cells > 0:
            checks.append({"type": "notebook_cells_min", "min": minimum_cells, "description": "minimum notebook cell count"})
        for index, test_case in enumerate(test_cases, 1):
            check = self._parse_test_case_check(test_case, index)
            if check:
                checks.append(check)
        return checks

    def _parse_test_case_check(self, test_case: dict[str, Any], index: int) -> dict[str, Any] | None:
        input_data = (test_case.get("input") or "").strip()
        expected_output = (test_case.get("expected_output") or "").strip()
        hidden_prefix = "hidden" if test_case.get("hidden") else "visible"
        for candidate in (input_data, expected_output):
            if not candidate:
                continue
            try:
                spec = json.loads(candidate)
            except json.JSONDecodeError:
                continue
            if isinstance(spec, dict) and "type" in spec:
                spec["description"] = spec.get("description", f"{hidden_prefix} ML test case {index}")
                return spec
        keyword = expected_output or input_data
        if keyword:
            return {"type": "keyword_any", "values": [keyword], "description": f"{hidden_prefix} ML test case {index}"}
        return None

    def _default_checks(self) -> list[dict[str, Any]]:
        return [
            {"type": "keyword_any", "values": list(self._DEFAULT_TRAINING_KEYWORDS), "description": "training step present"},
            {"type": "keyword_any", "values": list(self._DEFAULT_EVALUATION_KEYWORDS), "description": "evaluation step present"},
            {"type": "import_present", "values": list(self._DEFAULT_IMPORTS), "description": "ML-related imports present"},
        ]

    def _evaluate_check(self, check: dict[str, Any], features: dict[str, Any]) -> tuple[bool, str]:
        check_type = check.get("type")
        description = str(check.get("description") or check_type or "check")
        lower_source = features["lower_source"]
        imports = features["imports"]
        functions = features["functions"]
        metrics = features["metrics"]
        artifacts = features["artifacts"]

        if check_type == "keyword_all":
            values = [str(value).lower() for value in self._as_list(check.get("values"))]
            missing = [value for value in values if value not in lower_source]
            return (not missing, description if not missing else f"{description} missing: {', '.join(missing)}")
        if check_type == "keyword_any":
            values = [str(value).lower() for value in self._as_list(check.get("values"))]
            return (any(value in lower_source for value in values), description if any(value in lower_source for value in values) else f"{description} not satisfied")
        if check_type == "forbidden_keywords":
            values = [str(value).lower() for value in self._as_list(check.get("values"))]
            found = [value for value in values if value in lower_source]
            return (not found, description if not found else f"{description} found forbidden keyword(s): {', '.join(found)}")
        if check_type == "function_defined":
            values = [str(value) for value in self._as_list(check.get("values"))]
            missing = [value for value in values if value not in functions]
            return (not missing, description if not missing else f"{description} missing function(s): {', '.join(missing)}")
        if check_type == "import_present":
            values = [str(value).lower() for value in self._as_list(check.get("values"))]
            missing = [value for value in values if value not in imports and value not in lower_source]
            return (not missing, description if not missing else f"{description} missing import(s): {', '.join(missing)}")
        if check_type == "artifact_present":
            values = [str(value) for value in self._as_list(check.get("values"))]
            missing = [value for value in values if value not in artifacts]
            return (not missing, description if not missing else f"{description} missing artifact(s): {', '.join(missing)}")
        if check_type == "metric_threshold":
            metric_name = str(check.get("metric", "")).lower()
            minimum = float(check.get("min", 0.0))
            metric_value = metrics.get(metric_name)
            if metric_value is None:
                return False, f"{description} missing metric '{metric_name}'"
            if metric_value < minimum:
                return False, f"{description} expected >= {minimum}, got {metric_value}"
            return True, f"{description} ({metric_name}={metric_value})"
        if check_type == "notebook_cells_min":
            minimum = int(check.get("min", 0))
            actual = int(features["notebook_cell_count"])
            return (actual >= minimum, description if actual >= minimum else f"{description} expected at least {minimum} code cells, got {actual}")
        return False, f"Unsupported ML check type: {check_type}"

    def _literal_dict(self, node: ast.AST) -> dict[str, float]:
        try:
            value = ast.literal_eval(node)
        except (SyntaxError, ValueError):
            return {}
        return self._coerce_numeric_metrics(value) if isinstance(value, dict) else {}

    @staticmethod
    def _coerce_numeric_metrics(value: dict[Any, Any]) -> dict[str, float]:
        metrics: dict[str, float] = {}
        for key, metric_value in value.items():
            if isinstance(key, str) and isinstance(metric_value, (int, float)):
                metrics[key.lower()] = float(metric_value)
        return metrics

    @classmethod
    def _truncate_text(cls, value: str) -> str:
        if len(value) <= cls._MAX_LOG_CAPTURE_CHARS:
            return value
        return f"{value[:cls._MAX_LOG_CAPTURE_CHARS]}... [truncated]"

    @classmethod
    def _read_limited_text(cls, path: Path) -> str:
        if not path.exists():
            return ""
        with path.open("r", encoding="utf-8", errors="replace") as handle:
            return cls._truncate_text(handle.read(cls._MAX_LOG_CAPTURE_CHARS + 1))

    @staticmethod
    def _resolve_temp_root() -> Path:
        candidates: list[Path] = []
        if configured_root := os.environ.get("JUDGE_ML_WORKDIR"):
            candidates.append(Path(configured_root))
        candidates.append(Path.cwd() / ".judge-ml-runtime")
        candidates.append(Path.home() / ".judge-ml-runtime")

        for candidate in candidates:
            try:
                candidate.mkdir(parents=True, exist_ok=True)
                return candidate
            except PermissionError:
                continue

        raise PermissionError("Unable to create a writable runtime directory for judge-ml")

    @staticmethod
    def _call_name(node: ast.AST) -> str | None:
        if isinstance(node, ast.Name):
            return node.id
        if isinstance(node, ast.Attribute):
            return node.attr
        return None

    @staticmethod
    def _error_result(verdict: str, error_message: str | None, *, execution_time: int = 0, execution_memory: int = 0) -> dict[str, Any]:
        return {
            "verdict": verdict,
            "test_passed": 0,
            "test_total": 0,
            "execution_time": execution_time,
            "execution_memory": execution_memory,
            "error_message": error_message,
        }

    @staticmethod
    def _as_list(value: Any) -> list[Any]:
        if value is None:
            return []
        if isinstance(value, list):
            return value
        if isinstance(value, tuple):
            return list(value)
        return [value]
