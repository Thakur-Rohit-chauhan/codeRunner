from __future__ import annotations

import asyncio
import ast
from dataclasses import dataclass, field
import json
import os
from pathlib import Path
import shutil
import sys
import textwrap
import time
import uuid
from typing import Any

from .problem_catalog import PROBLEM_CATALOG, get_problem


def _default_problem_for_domain(domain: str) -> dict[str, Any]:
    for problem in PROBLEM_CATALOG:
        if problem.get("domain") == domain:
            return problem
    raise LookupError(f"No default problem is available for domain {domain}")


def _ensure_problem(problem_id: int | None, domain: str) -> dict[str, Any]:
    problem = get_problem(problem_id)
    if problem is None:
        return _default_problem_for_domain(domain)
    if problem.get("domain") != domain:
        raise ValueError(f"Problem {problem_id} does not belong to the {domain} domain")
    return problem


def _runtime_root() -> Path:
    candidates = [
        Path.cwd() / ".judge-runtime",
        Path.home() / ".judge-runtime",
    ]
    for candidate in candidates:
        try:
            candidate.mkdir(parents=True, exist_ok=True)
            return candidate
        except PermissionError:
            continue
    raise PermissionError("Unable to create a writable judge runtime directory")


def _format_score(value: float, max_score: float) -> float:
    return round(max(0.0, min(float(max_score), float(value))), 2)


def _normalize_output(value: str) -> str:
    text = str(value or "").strip()
    if not text:
        return ""

    for parser in (json.loads, ast.literal_eval):
        try:
            parsed = parser(text)
        except Exception:
            continue
        return json.dumps(parsed, sort_keys=True, separators=(",", ":"))

    try:
        number = float(text)
    except ValueError:
        return "\n".join(line.rstrip() for line in text.splitlines()).strip()

    if number.is_integer():
        return str(int(number))
    return f"{number:.10f}".rstrip("0").rstrip(".")


def _output_matches(actual: str, expected: str) -> bool:
    return _normalize_output(actual) == _normalize_output(expected)


def _truncate(value: str, limit: int = 4000) -> str:
    if len(value) <= limit:
        return value
    return f"{value[:limit]}... [truncated]"


def _normalize_case_input(value: str | None) -> str:
    return str(value or "").replace("\r\n", "\n").rstrip()


@dataclass(slots=True)
class JudgeOutcome:
    status: str
    score: float
    stdout: str
    stderr: str
    metrics: dict[str, Any] = field(default_factory=dict)
    runtime_ms: int = 0
    memory_kb: int = 0
    passed: bool = False

    @classmethod
    def failed(
        cls,
        stderr: str,
        *,
        score: float = 0.0,
        metrics: dict[str, Any] | None = None,
        stdout: str = "",
        runtime_ms: int = 0,
        memory_kb: int = 0,
    ) -> "JudgeOutcome":
        return cls(
            status="failed",
            score=score,
            stdout=stdout,
            stderr=_truncate(stderr),
            metrics=metrics or {},
            runtime_ms=runtime_ms,
            memory_kb=memory_kb,
            passed=False,
        )


def _runtime_commands(language: str, workdir: Path) -> tuple[Path, list[str] | None, list[str]]:
    normalized = (language or "python").lower()
    if normalized == "python":
        source_path = workdir / "main.py"
        return source_path, None, [sys.executable, str(source_path)]
    if normalized == "cpp":
        compiler = shutil.which("g++")
        if not compiler:
            raise FileNotFoundError("g++ is not installed in the judge container")
        source_path = workdir / "main.cpp"
        binary_name = "main.exe" if os.name == "nt" else "main"
        binary_path = workdir / binary_name
        return (
            source_path,
            [compiler, "-std=c++17", "-O2", str(source_path), "-o", str(binary_path)],
            [str(binary_path)],
        )
    if normalized == "java":
        compiler = shutil.which("javac")
        runtime = shutil.which("java")
        if not compiler or not runtime:
            raise FileNotFoundError("Java compiler/runtime is not installed in the judge container")
        source_path = workdir / "Main.java"
        return source_path, [compiler, str(source_path)], [runtime, "-cp", str(workdir), "Main"]
    if normalized == "javascript":
        runtime = shutil.which("node")
        if not runtime:
            raise FileNotFoundError("Node.js is not installed in the judge container")
        source_path = workdir / "main.js"
        return source_path, None, [runtime, str(source_path)]
    raise ValueError(f"Unsupported language: {language}")


