from __future__ import annotations

import ast
from dataclasses import dataclass
from datetime import datetime, timezone
import json
import math
import os
from pathlib import Path
import re
import resource
import shutil
import signal
import subprocess
import sys
import tempfile
from time import perf_counter
from typing import Any, Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


def resolve_binary(*candidates: str) -> str:
    for candidate in candidates:
        if not candidate:
            continue
        if os.path.isabs(candidate):
            if os.path.exists(candidate):
                return candidate
            continue
        resolved = shutil.which(candidate)
        if resolved:
            return resolved
    return ""


PYTHON_BINARY = resolve_binary(sys.executable, "python3", "python")
NODE_BINARY = resolve_binary("node")
CPP_BINARY = resolve_binary("g++")
JAVAC_BINARY = resolve_binary("javac")
JAVA_BINARY = resolve_binary("java")
RSCRIPT_BINARY = resolve_binary("Rscript")
SANDBOX_EXEC_BINARY = resolve_binary("/usr/bin/sandbox-exec", "sandbox-exec")


SUPPORTED_LANGUAGES = {
    "python": {"mode": "interpreted", "extension": ".py", "run": [PYTHON_BINARY], "runtime": "python"},
    "javascript": {"mode": "interpreted", "extension": ".js", "run": [NODE_BINARY], "runtime": "node"},
    "cpp": {"mode": "compiled", "extension": ".cpp", "compile": [CPP_BINARY, "-std=c++17", "-O2"], "runtime": "cpp"},
    "java": {"mode": "compiled", "extension": ".java", "compile": [JAVAC_BINARY], "run": [JAVA_BINARY], "runtime": "java"},
    "bash": {"mode": "interpreted", "extension": ".sh", "run": ["/bin/bash"], "runtime": "bash"},
    "r": {"mode": "interpreted", "extension": ".R", "run": [RSCRIPT_BINARY], "runtime": "r"},
}

LANGUAGE_ALIASES = {
    "py": "python",
    "python3": "python",
    "js": "javascript",
    "node": "javascript",
    "c++": "cpp",
    "shell": "bash",
    "sh": "bash",
    "rscript": "r",
}

SUPPORTED_DOMAIN_LANGUAGES = {
    "DSA": {"cpp", "python", "java", "javascript"},
    "ML": {"python", "r"},
    "CTF": {"python", "bash", "cpp", "javascript"},
}

CPU_LIMIT_SECONDS = 2
MEMORY_LIMIT_BYTES = 512 * 1024 * 1024
FILE_SIZE_LIMIT_BYTES = 8 * 1024 * 1024
SUBMISSION_SERVICE_VERSION = "0.2.0"


class TestCase(BaseModel):
    input: str
    expectedOutput: str


class ProblemPayload(BaseModel):
    id: int | str
    title: str
    domain: str = "DSA"
    starterCode: dict[str, str] = Field(default_factory=dict)
    testCases: list[TestCase] = Field(default_factory=list)


class ExecutionRequest(BaseModel):
    problem: ProblemPayload
    language: str
    code: str
    input: str | None = None


class CaseResult(BaseModel):
    index: int
    status: str
    stdout: str
    expected: str
    stderr: str | None = None
    durationMs: int


class JudgeResponse(BaseModel):
    status: str
    stdout: str
    expected: str
    stderr: str | None = None
    time: str
    memory: str
    allPassed: bool
    cases: list[CaseResult] = Field(default_factory=list)


@dataclass
class SignatureInfo:
    style: Literal["named", "solve", "script"]
    callable_name: str | None = None
    param_types: list[str] | None = None


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalize_language(language: str) -> str:
    normalized = (language or "").strip().lower()
    return LANGUAGE_ALIASES.get(normalized, normalized)


