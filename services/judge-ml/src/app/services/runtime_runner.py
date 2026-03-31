"""Stdlib-only subprocess runner for ML submissions."""

from __future__ import annotations

import builtins as py_builtins
import io
import json
import math
import sys
import traceback
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path
from types import ModuleType
from typing import Any

try:
    import resource
except ImportError:  # pragma: no cover
    resource = None  # type: ignore[assignment]

SAFE_BUILTIN_NAMES = {
    "ArithmeticError",
    "AssertionError",
    "AttributeError",
    "Exception",
    "ImportError",
    "IndexError",
    "KeyError",
    "LookupError",
    "NameError",
    "NotImplementedError",
    "RuntimeError",
    "StopIteration",
    "TypeError",
    "ValueError",
    "ZeroDivisionError",
    "__build_class__",
    "abs",
    "all",
    "any",
    "bool",
    "bytearray",
    "bytes",
    "callable",
    "classmethod",
    "dict",
    "divmod",
    "enumerate",
    "filter",
    "float",
    "frozenset",
    "getattr",
    "hasattr",
    "hash",
    "int",
    "isinstance",
    "issubclass",
    "iter",
    "len",
    "list",
    "map",
    "max",
    "min",
    "next",
    "object",
    "pow",
    "print",
    "property",
    "range",
    "repr",
    "reversed",
    "round",
    "set",
    "setattr",
    "slice",
    "sorted",
    "staticmethod",
    "str",
    "sum",
    "super",
    "tuple",
    "zip",
}
ALLOWED_IMPORT_ROOTS = {
    "array",
    "base64",
    "bisect",
    "collections",
    "copy",
    "csv",
    "dataclasses",
    "datetime",
    "decimal",
    "enum",
    "fractions",
    "functools",
    "hashlib",
    "heapq",
    "io",
    "itertools",
    "json",
    "math",
    "numbers",
    "numpy",
    "operator",
    "pandas",
    "random",
    "re",
    "scipy",
    "sklearn",
    "statistics",
    "string",
    "textwrap",
    "time",
    "typing",
    "uuid",
    "warnings",
}
BLOCKED_IMPORT_ROOTS = {
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
OUTPUT_FILE_LIMIT_MB = 8


def _restricted_import(
    name: str,
    globals: dict[str, Any] | None = None,
    locals: dict[str, Any] | None = None,
    fromlist: tuple[str, ...] | list[str] = (),
    level: int = 0,
) -> Any:
    if level:
        raise ImportError("Relative imports are not allowed in judge-ml")

    root = name.split(".", 1)[0].lower()
    if root in BLOCKED_IMPORT_ROOTS:
        raise ImportError(f"Import of '{root}' is not allowed in judge-ml")
    if root not in ALLOWED_IMPORT_ROOTS:
        raise ImportError(f"Import of '{root}' is not permitted in judge-ml")
    return py_builtins.__import__(name, globals, locals, fromlist, level)


def _safe_builtins() -> dict[str, Any]:
    builtins_dict = {
        name: getattr(py_builtins, name)
        for name in SAFE_BUILTIN_NAMES
    }
    builtins_dict["__import__"] = _restricted_import
    return builtins_dict


def _apply_limits(time_limit_ms: int, memory_limit_mb: int) -> None:
    if resource is None:
        return

    cpu_seconds = max(1, math.ceil(time_limit_ms / 1000))
    resource.setrlimit(resource.RLIMIT_CPU, (cpu_seconds + 1, cpu_seconds + 1))
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
    resource.setrlimit(
        resource.RLIMIT_FSIZE,
        (OUTPUT_FILE_LIMIT_MB * 1024 * 1024, OUTPUT_FILE_LIMIT_MB * 1024 * 1024),
    )
    if memory_limit_mb > 0:
        bytes_limit = memory_limit_mb * 1024 * 1024
        resource.setrlimit(resource.RLIMIT_AS, (bytes_limit, bytes_limit))


def _peak_memory_mb() -> int:
    if resource is None:
        return 0

    peak = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    if sys.platform == "darwin":
        peak = peak / (1024 * 1024)
    else:
        peak = peak / 1024
    return max(0, int(peak))


def _coerce_metrics(value: Any) -> dict[str, float]:
    if not isinstance(value, dict):
        return {}

    metrics: dict[str, float] = {}
    for key, metric_value in value.items():
        if isinstance(key, str) and isinstance(metric_value, (int, float)):
            metrics[key.lower()] = float(metric_value)
    return metrics


def _extract_metrics(namespace: dict[str, Any], entrypoint_result: Any) -> dict[str, float]:
    metrics: dict[str, float] = {}
    for name in ("metrics", "results", "scores", "evaluation"):
        metrics.update(_coerce_metrics(namespace.get(name)))
    metrics.update(_coerce_metrics(entrypoint_result))
    return metrics


def _artifact_names(namespace: dict[str, Any]) -> list[str]:
    artifacts: list[str] = []
    for key, value in namespace.items():
        if key.startswith("__"):
            continue
        if isinstance(value, ModuleType):
            continue
        artifacts.append(key)
    return sorted(set(artifacts))


def main() -> int:
    payload_path = Path(sys.argv[1])
    result_path = Path(sys.argv[2])
    payload = json.loads(payload_path.read_text(encoding="utf-8"))

    stdout_buffer = io.StringIO()
    stderr_buffer = io.StringIO()

    try:
        _apply_limits(
            int(payload.get("time_limit_ms", 1000)),
            int(payload.get("memory_limit_mb", 256)),
        )

        source = str(payload.get("source") or "")
        bootstrap_code = str(payload.get("bootstrap_code") or "")
        entrypoint = payload.get("entrypoint")
        entrypoint_args = payload.get("entrypoint_args") or []
        entrypoint_kwargs = payload.get("entrypoint_kwargs") or {}

        namespace: dict[str, Any] = {
            "__name__": "__main__",
            "__builtins__": _safe_builtins(),
        }

        with redirect_stdout(stdout_buffer), redirect_stderr(stderr_buffer):
            if bootstrap_code.strip():
                exec(compile(bootstrap_code, "<ml-bootstrap>", "exec"), namespace, namespace)

            exec(compile(source, "<ml-submission>", "exec"), namespace, namespace)

            entrypoint_result = None
            if isinstance(entrypoint, str) and entrypoint:
                target = namespace.get(entrypoint)
                if not callable(target):
                    raise RuntimeError(f"Configured entrypoint '{entrypoint}' is not callable")
                entrypoint_result = target(*entrypoint_args, **entrypoint_kwargs)

        result = {
            "status": "ok",
            "metrics": _extract_metrics(namespace, entrypoint_result),
            "artifacts": _artifact_names(namespace),
            "execution_memory_mb": _peak_memory_mb(),
            "stdout": stdout_buffer.getvalue(),
            "stderr": stderr_buffer.getvalue(),
        }
    except SyntaxError as exc:
        result = {
            "status": "syntax_error",
            "error_message": f"{exc.msg} (line {exc.lineno})",
            "execution_memory_mb": _peak_memory_mb(),
            "stdout": stdout_buffer.getvalue(),
            "stderr": stderr_buffer.getvalue(),
        }
    except MemoryError:
        result = {
            "status": "memory_error",
            "error_message": "Memory limit exceeded during execution",
            "execution_memory_mb": _peak_memory_mb(),
            "stdout": stdout_buffer.getvalue(),
            "stderr": stderr_buffer.getvalue(),
        }
    except Exception as exc:  # pragma: no cover
        result = {
            "status": "runtime_error",
            "error_message": str(exc),
            "error_type": exc.__class__.__name__,
            "traceback": traceback.format_exc(),
            "execution_memory_mb": _peak_memory_mb(),
            "stdout": stdout_buffer.getvalue(),
            "stderr": stderr_buffer.getvalue(),
        }

    result_path.write_text(json.dumps(result), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
