from __future__ import annotations

from typing import Any


def _code_starters(title: str) -> dict[str, str]:
    return {
        "python": (
            f"# {title}\n"
            "import sys\n\n"
            "def solve(data: str) -> str:\n"
            "    # Write your solution here.\n"
            "    return ''\n\n"
            "if __name__ == '__main__':\n"
            "    print(solve(sys.stdin.read()), end='')\n"
        ),
        "cpp": (
            f"// {title}\n"
            "#include <iostream>\n"
            "#include <iterator>\n"
            "#include <string>\n"
            "using namespace std;\n\n"
            "string solve(const string& input) {\n"
            "    // Write your solution here.\n"
            "    return \"\";\n"
            "}\n\n"
            "int main() {\n"
            "    string input((istreambuf_iterator<char>(cin)), istreambuf_iterator<char>());\n"
            "    cout << solve(input);\n"
            "    return 0;\n"
            "}\n"
        ),
        "java": (
            f"// {title}\n"
            "import java.io.*;\n"
            "import java.nio.charset.StandardCharsets;\n\n"
            "public class Main {\n"
            "    static String solve(String input) {\n"
            "        // Write your solution here.\n"
            "        return \"\";\n"
            "    }\n\n"
            "    public static void main(String[] args) throws Exception {\n"
            "        String input = new String(System.in.readAllBytes(), StandardCharsets.UTF_8);\n"
            "        System.out.print(solve(input));\n"
            "    }\n"
            "}\n"
        ),
        "javascript": (
            f"// {title}\n"
            "const fs = require('fs');\n\n"
            "function solve(input) {\n"
            "  // Write your solution here.\n"
            "  return '';\n"
            "}\n\n"
            "const input = fs.readFileSync(0, 'utf8');\n"
            "process.stdout.write(String(solve(input)));\n"
        ),
    }


def _ml_starter(title: str, function_name: str) -> dict[str, str]:
    return {
        "python": (
            f"# {title}\n"
            f"def {function_name}(train_rows, test_rows):\n"
            "    # train_rows contains labeled examples.\n"
            "    # test_rows contains unlabeled examples.\n"
            "    # Return one prediction per test row.\n"
            "    return []\n"
        )
    }


def _packet_starter(title: str) -> dict[str, str]:
    return {
        "python": (
            f"# {title}\n"
            "from scapy.all import DNS, DNSQR, IP, TCP, UDP\n\n"
            "def build_packets():\n"
            "    # Return a list of Scapy packets.\n"
            "    return []\n"
        )
    }