def sandbox_profile(workdir: str) -> str:
    escaped = workdir.replace("\\", "\\\\").replace('"', '\\"')
    temp_root = tempfile.gettempdir().replace("\\", "\\\\").replace('"', '\\"')
    return f"""
    (version 1)
    (deny default)
    (import "system.sb")
    (allow process*)
    (allow sysctl-read)
    (allow file-read*)
    (allow file-write*
        (subpath "{escaped}")
        (subpath "{temp_root}")
        (literal "/dev/null")
        (literal "/private/dev/null"))
    """.strip()


def apply_limits() -> None:
    for limit, values in (
        (resource.RLIMIT_CPU, (CPU_LIMIT_SECONDS, CPU_LIMIT_SECONDS + 1)),
        (resource.RLIMIT_AS, (MEMORY_LIMIT_BYTES, MEMORY_LIMIT_BYTES)),
        (resource.RLIMIT_FSIZE, (FILE_SIZE_LIMIT_BYTES, FILE_SIZE_LIMIT_BYTES)),
    ):
        try:
            resource.setrlimit(limit, values)
        except (OSError, ValueError):
            # Some limits are not adjustable in the current macOS execution context.
            continue


def safe_run(command: list[str], *, cwd: str, stdin: str = "", sandboxed: bool = True) -> subprocess.CompletedProcess[str]:
    if not command or not command[0]:
        raise FileNotFoundError("No executable configured for this language")

    executable = command[0]
    if os.path.isabs(executable):
        if not os.path.exists(executable):
            raise FileNotFoundError(f"Executable not found: {executable}")
        normalized_command = command
    else:
        resolved = shutil.which(executable)
        if not resolved:
            raise FileNotFoundError(f"Executable not found in PATH: {executable}")
        normalized_command = [resolved, *command[1:]]

    env = {
        "HOME": cwd,
        "PATH": os.environ.get("PATH", ""),
        "TMPDIR": cwd,
        "PYTHONDONTWRITEBYTECODE": "1",
        "PYTHONNOUSERSITE": "1",
    }
    wrapped = [SANDBOX_EXEC_BINARY, "-p", sandbox_profile(cwd), *normalized_command] if sandboxed and SANDBOX_EXEC_BINARY else normalized_command

    timeout_seconds = CPU_LIMIT_SECONDS + 2 if sandboxed else 20

    return subprocess.run(
        wrapped,
        cwd=cwd,
        input=stdin,
        text=True,
        capture_output=True,
        timeout=timeout_seconds,
        env=env,
        preexec_fn=apply_limits if sandboxed else None,
    )


def parse_scalar(token: str) -> Any:
    candidate = token.strip()
    if not candidate:
        return ""

    normalized = re.sub(r"\btrue\b", "True", candidate, flags=re.IGNORECASE)
    normalized = re.sub(r"\bfalse\b", "False", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"\bnull\b", "None", normalized, flags=re.IGNORECASE)

    try:
        return ast.literal_eval(normalized)
    except Exception:
        if candidate.startswith('"') and candidate.endswith('"'):
            return candidate[1:-1]
        return candidate


def parse_case_input(raw_input: str) -> list[Any]:
    lines = [line.strip() for line in str(raw_input).splitlines() if line.strip()]
    if not lines:
        return []

    values: list[Any] = []
    for line in lines:
        named_parts = re.split(r",\s*(?=[A-Za-z_][A-Za-z0-9_]*\s*=)", line)
        if len(named_parts) > 1:
            for part in named_parts:
                values.append(parse_scalar(part.split("=", 1)[1]))
            continue

        if "=" in line and re.match(r"^[A-Za-z_][A-Za-z0-9_]*\s*=", line):
            values.append(parse_scalar(line.split("=", 1)[1]))
        else:
            values.append(parse_scalar(line))
    return values


def parse_expected_output(raw_output: str) -> Any:
    return parse_scalar(raw_output.strip())


