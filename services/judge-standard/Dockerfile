# ============================================
# Judge-Standard Worker Dockerfile (Phase 4)
# Multi-stage: compiles proto in builder,
# runs headless consumer in final stage.
# No HTTP port — background worker only.
# ============================================

# ============ Builder Stage ============
FROM python:3.12-slim AS builder

WORKDIR /build

# Copy proto files from problem-service
COPY protos/ ./protos/

# Install grpcio-tools and compile proto stubs
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

# ============ Final Stage ============
FROM python:3.12-slim

# Create non-root user
RUN groupadd --gid 1000 appuser \
    && useradd --uid 1000 --gid 1000 --create-home appuser

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy compiled proto stubs from builder
COPY --from=builder /build/grpc_gen /app/src/app/grpc_gen

# Copy application source
COPY src/ ./src/

# Set PYTHONPATH
ENV PYTHONPATH=/app/src

# Switch to non-root user
USER appuser

# No ports — headless worker
# No healthcheck — not an HTTP service

CMD ["python", "-m", "app.main"]
