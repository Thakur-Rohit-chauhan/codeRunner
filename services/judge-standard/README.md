# Judge Standard Service

Execution worker for standard programming problems (DSA) that consumes
RabbitMQ submissions and executes code in sandboxed Docker containers.

## Responsibilities

- Consume submissions from `standard_judge_queue`
- Compile and execute code in isolated containers
- Test case validation
- Resource limit enforcement (CPU, memory, process/file limits, timeout)
- Security sandboxing (no network, non-root, read-only fs, seccomp, no-new-privileges)
- Result reporting back to contest service

## Technology

- Python FastAPI
- Docker CLI + Docker socket (`/var/run/docker.sock`)
- Runtime images:
  - Python: `python:3.12-slim`
  - C++: `gcc:14`
  - Java: `eclipse-temurin:21-jdk`
  - JavaScript: `node:20-slim`

## Verdicts

- `AC`: all tests passed
- `WA`: output mismatch
- `TLE`: exceeded time limit
- `CE`: compilation failed
- `RE`: runtime failure
- `MLE`: memory-related runtime failure

## Environment Variables

- `DOCKER_SECCOMP_PROFILE` (optional): e.g. `/app/seccomp/untrusted-code.json`
- `PYTHON_IMAGE`, `CPP_IMAGE`, `JAVA_IMAGE`, `JAVASCRIPT_IMAGE`
- `COMPILATION_TIMEOUT_MS`
- `EXECUTION_CPU_COUNT`, `EXECUTION_PIDS_LIMIT`, `EXECUTION_NOFILE_LIMIT`
- `COMPARE_NORMALIZE_WHITESPACE`, `COMPARE_CASE_SENSITIVE`, `COMPARE_FLOAT_REL_TOL`

## Structure

- `src/`: Python source code
- `Dockerfile`: Container build configuration