async def _communicate_process(
    command: list[str],
    *,
    cwd: Path,
    stdin_text: str = "",
    timeout_ms: int,
) -> dict[str, Any]:
    start = time.monotonic()
    process = await asyncio.create_subprocess_exec(
        *command,
        cwd=str(cwd),
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        stdout_bytes, stderr_bytes = await asyncio.wait_for(
            process.communicate((stdin_text or "").encode("utf-8")),
            timeout=max(1.0, timeout_ms / 1000),
        )
    except asyncio.TimeoutError:
        process.kill()
        stdout_bytes, stderr_bytes = await process.communicate()
        return {
            "timed_out": True,
            "returncode": process.returncode,
            "stdout": stdout_bytes.decode("utf-8", errors="replace"),
            "stderr": stderr_bytes.decode("utf-8", errors="replace"),
            "elapsed_ms": int((time.monotonic() - start) * 1000),
        }

    return {
        "timed_out": False,
        "returncode": process.returncode,
        "stdout": stdout_bytes.decode("utf-8", errors="replace"),
        "stderr": stderr_bytes.decode("utf-8", errors="replace"),
        "elapsed_ms": int((time.monotonic() - start) * 1000),
    }


async def _compile_and_run_code(
    *,
    source_text: str,
    language: str,
    cases: list[dict[str, Any]],
    time_limit_ms: int,
) -> JudgeOutcome:
    workdir = _runtime_root() / f"judge-code-{uuid.uuid4().hex}"
    workdir.mkdir(parents=True, exist_ok=False)
    try:
        source_path, compile_cmd, run_cmd = _runtime_commands(language, workdir)
        source_path.write_text(source_text, encoding="utf-8")

        if compile_cmd:
            compile_result = await _communicate_process(
                compile_cmd,
                cwd=workdir,
                timeout_ms=max(15000, time_limit_ms * 5),
            )
            if compile_result["timed_out"]:
                return JudgeOutcome.failed(
                    _truncate(compile_result["stderr"] or "Compilation timed out."),
                    metrics={"verdict": "compilation_timeout"},
                )
            if compile_result["returncode"] != 0:
                return JudgeOutcome.failed(
                    f"Compilation error:\n{_truncate(compile_result['stderr'] or compile_result['stdout'])}",
                    metrics={"verdict": "compilation_error"},
                )

        total_cases = len(cases)
        passed_cases = 0
        total_runtime_ms = 0
        last_stdout = ""
        case_results: list[dict[str, Any]] = []
        for index, case in enumerate(cases, start=1):
            run_result = await _communicate_process(
                run_cmd,
                cwd=workdir,
                stdin_text=str(case.get("input") or ""),
                timeout_ms=time_limit_ms,
            )
            total_runtime_ms += int(run_result["elapsed_ms"])
            last_stdout = run_result["stdout"]
            expected_output = case.get("expected_output")

            if run_result["timed_out"]:
                case_results.append(
                    {
                        "index": index,
                        "input": str(case.get("input") or ""),
                        "expected": str(expected_output or ""),
                        "stdout": _truncate(run_result["stdout"]),
                        "status": "Time Limit Exceeded",
                    }
                )
                return JudgeOutcome.failed(
                    _truncate(run_result["stderr"] or f"Time limit exceeded on test case {index}."),
                    metrics={
                        "verdict": "time_limit",
                        "tests_passed": passed_cases,
                        "tests_total": total_cases,
                        "case_results": case_results,
                    },
                    stdout=_truncate(run_result["stdout"]),
                    runtime_ms=total_runtime_ms,
                )

            if int(run_result["returncode"] or 0) != 0:
                case_results.append(
                    {
                        "index": index,
                        "input": str(case.get("input") or ""),
                        "expected": str(expected_output or ""),
                        "stdout": _truncate(run_result["stdout"]),
                        "status": "Runtime Error",
                    }
                )
                return JudgeOutcome.failed(
                    _truncate(run_result["stderr"] or f"Runtime error on test case {index}."),
                    metrics={
                        "verdict": "runtime_error",
                        "tests_passed": passed_cases,
                        "tests_total": total_cases,
                        "case_results": case_results,
                    },
                    stdout=_truncate(run_result["stdout"]),
                    runtime_ms=total_runtime_ms,
                )

            if expected_output is not None and not _output_matches(run_result["stdout"], str(expected_output)):
                case_results.append(
                    {
                        "index": index,
                        "input": str(case.get("input") or ""),
                        "expected": str(expected_output),
                        "stdout": _truncate(run_result["stdout"]),
                        "status": "Wrong Answer",
                    }
                )
                return JudgeOutcome.failed(
                    _truncate(
                        f"Wrong answer on test case {index}.\nExpected: {expected_output}\nGot: {run_result['stdout'].strip()}"
                    ),
                    metrics={
                        "verdict": "wrong_answer",
                        "tests_passed": passed_cases,
                        "tests_total": total_cases,
                        "expected_output": str(expected_output),
                        "case_results": case_results,
                    },
                    stdout=_truncate(run_result["stdout"]),
                    runtime_ms=total_runtime_ms,
                )

            passed_cases += 1
            case_results.append(
                {
                    "index": index,
                    "input": str(case.get("input") or ""),
                    "expected": str(expected_output or ""),
                    "stdout": _truncate(run_result["stdout"]),
                    "status": "Accepted",
                }
            )

        return JudgeOutcome(
            status="accepted",
            score=100.0,
            stdout=_truncate(f"All {passed_cases}/{total_cases} test cases passed.\nLast output:\n{last_stdout}".strip()),
            stderr="",
            metrics={
                "verdict": "accepted",
                "tests_passed": passed_cases,
                "tests_total": total_cases,
                "case_results": case_results,
            },
            runtime_ms=total_runtime_ms,
            memory_kb=0,
            passed=True,
        )
    finally:
        shutil.rmtree(workdir, ignore_errors=True)


def _normalize_ml_source(source_text: str) -> str:
    candidate = str(source_text or "").strip()
    if not candidate:
        raise ValueError("Notebook payload was empty.")
    if candidate.startswith("{"):
        try:
            notebook = json.loads(candidate)
        except json.JSONDecodeError as exc:
            raise ValueError(f"Notebook JSON is invalid: {exc.msg}") from exc
        if not isinstance(notebook, dict) or not isinstance(notebook.get("cells"), list):
            raise ValueError("Notebook payload must contain a 'cells' list.")
        code_cells = []
        for cell in notebook["cells"]:
            if not isinstance(cell, dict) or cell.get("cell_type") != "code":
                continue
            source = cell.get("source", [])
            text = "".join(source) if isinstance(source, list) else str(source)
            if text.strip():
                code_cells.append(text)
        if not code_cells:
            raise ValueError("Notebook payload does not contain executable code cells.")
        candidate = "\n\n".join(code_cells)
    compile(candidate, "<ml-submission>", "exec")
    return candidate


async def _execute_json_runner(
    *,
    runner_source: str,
    payload: dict[str, Any],
    timeout_ms: int,
    prefix: str,
) -> dict[str, Any]:
    workdir = _runtime_root() / f"{prefix}-{uuid.uuid4().hex}"
    workdir.mkdir(parents=True, exist_ok=False)
    try:
        runner_path = workdir / "runner.py"
        payload_path = workdir / "payload.json"
        result_path = workdir / "result.json"
        runner_path.write_text(runner_source, encoding="utf-8")
        payload_path.write_text(json.dumps(payload), encoding="utf-8")

        result = await _communicate_process(
            [sys.executable, "-I", str(runner_path), str(payload_path), str(result_path)],
            cwd=workdir,
            timeout_ms=timeout_ms,
        )
        if result["timed_out"]:
            return {
                "ok": False,
                "stderr": result["stderr"] or "Execution timed out.",
                "stdout": result["stdout"],
                "elapsed_ms": result["elapsed_ms"],
                "timed_out": True,
            }
        if not result_path.exists():
            return {
                "ok": False,
                "stderr": result["stderr"] or result["stdout"] or "Runner did not emit a result payload.",
                "stdout": result["stdout"],
                "elapsed_ms": result["elapsed_ms"],
                "timed_out": False,
            }
        return {
            "ok": True,
            "payload": json.loads(result_path.read_text(encoding="utf-8")),
            "stdout": result["stdout"],
            "stderr": result["stderr"],
            "elapsed_ms": result["elapsed_ms"],
            "timed_out": False,
        }
    finally:
        shutil.rmtree(workdir, ignore_errors=True)


async def _evaluate_ml_problem(
    *,
    source_text: str,
    problem: dict[str, Any],
    max_score: float,
) -> JudgeOutcome:
    source = _normalize_ml_source(source_text)
    judge = problem["judge"]
    function_name = str(judge["function_name"])
    runner_source = textwrap.dedent(
        """
        import json
        import sys
        from pathlib import Path

        def main():
            payload = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
            namespace = {}
            exec(payload['source'], namespace)
            target = namespace.get(payload['function_name'])
            if not callable(target):
                raise RuntimeError(f"Required function {payload['function_name']} was not defined")
            predictions = target(payload['train_rows'], payload['test_rows'])
            Path(sys.argv[2]).write_text(
                json.dumps({'predictions': predictions}),
                encoding='utf-8',
            )

        if __name__ == '__main__':
            main()
        """
    )
    runner_result = await _execute_json_runner(
        runner_source=runner_source,
        payload={
            "source": source,
            "function_name": function_name,
            "train_rows": judge["train_rows"],
            "test_rows": judge["test_rows"],
        },
        timeout_ms=int(judge.get("time_limit_ms", 4000)),
        prefix="judge-ml",
    )
    if not runner_result["ok"]:
        return JudgeOutcome.failed(
            runner_result["stderr"],
            metrics={"verdict": "runtime_error", "problem_id": problem["id"]},
            stdout=_truncate(runner_result["stdout"]),
            runtime_ms=int(runner_result["elapsed_ms"]),
        )

    predictions = runner_result["payload"].get("predictions")
    expected = list(judge["expected"])
    if not isinstance(predictions, list):
        return JudgeOutcome.failed(
            "ML submission must return a list of predictions.",
            metrics={"verdict": "invalid_predictions", "problem_id": problem["id"]},
            runtime_ms=int(runner_result["elapsed_ms"]),
        )
    if len(predictions) != len(expected):
        return JudgeOutcome.failed(
            f"Expected {len(expected)} predictions but received {len(predictions)}.",
            metrics={"verdict": "invalid_predictions", "problem_id": problem["id"]},
            runtime_ms=int(runner_result["elapsed_ms"]),
        )

    metric_name = str(judge["metric"]).lower()
    threshold = float(judge["threshold"])
    if metric_name == "accuracy":
        correct = sum(1 for prediction, truth in zip(predictions, expected) if str(prediction) == str(truth))
        accuracy = correct / len(expected) if expected else 0.0
        score = _format_score(accuracy * max_score, max_score)
        if accuracy >= threshold:
            return JudgeOutcome(
                status="accepted",
                score=score,
                stdout=f"accuracy={accuracy:.4f}",
                stderr="",
                metrics={
                    "verdict": "accepted",
                    "accuracy": round(accuracy, 4),
                    "tests_passed": correct,
                    "tests_total": len(expected),
                    "problem_id": problem["id"],
                },
                runtime_ms=int(runner_result["elapsed_ms"]),
                memory_kb=0,
                passed=True,
            )
        return JudgeOutcome.failed(
            f"Accuracy {accuracy:.4f} is below the required threshold {threshold:.2f}.",
            score=score,
            metrics={
                "verdict": "wrong_answer",
                "accuracy": round(accuracy, 4),
                "tests_passed": correct,
                "tests_total": len(expected),
                "problem_id": problem["id"],
            },
            stdout=f"accuracy={accuracy:.4f}",
            runtime_ms=int(runner_result["elapsed_ms"]),
        )

    numeric_predictions = [float(value) for value in predictions]
    numeric_expected = [float(value) for value in expected]
    absolute_errors = [abs(prediction - truth) for prediction, truth in zip(numeric_predictions, numeric_expected)]
    mae = sum(absolute_errors) / len(absolute_errors) if absolute_errors else float("inf")
    score = _format_score(max_score * max(0.0, 1 - (mae / max(threshold, 1.0))), max_score)
    if mae <= threshold:
        return JudgeOutcome(
            status="accepted",
            score=score,
            stdout=f"mae={mae:.4f}",
            stderr="",
            metrics={
                "verdict": "accepted",
                "mae": round(mae, 4),
                "tests_passed": len(expected),
                "tests_total": len(expected),
                "problem_id": problem["id"],
            },
            runtime_ms=int(runner_result["elapsed_ms"]),
            memory_kb=0,
            passed=True,
        )
    return JudgeOutcome.failed(
        f"Mean absolute error {mae:.4f} is above the allowed threshold {threshold:.2f}.",
        score=score,
        metrics={
            "verdict": "wrong_answer",
            "mae": round(mae, 4),
            "tests_passed": 0,
            "tests_total": len(expected),
            "problem_id": problem["id"],
        },
        stdout=f"mae={mae:.4f}",
        runtime_ms=int(runner_result["elapsed_ms"]),
    )


def _packet_validator(name: str, packets: list[dict[str, Any]]) -> tuple[bool, str]:
    if name == "tcp_syn_probe":
        for packet in packets:
            flags = str(packet.get("tcp_flags") or "")
            if (
                packet.get("ip_dst") == "10.10.10.10"
                and str(packet.get("protocol")).lower() == "tcp"
                and int(packet.get("dport") or 0) == 443
                and "S" in flags
            ):
                return True, "Found a valid TCP SYN probe to 10.10.10.10:443."
        return False, "No valid TCP SYN probe to 10.10.10.10:443 was produced."

    if name == "dns_lookup":
        for packet in packets:
            qname = str(packet.get("dns_qname") or "").rstrip(".")
            if (
                packet.get("ip_dst") == "10.10.10.53"
                and str(packet.get("protocol")).lower() == "udp"
                and int(packet.get("dport") or 0) == 53
                and qname == "flag.internal"
            ):
                return True, "Found a valid DNS lookup for flag.internal."
        return False, "No valid DNS query for flag.internal was produced."

    raise ValueError(f"Unsupported packet validator: {name}")


async def _evaluate_packet_problem(
    *,
    source_text: str,
    problem: dict[str, Any],
    max_score: float,
) -> JudgeOutcome:
    source = str(source_text or "").strip()
    if not source:
        return JudgeOutcome.failed("Packet submission is empty.", metrics={"verdict": "empty_submission"})

    runner_source = textwrap.dedent(
        """
        import json
        import sys
        from pathlib import Path
        from scapy.all import DNS, IP, TCP, UDP

        def summarize_packet(packet):
            if isinstance(packet, dict):
                return packet
            summary = {}
            if IP in packet:
                summary['ip_src'] = packet[IP].src
                summary['ip_dst'] = packet[IP].dst
            if TCP in packet:
                summary['protocol'] = 'tcp'
                summary['sport'] = int(packet[TCP].sport)
                summary['dport'] = int(packet[TCP].dport)
                summary['tcp_flags'] = str(packet[TCP].flags)
            if UDP in packet:
                summary['protocol'] = 'udp'
                summary['sport'] = int(packet[UDP].sport)
                summary['dport'] = int(packet[UDP].dport)
            if DNS in packet and getattr(packet[DNS], 'qd', None) is not None:
                qname = packet[DNS].qd.qname
                summary['dns_qname'] = qname.decode('utf-8', errors='replace') if isinstance(qname, bytes) else str(qname)
            return summary

        def main():
            payload = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
            namespace = {}
            exec(payload['source'], namespace)
            target = namespace.get('build_packets')
            if callable(target):
                packets = target()
            else:
                packets = namespace.get('packets')
            if packets is None:
                raise RuntimeError("Packet submission must define build_packets() or packets")
            if not isinstance(packets, list):
                raise RuntimeError("Packet submission must return a list of packets")
            summaries = [summarize_packet(packet) for packet in packets]
            Path(sys.argv[2]).write_text(json.dumps({'packets': summaries}), encoding='utf-8')

        if __name__ == '__main__':
            main()
        """
    )
    runner_result = await _execute_json_runner(
        runner_source=runner_source,
        payload={"source": source},
        timeout_ms=max(6000, int(problem["judge"].get("time_limit_ms", 3000))),
        prefix="judge-packet",
    )
    if not runner_result["ok"]:
        return JudgeOutcome.failed(
            runner_result["stderr"],
            metrics={"verdict": "runtime_error", "problem_id": problem["id"]},
            stdout=_truncate(runner_result["stdout"]),
            runtime_ms=int(runner_result["elapsed_ms"]),
        )

    packets = runner_result["payload"].get("packets")
    if not isinstance(packets, list):
        return JudgeOutcome.failed(
            "Packet judge could not decode the generated packet list.",
            metrics={"verdict": "invalid_packets", "problem_id": problem["id"]},
            runtime_ms=int(runner_result["elapsed_ms"]),
        )

    passed, message = _packet_validator(str(problem["judge"]["validator"]), packets)
    metrics = {
        "verdict": "accepted" if passed else "wrong_answer",
        "packet_count": len(packets),
        "problem_id": problem["id"],
    }
    if passed:
        return JudgeOutcome(
            status="accepted",
            score=_format_score(max_score, max_score),
            stdout=message,
            stderr="",
            metrics=metrics,
            runtime_ms=int(runner_result["elapsed_ms"]),
            memory_kb=0,
            passed=True,
        )
    return JudgeOutcome.failed(
        message,
        metrics=metrics,
        runtime_ms=int(runner_result["elapsed_ms"]),
    )


async def judge_code_submission(
    *,
    source_text: str,
    competition_slug: str,
    max_score: float,
    language: str | None,
    problem_id: int | None = None,
) -> JudgeOutcome:
    try:
        problem = _ensure_problem(problem_id, "DSA")
    except Exception as exc:
        return JudgeOutcome.failed(str(exc), metrics={"verdict": "invalid_problem", "problem_id": problem_id})

    if not str(source_text or "").strip():
        return JudgeOutcome.failed("No source code supplied to the standard judge.", metrics={"verdict": "empty_submission"})

    judge_config = problem["judge"]
    outcome = await _compile_and_run_code(
        source_text=source_text,
        language=language or "python",
        cases=list(judge_config.get("cases", [])),
        time_limit_ms=int(judge_config.get("time_limit_ms", 2000)),
    )
    score = max_score if outcome.passed else max_score * (
        float(outcome.metrics.get("tests_passed", 0)) / max(float(outcome.metrics.get("tests_total", 1)), 1.0)
    )
    outcome.score = _format_score(score, max_score)
    outcome.metrics = {**outcome.metrics, "problem_id": problem["id"], "competition_slug": competition_slug}
    return outcome


async def judge_ml_submission(
    *,
    source_text: str,
    competition_slug: str,
    max_score: float,
    problem_id: int | None = None,
) -> JudgeOutcome:
    try:
        problem = _ensure_problem(problem_id, "ML")
    except Exception as exc:
        return JudgeOutcome.failed(str(exc), metrics={"verdict": "invalid_problem", "problem_id": problem_id})

    outcome = await _evaluate_ml_problem(source_text=source_text, problem=problem, max_score=max_score)
    outcome.metrics = {**outcome.metrics, "problem_id": problem["id"], "competition_slug": competition_slug}
    return outcome


async def judge_packet_submission(
    *,
    source_text: str,
    competition_slug: str,
    max_score: float,
    problem_id: int | None = None,
) -> JudgeOutcome:
    try:
        problem = _ensure_problem(problem_id, "CTF")
    except Exception as exc:
        return JudgeOutcome.failed(str(exc), metrics={"verdict": "invalid_problem", "problem_id": problem_id})

    outcome = await _evaluate_packet_problem(source_text=source_text, problem=problem, max_score=max_score)
    outcome.metrics = {**outcome.metrics, "problem_id": problem["id"], "competition_slug": competition_slug}
    return outcome


def _resolve_preview_cases(problem: dict[str, Any], custom_input: str | None) -> tuple[list[dict[str, Any]], str, bool]:
    visible_cases = [dict(case) for case in problem["judge"].get("cases", []) if not bool(case.get("hidden"))]
    if custom_input is None:
        return visible_cases, "visible_cases", True

    normalized_input = _normalize_case_input(custom_input)
    matched_cases = [
        dict(case)
        for case in visible_cases
        if _normalize_case_input(str(case.get("input") or "")) == normalized_input
    ]
    if matched_cases:
        return matched_cases, "visible_cases", True

    return [{"input": custom_input, "expected_output": None, "hidden": False}], "custom_execution", False


async def preview_problem_submission(
    *,
    problem_id: int,
    source_text: str,
    language: str | None,
    custom_input: str | None = None,
) -> JudgeOutcome:
    problem = get_problem(problem_id)
    if not problem:
        return JudgeOutcome.failed("Problem not found.", metrics={"verdict": "invalid_problem", "problem_id": problem_id})

    domain = problem["domain"]
    if domain == "DSA":
        judge_config = problem["judge"]
        cases, preview_mode, verified = _resolve_preview_cases(problem, custom_input)
        outcome = await _compile_and_run_code(
            source_text=source_text,
            language=language or "python",
            cases=cases,
            time_limit_ms=int(judge_config.get("time_limit_ms", 2000)),
        )
        if preview_mode == "custom_execution" and outcome.passed:
            outcome.stdout = _truncate(outcome.stdout.replace("All 1/1 test cases passed.\nLast output:\n", "", 1))
            outcome.status = "completed"
            outcome.score = 0.0
            outcome.passed = False
            outcome.metrics = {
                **outcome.metrics,
                "verdict": "completed",
                "tests_passed": 0,
                "tests_total": 0,
                "case_results": [
                    {
                        "index": 1,
                        "input": custom_input or "",
                        "expected": "",
                        "stdout": outcome.stdout,
                        "status": "Finished",
                    }
                ],
            }
        outcome.metrics = {
            **outcome.metrics,
            "problem_id": problem_id,
            "preview": True,
            "preview_mode": preview_mode,
            "verified": verified,
        }
        return outcome
    if domain == "ML":
        outcome = await _evaluate_ml_problem(source_text=source_text, problem=problem, max_score=100.0)
        outcome.metrics = {
            **outcome.metrics,
            "problem_id": problem_id,
            "preview": True,
            "preview_mode": "judge_validation",
            "verified": True,
        }
        return outcome
    outcome = await _evaluate_packet_problem(source_text=source_text, problem=problem, max_score=100.0)
    outcome.metrics = {
        **outcome.metrics,
        "problem_id": problem_id,
        "preview": True,
        "preview_mode": "judge_validation",
        "verified": True,
    }
    return outcome
