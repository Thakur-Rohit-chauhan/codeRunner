# Judge Cyber Service

Specialized evaluation worker for cybersecurity challenges. The service generates packet-based tasks, runs user code in a sandboxed subprocess, validates the result, and publishes verdicts to RabbitMQ.

## Responsibilities

- Network packet capture and analysis
- Cybersecurity challenge evaluation
- Packet transformation and validation
- Result publishing through RabbitMQ
- Local and containerized execution support

## Runtime Flow

1. A submission payload is received from the queue.
2. The service generates deterministic packets for the selected problem.
3. User code is executed in an isolated subprocess against those packets.
4. The validator scores the transformed packets.
5. The verdict is published to the results queue.

## Structure

- `app/config.py`: service settings and environment loading
- `app/consumer.py`: queue consumer entrypoint
- `app/logger.py`: logging setup
- `app/main.py`: worker bootstrap
- `app/packet_engine.py`: packet generation helpers built on Scapy
- `app/processor.py`: submission processing pipeline
- `app/publisher.py`: RabbitMQ result publishing
- `app/sandbox.py`: isolated subprocess execution for user code
- `app/validator.py`: scoring logic for packet challenges
- `requirements.txt`: Python dependencies

## Notes

- The sandbox uses the current Python interpreter via `sys.executable`, which makes local Windows testing more reliable.
- For host-side testing on Windows, use a reachable RabbitMQ URL such as `amqp://guest:guest@localhost:5672/`.
- Docker/runtime wiring is intentionally left unchanged in this branch rewrite.