def normalize_value(value: Any) -> Any:
    if isinstance(value, float):
        if math.isfinite(value):
            return round(value, 6)
        return value
    if isinstance(value, list):
        return [normalize_value(item) for item in value]
    if isinstance(value, tuple):
        return [normalize_value(item) for item in value]
    if isinstance(value, dict):
        return {str(key): normalize_value(item) for key, item in value.items()}
    return value


def parse_actual_output(stdout: str) -> Any:
    cleaned = stdout.strip()
    if not cleaned:
        return ""

    lines = [line.strip() for line in cleaned.splitlines() if line.strip()]
    candidate = lines[-1] if lines else cleaned
    return parse_scalar(candidate)


def compare_values(actual: Any, expected: Any) -> bool:
    left = normalize_value(actual)
    right = normalize_value(expected)

    if isinstance(left, float) or isinstance(right, float):
        try:
            return abs(float(left) - float(right)) <= 1e-4
        except Exception:
            return False

    return left == right


def evaluate_special_case(problem: ProblemPayload, stdout: str, case: TestCase) -> bool | None:
    text = stdout.strip()
    problem_id = int(problem.id)

    if problem.domain == "CTF":
        if problem_id == 18:
            return bool(re.search(r"FLAG\{[^}]+\}", text))
        if problem_id == 19:
            return case.expectedOutput.lower() in text.lower()
        if problem_id == 20:
            lowered = text.lower()
            return "login bypassed" in lowered or "bypass" in lowered

    if problem.domain == "ML":
        if problem_id == 15:
            match = re.search(r"(-?\d+(?:\.\d+)?)", text)
            if not match:
                return False
            value = float(match.group(1))
            if value <= 1:
                value *= 100
            return value >= 70
        if problem_id == 16:
            return case.expectedOutput.lower() in text.lower()
        if problem_id == 17:
            m_match = re.search(r"\bm\s*[:=]\s*(-?\d+(?:\.\d+)?)", text)
            b_match = re.search(r"\bb\s*[:=]\s*(-?\d+(?:\.\d+)?)", text)
            if not (m_match and b_match):
                return False
            slope = float(m_match.group(1))
            intercept = float(b_match.group(1))
            return abs(slope - 0.6) <= 0.2 and abs(intercept - 2.2) <= 0.4

    expected_output = case.expectedOutput.strip()
    if expected_output == "FLAG{...}":
        return bool(re.search(r"FLAG\{[^}]+\}", text))
    if ">=" in expected_output:
        match = re.search(r"(-?\d+(?:\.\d+)?)", text)
        threshold = re.search(r"(-?\d+(?:\.\d+)?)", expected_output)
        if match and threshold:
            return float(match.group(1)) >= float(threshold.group(1))
    return None


def cpp_escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"')


def java_escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"')


def infer_cpp_value(value: Any, hint: str | None = None) -> str:
    if hint == "ListNode*" or hint == "ListNode":
        return f"buildList({infer_cpp_value(value)})"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        return repr(value)
    if isinstance(value, str):
        return f'std::string("{cpp_escape(value)}")'
    if isinstance(value, list):
        inner = ", ".join(infer_cpp_value(item) for item in value)
        item_hint = "int"
        if value:
            first = value[0]
            if isinstance(first, str):
                item_hint = "std::string"
            elif isinstance(first, list):
                item_hint = "std::vector<int>" if first and isinstance(first[0], int) else "std::vector<std::string>"
        return f"std::vector<{item_hint}>{{{inner}}}"
    raise ValueError(f"Unsupported C++ literal: {value!r}")


def infer_java_value(value: Any, hint: str | None = None) -> str:
    if hint == "ListNode":
        return f"buildList({infer_java_value(value)})"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        return repr(value)
    if isinstance(value, str):
        return f"\"{java_escape(value)}\""
    if isinstance(value, list):
        if value and isinstance(value[0], list):
            inner = ", ".join(infer_java_value(item) for item in value)
            return f"new int[][]{{{inner}}}"
        if value and isinstance(value[0], str):
            inner = ", ".join(infer_java_value(item) for item in value)
            return f"new String[]{{{inner}}}"
        inner = ", ".join(infer_java_value(item) for item in value)
        return f"new int[]{{{inner}}}"
    raise ValueError(f"Unsupported Java literal: {value!r}")


