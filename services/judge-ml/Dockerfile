# ============================================
# Judge-ML Worker Dockerfile (Phase 6)
# Multi-stage: compiles proto in builder,
# runs headless consumer in final stage.
# ============================================

FROM python:3.12-slim AS builder

WORKDIR /build

COPY protos/ ./protos/

RUN pip install --no-cache-dir setuptools grpcio-tools==1.68.1 protobuf==5.29.2 && \
    mkdir -p grpc_gen && \
    python -m grpc_tools.protoc \
      -I=./protos \
      --python_out=./grpc_gen \
      --grpc_python_out=./grpc_gen \
      --pyi_out=./grpc_gen \
      ./protos/problem.proto && \
    touch grpc_gen/__init__.py && \
    sed -i 's/^import problem_pb2/from . import problem_pb2/' grpc_gen/problem_pb2_grpc.py

FROM python:3.12-slim

RUN groupadd --gid 1000 appuser \
    && useradd --uid 1000 --gid 1000 --create-home appuser

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY --from=builder /build/grpc_gen /app/src/app/grpc_gen
COPY src/ ./src/

RUN mkdir -p /home/appuser/.judge-ml-runtime \
    && chown -R appuser:appuser /home/appuser/.judge-ml-runtime

ENV PYTHONPATH=/app/src \
    JUDGE_ML_WORKDIR=/home/appuser/.judge-ml-runtime

USER appuser

CMD ["python", "-m", "app.main"]
