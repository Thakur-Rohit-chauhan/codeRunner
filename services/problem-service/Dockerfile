# ============================================
# Problem Service Dockerfile (Phase 3)
# Multi-stage build: compiles proto in builder,
# runs FastAPI + gRPC in final stage.
# ============================================

# ============ Builder Stage ============
FROM python:3.12-slim AS builder

# Install protobuf compiler and grpc tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    protobuf-compiler \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Copy proto files
COPY protos/ ./protos/

# Install grpcio-tools and compile proto files in one step
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
FROM python:3.12-slim AS base

# Install system dependencies (curl for health checks)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd --gid 1000 appuser \
    && useradd --uid 1000 --gid 1000 --create-home appuser

WORKDIR /app

# Install Python dependencies (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy compiled proto output from builder
COPY --from=builder /build/grpc_gen /app/src/app/grpc_gen

# Copy application source code
COPY src/ ./src/

# Set PYTHONPATH so `app` package is importable
ENV PYTHONPATH=/app/src

# Switch to non-root user
USER appuser

# Expose both ports
EXPOSE 8001
EXPOSE 50051

# Health check (REST endpoint)
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

# Run with uvicorn — single worker because gRPC runs in the same event loop
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "1", "--log-level", "info"]