def python_literal(value: Any, hint: str | None = None) -> str:
    if hint in {"ListNode", "ListNode*"}:
        return f"build_list({python_literal(value)})"
    return repr(value)


def js_literal(value: Any, hint: str | None = None) -> str:
    if hint in {"ListNode", "ListNode*"}:
        return f"buildList({json.dumps(value)})"
    return json.dumps(value)


def infer_python_param_types(starter_code: str, callable_name: str) -> list[str]:
    pattern = re.compile(rf"def\s+{re.escape(callable_name)}\s*\(self(?:,\s*(.*?))?\)\s*:", re.DOTALL)
    match = pattern.search(starter_code)
    if not match:
        return []
    params = [part.strip() for part in (match.group(1) or "").split(",") if part.strip()]
    types: list[str] = []
    for param in params:
        if ":" in param:
            types.append(param.split(":", 1)[1].strip())
        else:
            types.append("Any")
    return types


def infer_java_param_types(starter_code: str, callable_name: str) -> list[str]:
    match = re.search(rf"public\s+.+?\s+{re.escape(callable_name)}\((.*?)\)", starter_code, re.DOTALL)
    if not match:
        return []
    params = [part.strip() for part in match.group(1).split(",") if part.strip()]
    return [re.sub(r"\s+[A-Za-z_][A-Za-z0-9_]*$", "", param).strip() for param in params]


def infer_cpp_param_types(starter_code: str, callable_name: str) -> list[str]:
    match = re.search(rf"{re.escape(callable_name)}\((.*?)\)", starter_code, re.DOTALL)
    if not match:
        return []
    params = [part.strip() for part in match.group(1).split(",") if part.strip()]
    cleaned = []
    for param in params:
        param = re.sub(r"\s*[A-Za-z_][A-Za-z0-9_]*\s*$", "", param)
        cleaned.append(param.strip())
    return cleaned


def detect_signature(problem: ProblemPayload, language: str) -> SignatureInfo:
    starter_code = problem.starterCode.get(language, "")

    if problem.domain != "DSA":
        return SignatureInfo(style="script")

    if language == "python":
        match = re.search(r"def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(self", starter_code)
        if not match:
            return SignatureInfo(style="script")
        callable_name = match.group(1)
        if callable_name == "solve":
            return SignatureInfo(style="solve", callable_name="solve")
        return SignatureInfo(style="named", callable_name=callable_name, param_types=infer_python_param_types(starter_code, callable_name))

    if language == "javascript":
        match = re.search(r"(?:var|let|const)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*function\s*\(", starter_code)
        if not match:
            return SignatureInfo(style="script")
        callable_name = match.group(1)
        if callable_name == "solve":
            return SignatureInfo(style="solve", callable_name="solve")
        return SignatureInfo(style="named", callable_name=callable_name)

    if language == "java":
        if re.search(r"static\s+void\s+main\s*\(", starter_code):
            return SignatureInfo(style="script")
        match = re.search(r"public\s+.+?\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(", starter_code)
        if not match:
            return SignatureInfo(style="script")
        callable_name = match.group(1)
        if callable_name == "solve":
            return SignatureInfo(style="solve", callable_name="solve")
        return SignatureInfo(style="named", callable_name=callable_name, param_types=infer_java_param_types(starter_code, callable_name))

    if language == "cpp":
        if re.search(r"\bint\s+main\s*\(", starter_code):
            return SignatureInfo(style="script")
        matches = re.findall(r"([A-Za-z_][A-Za-z0-9_]*)\s*\(", starter_code)
        callable_name = next((name for name in matches[::-1] if name not in {"if", "for", "while", "switch"}), None)
        if not callable_name:
            return SignatureInfo(style="script")
        if callable_name == "solve":
            return SignatureInfo(style="solve", callable_name="solve")
        return SignatureInfo(style="named", callable_name=callable_name, param_types=infer_cpp_param_types(starter_code, callable_name))

    return SignatureInfo(style="script")