PROBLEM_CATALOG: list[dict[str, Any]] = [
    {
        "id": 1001,
        "title": "Array Sum",
        "domain": "DSA",
        "difficulty": "Easy",
        "acceptance": "74.0%",
        "tags": ["Array", "Math"],
        "companies": ["Internal"],
        "description": (
            "Read a whitespace separated list of integers from standard input and print their sum."
        ),
        "examples": [
            {"input": "1 2 3 4", "output": "10", "explanation": "1 + 2 + 3 + 4 = 10."},
            {"input": "10 -3 7", "output": "14", "explanation": "10 - 3 + 7 = 14."},
        ],
        "constraints": [
            "The input may contain any number of integers.",
            "Print exactly one integer followed by an optional newline.",
        ],
        "starterCode": _code_starters("Array Sum"),
        "testCases": [
            {"input": "1 2 3 4\n", "expectedOutput": "10"},
            {"input": "10 -3 7\n", "expectedOutput": "14"},
        ],
        "judge": {
            "type": "stdio",
            "time_limit_ms": 2000,
            "memory_limit_mb": 256,
            "cases": [
                {"input": "1 2 3 4\n", "expected_output": "10", "hidden": False},
                {"input": "10 -3 7\n", "expected_output": "14", "hidden": False},
                {"input": "100 200 300 400 500\n", "expected_output": "1500", "hidden": True},
                {"input": "-5 -5 -5 20\n", "expected_output": "5", "hidden": True},
            ],
        },
    },
    {
        "id": 1002,
        "title": "Alternating Binary String",
        "domain": "DSA",
        "difficulty": "Easy",
        "acceptance": "68.0%",
        "tags": ["String", "Greedy"],
        "companies": ["Internal"],
        "description": (
            "Read a binary string from stdin and print the minimum number of character flips "
            "needed to make it alternating."
        ),
        "examples": [
            {"input": "0100", "output": "1", "explanation": "Change the last character to make 0101."},
            {"input": "1111", "output": "2", "explanation": "Change positions 2 and 4 to make 1010."},
        ],
        "constraints": [
            "The input contains only 0 and 1 characters.",
            "Print the minimum number of flips as an integer.",
        ],
        "starterCode": _code_starters("Alternating Binary String"),
        "testCases": [
            {"input": "0100\n", "expectedOutput": "1"},
            {"input": "1111\n", "expectedOutput": "2"},
        ],
        "judge": {
            "type": "stdio",
            "time_limit_ms": 2000,
            "memory_limit_mb": 256,
            "cases": [
                {"input": "0100\n", "expected_output": "1", "hidden": False},
                {"input": "1111\n", "expected_output": "2", "hidden": False},
                {"input": "10010100\n", "expected_output": "3", "hidden": True},
                {"input": "1\n", "expected_output": "0", "hidden": True},
            ],
        },
    },
    {
        "id": 1003,
        "title": "Balanced Brackets",
        "domain": "DSA",
        "difficulty": "Medium",
        "acceptance": "57.0%",
        "tags": ["Stack", "String"],
        "companies": ["Internal"],
        "description": (
            "Read a string containing only bracket characters and print true if it is balanced, "
            "otherwise print false."
        ),
        "examples": [
            {"input": "{[()]}", "output": "true", "explanation": "All brackets close in the correct order."},
            {"input": "{[(])}", "output": "false", "explanation": "The nesting order is invalid."},
        ],
        "constraints": [
            "The input string length is at most 10^5.",
            "Print true or false in lowercase.",
        ],
        "starterCode": _code_starters("Balanced Brackets"),
        "testCases": [
            {"input": "{[()]}\n", "expectedOutput": "true"},
            {"input": "{[(])}\n", "expectedOutput": "false"},
        ],
        "judge": {
            "type": "stdio",
            "time_limit_ms": 2000,
            "memory_limit_mb": 256,
            "cases": [
                {"input": "{[()]}\n", "expected_output": "true", "hidden": False},
                {"input": "{[(])}\n", "expected_output": "false", "hidden": False},
                {"input": "(()(()))\n", "expected_output": "true", "hidden": True},
                {"input": "([)]\n", "expected_output": "false", "hidden": True},
            ],
        },
    },
    {
        "id": 1004,
        "title": "Diagonal Difference",
        "domain": "DSA",
        "difficulty": "Easy",
        "acceptance": "70.0%",
        "tags": ["Matrix", "Implementation"],
        "companies": ["Internal"],
        "description": (
            "The first line contains N. The next N lines contain an N x N matrix. "
            "Print the absolute difference between the primary and secondary diagonal sums."
        ),
        "examples": [
            {
                "input": "3\n1 2 3\n4 5 6\n9 8 9",
                "output": "2",
                "explanation": "|(1 + 5 + 9) - (3 + 5 + 9)| = 2.",
            }
        ],
        "constraints": [
            "1 <= N <= 100",
            "All matrix values fit within signed 32-bit integers.",
        ],
        "starterCode": _code_starters("Diagonal Difference"),
        "testCases": [
            {"input": "3\n1 2 3\n4 5 6\n9 8 9\n", "expectedOutput": "2"},
        ],
        "judge": {
            "type": "stdio",
            "time_limit_ms": 2000,
            "memory_limit_mb": 256,
            "cases": [
                {"input": "3\n1 2 3\n4 5 6\n9 8 9\n", "expected_output": "2", "hidden": False},
                {"input": "4\n5 1 2 3\n4 8 6 7\n7 6 9 2\n1 3 4 2\n", "expected_output": "5", "hidden": True},
            ],
        },
    },
    {
        "id": 2001,
        "title": "Iris Mini Classifier",
        "domain": "ML",
        "difficulty": "Medium",
        "acceptance": "52.0%",
        "tags": ["Classification", "Python"],
        "companies": ["Internal"],
        "description": (
            "Implement train_and_predict(train_rows, test_rows). Each train row contains "
            "numerical iris features plus a label. Return one predicted label per test row."
        ),
        "examples": [
            {
                "input": "train_rows, test_rows provided by the judge",
                "output": "['setosa', 'virginica', ...]",
                "explanation": "The hidden evaluation computes classification accuracy.",
            }
        ],
        "constraints": [
            "Use pure Python.",
            "Return one string label per test row.",
        ],
        "starterCode": _ml_starter("Iris Mini Classifier", "train_and_predict"),
        "testCases": [
            {"input": "hidden judge dataset", "expectedOutput": "accuracy >= 0.75"},
        ],
        "judge": {
            "type": "ml_function",
            "function_name": "train_and_predict",
            "metric": "accuracy",
            "threshold": 0.75,
            "train_rows": [
                {"sl": 5.1, "sw": 3.5, "pl": 1.4, "pw": 0.2, "label": "setosa"},
                {"sl": 4.9, "sw": 3.0, "pl": 1.4, "pw": 0.2, "label": "setosa"},
                {"sl": 6.3, "sw": 3.3, "pl": 6.0, "pw": 2.5, "label": "virginica"},
                {"sl": 5.8, "sw": 2.7, "pl": 5.1, "pw": 1.9, "label": "virginica"},
                {"sl": 5.5, "sw": 2.4, "pl": 3.8, "pw": 1.1, "label": "versicolor"},
                {"sl": 6.1, "sw": 2.8, "pl": 4.7, "pw": 1.2, "label": "versicolor"},
            ],
            "test_rows": [
                {"sl": 5.0, "sw": 3.4, "pl": 1.5, "pw": 0.2},
                {"sl": 6.5, "sw": 3.0, "pl": 5.8, "pw": 2.2},
                {"sl": 5.9, "sw": 3.0, "pl": 4.2, "pw": 1.5},
                {"sl": 4.8, "sw": 3.1, "pl": 1.6, "pw": 0.2},
            ],
            "expected": ["setosa", "virginica", "versicolor", "setosa"],
            "time_limit_ms": 4000,
            "memory_limit_mb": 256,
        },
    },
    {
        "id": 2002,
        "title": "Demand Forecast Mini",
        "domain": "ML",
        "difficulty": "Medium",
        "acceptance": "48.0%",
        "tags": ["Regression", "Python"],
        "companies": ["Internal"],
        "description": (
            "Implement train_and_predict(train_rows, test_rows) and return one numeric demand "
            "forecast per hidden test row. The judge computes mean absolute error."
        ),
        "examples": [
            {
                "input": "train_rows, test_rows provided by the judge",
                "output": "[23.5, 41.0, ...]",
                "explanation": "Lower mean absolute error earns a higher score.",
            }
        ],
        "constraints": [
            "Return one integer or float per hidden test row.",
            "Use pure Python.",
        ],
        "starterCode": _ml_starter("Demand Forecast Mini", "train_and_predict"),
        "testCases": [
            {"input": "hidden judge dataset", "expectedOutput": "mae <= 3.0"},
        ],
        "judge": {
            "type": "ml_function",
            "function_name": "train_and_predict",
            "metric": "mae",
            "threshold": 3.0,
            "train_rows": [
                {"hour": 8, "promo": 0, "temp": 18, "demand": 31},
                {"hour": 12, "promo": 0, "temp": 24, "demand": 44},
                {"hour": 18, "promo": 1, "temp": 27, "demand": 63},
                {"hour": 20, "promo": 1, "temp": 22, "demand": 58},
                {"hour": 9, "promo": 0, "temp": 16, "demand": 29},
                {"hour": 14, "promo": 1, "temp": 25, "demand": 57},
            ],
            "test_rows": [
                {"hour": 10, "promo": 0, "temp": 20},
                {"hour": 19, "promo": 1, "temp": 24},
                {"hour": 13, "promo": 0, "temp": 23},
            ],
            "expected": [35.0, 60.0, 43.0],
            "time_limit_ms": 4000,
            "memory_limit_mb": 256,
        },
    },
    {
        "id": 3001,
        "title": "Craft TCP SYN Probe",
        "domain": "CTF",
        "difficulty": "Easy",
        "acceptance": "46.0%",
        "tags": ["Packet Analysis", "Scapy"],
        "companies": ["Internal"],
        "description": (
            "Implement build_packets() and return a packet list containing a TCP SYN probe "
            "to 10.10.10.10:443."
        ),
        "examples": [
            {
                "input": "No stdin. The judge executes build_packets().",
                "output": "A list containing one valid SYN packet.",
                "explanation": "The packet must target TCP port 443 with the SYN flag set.",
            }
        ],
        "constraints": [
            "Return a list of Scapy Packet objects.",
            "Use only Python + Scapy.",
        ],
        "starterCode": _packet_starter("Craft TCP SYN Probe"),
        "testCases": [
            {"input": "build_packets()", "expectedOutput": "1 valid SYN packet"},
        ],
        "judge": {
            "type": "packet_builder",
            "validator": "tcp_syn_probe",
            "time_limit_ms": 3000,
            "memory_limit_mb": 256,
        },
    },
    {
        "id": 3002,
        "title": "Craft DNS Lookup",
        "domain": "CTF",
        "difficulty": "Medium",
        "acceptance": "41.0%",
        "tags": ["Packet Analysis", "DNS", "Scapy"],
        "companies": ["Internal"],
        "description": (
            "Implement build_packets() and return a packet list containing a DNS query for "
            "flag.internal sent to 10.10.10.53 over UDP/53."
        ),
        "examples": [
            {
                "input": "No stdin. The judge executes build_packets().",
                "output": "A list containing one valid DNS query packet.",
                "explanation": "The question name must be flag.internal.",
            }
        ],
        "constraints": [
            "Return a list of Scapy Packet objects.",
            "Use only Python + Scapy.",
        ],
        "starterCode": _packet_starter("Craft DNS Lookup"),
        "testCases": [
            {"input": "build_packets()", "expectedOutput": "1 valid DNS query packet"},
        ],
        "judge": {
            "type": "packet_builder",
            "validator": "dns_lookup",
            "time_limit_ms": 3000,
            "memory_limit_mb": 256,
        },
    },
]


PROBLEM_BY_ID = {int(problem["id"]): problem for problem in PROBLEM_CATALOG}


def get_problem(problem_id: int | None) -> dict[str, Any] | None:
    if problem_id is None:
        return None
    return PROBLEM_BY_ID.get(int(problem_id))


def list_problem_topics() -> list[str]:
    topics = sorted(
        {
            str(tag)
            for problem in PROBLEM_CATALOG
            for tag in problem.get("tags", [])
            if isinstance(tag, str) and tag.strip()
        }
    )
    return topics
