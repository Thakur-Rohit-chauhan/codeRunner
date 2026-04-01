# Judge-ML Worker

Background worker for Machine Learning submissions in the Universal Contest Platform.

## Responsibilities

- Consume ML submissions from RabbitMQ (`ml_judge_queue`)
- Fetch problem metadata and hidden checks from `problem-service` over gRPC
- Execute Python and notebook-style submissions in an isolated worker subprocess
- Persist verdicts back to the shared submissions table
- Publish final results to `results_queue` for downstream consumers

## Evaluation Model

The worker mirrors `judge-standard` operationally, but uses an ML-specific
runtime and evaluation engine. It supports:

- Python scripts and notebook JSON submissions
- Metadata-driven checks such as required imports, functions, frameworks, metric thresholds, and required runtime artifacts
- Hidden test-case checks encoded as JSON specs
- Real subprocess execution with time and memory enforcement
- Import and builtin restrictions for safer sandbox-style evaluation
- Fallback heuristic validation when a problem has no explicit ML metadata

## Structure

- `src/app/main.py`: Worker entry point
- `src/app/workers/`: RabbitMQ consumer and message handler
- `src/app/services/problem_client.py`: gRPC client to `problem-service`
- `src/app/services/execution_engine.py`: ML evaluation engine
- `src/app/repositories/`: Submission update helpers
- `Dockerfile`: Container build for the headless worker
