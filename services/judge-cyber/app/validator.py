"""Validation engine for cyber packet challenges."""

from typing import List, Dict


def validate_packets(
    problem_id: int,
    original_packets: List[Dict],
    result_packets: List[Dict],
    execution_logs: str,
) -> Dict[str, object]:
    if result_packets is None:
        return {"status": "wrong_answer", "score": 0, "logs": execution_logs}

    expected = []

    if problem_id % 3 == 1:
        # TTL should be incremented by 1 in each packet if answered correctly.
        expected = [p["ttl"] + 1 for p in original_packets if "ttl" in p]
        actual = [p.get("ttl") for p in result_packets]
        if actual == expected:
            return {"status": "accepted", "score": 100, "logs": "TTL updated correctly"}

    elif problem_id % 3 == 2:
        # Detect malicious signature in packet payloads.
        expected = [p.get("malicious", False) for p in original_packets]
        actual = [p.get("malicious", False) for p in result_packets]
        if actual == expected:
            return {"status": "accepted", "score": 100, "logs": "Malicious packets detected correctly"}

    else:
        # DNS spoof simulation: replacement domain
        expected = [p.get("spoofed", False) for p in original_packets]
        actual = [p.get("spoofed", False) for p in result_packets]
        if actual == expected:
            return {"status": "accepted", "score": 100, "logs": "DNS spoof results are correct"}

    if execution_logs == "timeout":
        return {"status": "timeout", "score": 0, "logs": execution_logs}

    return {"status": "wrong_answer", "score": 0, "logs": execution_logs}