def build_python_named_source(code: str, problem: ProblemPayload, case_input: list[Any], signature: SignatureInfo) -> str:
    args = ", ".join(
        python_literal(value, signature.param_types[index] if signature.param_types and index < len(signature.param_types) else None)
        for index, value in enumerate(case_input)
    )
    return f"""
import json

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def build_list(values):
    dummy = ListNode()
    current = dummy
    for value in values:
        current.next = ListNode(value)
        current = current.next
    return dummy.next

def normalize(value):
    if isinstance(value, ListNode):
        out = []
        current = value
        while current is not None:
            out.append(current.val)
            current = current.next
        return out
    if isinstance(value, list):
        return [normalize(item) for item in value]
    if isinstance(value, tuple):
        return [normalize(item) for item in value]
    if isinstance(value, bool):
        return value
    return value

{code}

result = Solution().{signature.callable_name}({args})
print(json.dumps(normalize(result), separators=(",", ":")))
""".strip()


def build_python_solve_source(code: str) -> str:
    return f"""
{code}

if __name__ == "__main__":
    Solution().solve()
""".strip()


def build_js_named_source(code: str, case_input: list[Any], signature: SignatureInfo) -> str:
    args = ", ".join(js_literal(value) for value in case_input)
    return f"""
function ListNode(val, next = null) {{
  this.val = val;
  this.next = next;
}}

function buildList(values) {{
  const dummy = new ListNode(0);
  let current = dummy;
  for (const value of values) {{
    current.next = new ListNode(value);
    current = current.next;
  }}
  return dummy.next;
}}

function normalize(value) {{
  if (value instanceof ListNode) {{
    const out = [];
    let current = value;
    while (current) {{
      out.push(current.val);
      current = current.next;
    }}
    return out;
  }}
  if (Array.isArray(value)) {{
    return value.map(normalize);
  }}
  return value;
}}

{code}

const result = {signature.callable_name}({args});
console.log(JSON.stringify(normalize(result)));
""".strip()


def build_js_solve_source(code: str) -> str:
    return f"""
{code}

solve();
""".strip()


def build_java_named_source(code: str, case_input: list[Any], signature: SignatureInfo) -> str:
    args = ", ".join(
        infer_java_value(value, signature.param_types[index] if signature.param_types and index < len(signature.param_types) else None)
        for index, value in enumerate(case_input)
    )
    return f"""
import java.lang.reflect.Array;
import java.util.ArrayList;
import java.util.List;

class ListNode {{
    int val;
    ListNode next;
    ListNode() {{}}
    ListNode(int val) {{ this.val = val; }}
    ListNode(int val, ListNode next) {{ this.val = val; this.next = next; }}
}}

{code}

public class Main {{
    private static ListNode buildList(int[] values) {{
        ListNode dummy = new ListNode(0);
        ListNode current = dummy;
        for (int value : values) {{
            current.next = new ListNode(value);
            current = current.next;
        }}
        return dummy.next;
    }}

    private static String serialize(Object value) {{
        if (value == null) return "null";
        if (value instanceof String) return "\\""+((String) value).replace("\\\\", "\\\\\\\\").replace("\\"", "\\\\\\"")+"\\"";
        if (value instanceof Boolean) return ((Boolean) value) ? "true" : "false";
        if (value instanceof Number) return String.valueOf(value);
        if (value instanceof ListNode) {{
            List<Integer> items = new ArrayList<>();
            ListNode current = (ListNode) value;
            while (current != null) {{
                items.add(current.val);
                current = current.next;
            }}
            return serialize(items.toArray(new Integer[0]));
        }}
        Class<?> cls = value.getClass();
        if (cls.isArray()) {{
            int length = Array.getLength(value);
            StringBuilder builder = new StringBuilder();
            builder.append("[");
            for (int index = 0; index < length; index++) {{
                if (index > 0) builder.append(",");
                builder.append(serialize(Array.get(value, index)));
            }}
            builder.append("]");
            return builder.toString();
        }}
        if (value instanceof List<?>) {{
            List<?> list = (List<?>) value;
            StringBuilder builder = new StringBuilder();
            builder.append("[");
            for (int index = 0; index < list.size(); index++) {{
                if (index > 0) builder.append(",");
                builder.append(serialize(list.get(index)));
            }}
            builder.append("]");
            return builder.toString();
        }}
        return String.valueOf(value);
    }}

    public static void main(String[] args) {{
        Solution solution = new Solution();
        Object result = solution.{signature.callable_name}({args});
        System.out.print(serialize(result));
    }}
}}
""".strip()


