# Judge-Cyber Implementation

## Overview

`judge-cyber` is a queue-driven worker that evaluates cybersecurity packet challenges. It focuses on deterministic packet generation, controlled execution of user-submitted code, and verdict publication back to the platform.

## Core Modules

- `app/config.py`
  Loads service settings such as `RABBITMQ_URL`, queue names, and log configuration.

- `app/packet_engine.py`
  Builds deterministic challenge packets with Scapy. Problems currently cover packet TTL manipulation, malicious TCP detection, and DNS spoof simulation.

- `app/sandbox.py`
  Runs submitted Python code in a subprocess with a short timeout. The sandbox writes packet input to a temporary work directory, executes the submission with the current interpreter, and reads the transformed packet output back as JSON.

- `app/validator.py`
  Compares the transformed packets against expected behavior for each challenge type and returns a normalized verdict payload.

- `app/processor.py`
  Orchestrates the full workflow: decode submission, generate packets, run the sandbox, validate the output, and publish the final result.

- `app/publisher.py`
  Publishes verdict messages to RabbitMQ using `aio-pika`.

## Message Contract

The processor expects a payload shaped like:

```json
{
  "submission_id": 123,
  "type": "cyber",
  "code": "def process_packets(packets): ...",
  "problem_id": 1,
  "language": "python"
}
```

Submissions with a non-`cyber` type are skipped.

## Validation Modes

- `problem_id % 3 == 1`
  Expects TTL values to be incremented.

- `problem_id % 3 == 2`
  Expects malicious TCP packets to be identified consistently.

- `problem_id % 3 == 0`
  Expects DNS spoof indicators to be preserved correctly.

## Windows Notes

- The sandbox uses a manually created temporary work directory rather than relying directly on `TemporaryDirectory()`. This avoids Windows-local temp directory issues in restricted environments.
- The subprocess is launched with `sys.executable` instead of a bare `python` command so the worker uses the active interpreter reliably on Windows.

## Local Smoke Test

A lightweight smoke test can be run from `D:\temp\judge_cyber_test.py` with:

```powershell
& 'C:\Program Files\Python313\python.exe' 'D:\temp\judge_cyber_test.py'
```

For local host-side testing, set or inherit:

```powershell
$env:RABBITMQ_URL='amqp://guest:guest@localhost:5672/'
```
