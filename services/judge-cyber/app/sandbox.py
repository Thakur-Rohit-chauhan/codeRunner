"""Sandboxed execution for cyber challenge code."""

import json
import os
import shutil
import subprocess
import tempfile
import sys
import uuid
from contextlib import contextmanager
from typing import Any, Tuple


@contextmanager
def _temporary_workdir():
    """Create a writable sandbox workdir that also behaves on Windows."""
    temp_root = os.environ.get("JUDGE_CYBER_TEMP_ROOT") or tempfile.gettempdir()
    os.makedirs(temp_root, exist_ok=True)
    workdir = os.path.join(temp_root, f"judge-cyber-{uuid.uuid4().hex}")
    os.makedirs(workdir, exist_ok=False)
    try:
        yield workdir
    finally:
        shutil.rmtree(workdir, ignore_errors=True)


def execute_code_in_sandbox(code: str, packets: list) -> Tuple[list, str]:
    """Run user-submitted code in isolated process with timeout.

    Exposes `packets` and expects a `process_packets(packets)` function that
    returns a list of packet results.
    """
    with _temporary_workdir() as workdir:
        packets_file = os.path.join(workdir, "packets.json")
        program_file = os.path.join(workdir, "user_code.py")

        with open(packets_file, "w", encoding="utf-8") as f:
            json.dump(packets, f)

        runner = f"""
import json
import sys

with open('packets.json', 'r', encoding='utf-8') as f:
    packets = json.load(f)

user_code = {json.dumps(code)}

local_ns = {{}}
exec(user_code, {{"__name__": "__main__"}}, local_ns)

if 'process_packets' not in local_ns:
    raise SystemExit('process_packets function not defined')

result = local_ns['process_packets'](packets)
print(json.dumps({{"result": result}}, ensure_ascii=False))
"""

        with open(program_file, "w", encoding="utf-8") as f:
            f.write(runner)

        env = os.environ.copy()
        env["PATH"] = env.get("PATH", "")

        try:
            completed = subprocess.run(
                [sys.executable, program_file],
                capture_output=True,
                text=True,
                cwd=workdir,
                env=env,
                timeout=5,
                check=False,
            )

            if completed.returncode != 0:
                logs = completed.stderr.strip() or completed.stdout.strip()
                return [], f"runtime_error: {logs}"

            payload = json.loads(completed.stdout.strip())
            result_packets: list = payload.get("result", [])
            return result_packets, "executed"

        except subprocess.TimeoutExpired as exc:
            return [], "timeout"
        except Exception as exc:
            return [], f"execution_exception: {exc}"