def build_java_solve_source(code: str) -> str:
    return f"""
{code}

public class Main {{
    public static void main(String[] args) {{
        new Solution().solve();
    }}
}}
""".strip()


def build_cpp_named_source(code: str, case_input: list[Any], signature: SignatureInfo) -> str:
    arg_declarations: list[str] = []
    arg_names: list[str] = []
    for index, value in enumerate(case_input):
        hint = signature.param_types[index] if signature.param_types and index < len(signature.param_types) else None
        literal = infer_cpp_value(value, hint)
        arg_name = f"arg{index}"
        arg_names.append(arg_name)

        if hint:
            variable_type = hint.replace("&", "").strip()
            arg_declarations.append(f"    {variable_type} {arg_name} = {literal};")
        else:
            arg_declarations.append(f"    auto {arg_name} = {literal};")

    arg_setup = "\n".join(arg_declarations)
    args = ", ".join(arg_names)
    return f"""
#include <iostream>
#include <sstream>
#include <string>
#include <type_traits>
#include <vector>
using namespace std;

struct ListNode {{
    int val;
    ListNode* next;
    ListNode() : val(0), next(nullptr) {{}}
    ListNode(int x) : val(x), next(nullptr) {{}}
    ListNode(int x, ListNode* next) : val(x), next(next) {{}}
}};

ListNode* buildList(const vector<int>& values) {{
    ListNode* dummy = new ListNode(0);
    ListNode* current = dummy;
    for (int value : values) {{
        current->next = new ListNode(value);
        current = current->next;
    }}
    return dummy->next;
}}

string serializeValue(const string& value) {{
    string escaped = "\\\"";
    for (char ch : value) {{
        if (ch == '\\\\' || ch == '"') escaped.push_back('\\\\');
        escaped.push_back(ch);
    }}
    escaped.push_back('"');
    return escaped;
}}

string serializeValue(const char* value) {{
    return serializeValue(string(value));
}}

string serializeValue(bool value) {{
    return value ? "true" : "false";
}}

template <typename T>
typename enable_if<is_integral<T>::value && !is_same<T, bool>::value, string>::type
serializeValue(T value) {{
    return to_string(value);
}}

template <typename T>
typename enable_if<is_floating_point<T>::value, string>::type
serializeValue(T value) {{
    ostringstream out;
    out << value;
    return out.str();
}}

template <typename T>
string serializeValue(const vector<T>& values) {{
    string out = "[";
    for (size_t index = 0; index < values.size(); ++index) {{
        if (index > 0) out += ",";
        out += serializeValue(values[index]);
    }}
    out += "]";
    return out;
}}

string serializeValue(ListNode* node) {{
    vector<int> values;
    while (node != nullptr) {{
        values.push_back(node->val);
        node = node->next;
    }}
    return serializeValue(values);
}}

{code}

int main() {{
{arg_setup}
    Solution solution;
    auto result = solution.{signature.callable_name}({args});
    cout << serializeValue(result);
    return 0;
}}
""".strip()


def build_cpp_solve_source(code: str) -> str:
    return f"""
#include <iostream>
#include <string>
#include <vector>
using namespace std;

{code}

int main() {{
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    Solution solution;
    solution.solve();
    return 0;
}}
""".strip()


def build_source(problem: ProblemPayload, language: str, code: str, signature: SignatureInfo, case_input: list[Any]) -> tuple[str, str]:
    if problem.domain == "DSA" and signature.style == "named":
        if language == "python":
            return "main.py", build_python_named_source(code, problem, case_input, signature)
        if language == "javascript":
            return "main.js", build_js_named_source(code, case_input, signature)
        if language == "java":
            return "Main.java", build_java_named_source(code, case_input, signature)
        if language == "cpp":
            return "main.cpp", build_cpp_named_source(code, case_input, signature)

    if problem.domain == "DSA" and signature.style == "solve":
        if language == "python":
            return "main.py", build_python_solve_source(code)
        if language == "javascript":
            return "main.js", build_js_solve_source(code)
        if language == "java":
            return "Main.java", build_java_solve_source(code)
        if language == "cpp":
            return "main.cpp", build_cpp_solve_source(code)

    extension = SUPPORTED_LANGUAGES[language]["extension"]
    filename = "main.py" if language == "python" else "Main.java" if language == "java" else f"main{extension}"
    return filename, code


def execution_commands(language: str, source_path: Path) -> tuple[list[str] | None, list[str]]:
    config = SUPPORTED_LANGUAGES[language]
    if config["mode"] == "compiled":
        if language == "cpp":
            binary_path = source_path.parent / "main"
            return config["compile"] + [str(source_path), "-o", str(binary_path)], [str(binary_path)]
        if language == "java":
            return config["compile"] + [str(source_path)], config["run"] + ["Main"]
    return None, config["run"] + [str(source_path)]


def evaluate_case(problem: ProblemPayload, stdout: str, case: TestCase) -> bool:
    special = evaluate_special_case(problem, stdout, case)
    if special is not None:
        return special
    return compare_values(parse_actual_output(stdout), parse_expected_output(case.expectedOutput))


def format_duration(duration_ms: int) -> str:
    if duration_ms >= 1000:
        return f"{duration_ms / 1000:.2f} s"
    return f"{duration_ms} ms"


def classify_runtime_failure(returncode: int, stdout: str, stderr: str) -> str:
    combined_output = f"{stdout}\n{stderr}".lower()
    memory_markers = (
        "memoryerror",
        "bad_alloc",
        "outofmemoryerror",
        "cannot allocate memory",
        "memory limit",
    )

    if any(marker in combined_output for marker in memory_markers):
        return "Memory Limit Exceeded"

    if returncode in {-signal.SIGKILL, 128 + signal.SIGKILL}:
        return "Memory Limit Exceeded"

    return "Runtime Error"


def judge_case(problem: ProblemPayload, language: str, code: str, case: TestCase, signature: SignatureInfo, case_index: int) -> CaseResult:
    case_input = parse_case_input(case.input)
    filename, source = build_source(problem, language, code, signature, case_input)

    with tempfile.TemporaryDirectory(prefix="coderunner-judge-") as tempdir:
        workdir = Path(tempdir)
        source_path = workdir / filename
        source_path.write_text(source, encoding="utf-8")

        compile_command, run_command = execution_commands(language, source_path)
        stdin_payload = case.input if signature.style in {"solve", "script"} or problem.domain != "DSA" else ""
        start = perf_counter()

        if compile_command:
            try:
                compiled = safe_run(compile_command, cwd=tempdir, sandboxed=False)
            except subprocess.TimeoutExpired as exc:
                return CaseResult(index=case_index, status="Time Limit Exceeded", stdout="", expected=case.expectedOutput, stderr=str(exc), durationMs=int((perf_counter() - start) * 1000))
            except FileNotFoundError as exc:
                return CaseResult(index=case_index, status="Compilation Error", stdout="", expected=case.expectedOutput, stderr=str(exc), durationMs=int((perf_counter() - start) * 1000))

            if compiled.returncode != 0:
                return CaseResult(index=case_index, status="Compilation Error", stdout=compiled.stdout.strip(), expected=case.expectedOutput, stderr=compiled.stderr.strip() or compiled.stdout.strip(), durationMs=int((perf_counter() - start) * 1000))

        try:
            executed = safe_run(run_command, cwd=tempdir, stdin=stdin_payload, sandboxed=True)
        except subprocess.TimeoutExpired as exc:
            return CaseResult(index=case_index, status="Time Limit Exceeded", stdout="", expected=case.expectedOutput, stderr=str(exc), durationMs=int((perf_counter() - start) * 1000))
        except FileNotFoundError as exc:
            return CaseResult(index=case_index, status="Runtime Error", stdout="", expected=case.expectedOutput, stderr=str(exc), durationMs=int((perf_counter() - start) * 1000))

        duration_ms = int((perf_counter() - start) * 1000)
        stdout = executed.stdout.strip()
        stderr = executed.stderr.strip()

        if executed.returncode != 0:
            failure_status = classify_runtime_failure(executed.returncode, stdout, stderr)
            return CaseResult(index=case_index, status=failure_status, stdout=stdout, expected=case.expectedOutput, stderr=stderr or f"Process exited with code {executed.returncode}", durationMs=duration_ms)

        if evaluate_case(problem, stdout, case):
            return CaseResult(index=case_index, status="Accepted", stdout=stdout, expected=case.expectedOutput, stderr=stderr or None, durationMs=duration_ms)

        return CaseResult(index=case_index, status="Wrong Answer", stdout=stdout, expected=case.expectedOutput, stderr=stderr or None, durationMs=duration_ms)


def judge_problem(request: ExecutionRequest, mode: Literal["run", "submit"]) -> JudgeResponse:
    language = normalize_language(request.language)
    problem = request.problem
    domain = problem.domain or "DSA"

    if language not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail=f"Unsupported language: {language}")
    if language not in SUPPORTED_DOMAIN_LANGUAGES.get(domain, set()):
        raise HTTPException(status_code=400, detail=f"{language} is not supported for {domain} problems")

    signature = detect_signature(problem, language)
    cases = [TestCase(input=request.input, expectedOutput=problem.testCases[0].expectedOutput)] if mode == "run" and request.input else (
        problem.testCases[:1] if mode == "run" else problem.testCases
    )

    if not cases:
        raise HTTPException(status_code=400, detail="No test cases available")

    results = [judge_case(problem, language, request.code, case, signature, index + 1) for index, case in enumerate(cases)]
    overall_status = next((result.status for result in results if result.status != "Accepted"), "Accepted")
    first_result = next((result for result in results if result.status != "Accepted"), results[0])
    duration = sum(result.durationMs for result in results)

    return JudgeResponse(
        status=overall_status,
        stdout=first_result.stdout,
        expected=first_result.expected,
        stderr=first_result.stderr,
        time=format_duration(duration),
        memory="Limit exceeded" if overall_status == "Memory Limit Exceeded" else "N/A",
        allPassed=overall_status == "Accepted",
        cases=results,
    )


app = FastAPI(title="Submission Service", version=SUBMISSION_SERVICE_VERSION)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "version": SUBMISSION_SERVICE_VERSION,
        "supportedLanguages": {
            domain: sorted(list(languages)) for domain, languages in SUPPORTED_DOMAIN_LANGUAGES.items()
        },
        "checkedAt": utc_now_iso(),
    }


@app.post("/run")
def run_code(payload: ExecutionRequest) -> JudgeResponse:
    return judge_problem(payload, "run")


@app.post("/submit")
def submit_code(payload: ExecutionRequest) -> JudgeResponse:
    return judge_problem(payload, "submit")
