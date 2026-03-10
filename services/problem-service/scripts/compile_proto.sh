#!/usr/bin/env bash
# ============================================
# Compile .proto files for problem-service
# Generates Python gRPC stubs in src/app/grpc_gen/
# ============================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

PROTO_DIR="${PROJECT_DIR}/protos"
OUTPUT_DIR="${PROJECT_DIR}/src/app/grpc_gen"

echo "=== Compiling Proto Files ==="
echo "Proto dir:  ${PROTO_DIR}"
echo "Output dir: ${OUTPUT_DIR}"

# Create output directory
mkdir -p "${OUTPUT_DIR}"

# Compile proto files
python3 -m grpc_tools.protoc \
  -I="${PROTO_DIR}" \
  --python_out="${OUTPUT_DIR}" \
  --grpc_python_out="${OUTPUT_DIR}" \
  --pyi_out="${OUTPUT_DIR}" \
  "${PROTO_DIR}/problem.proto"

# Create __init__.py
touch "${OUTPUT_DIR}/__init__.py"

# Fix relative imports in generated grpc file
# grpc_tools generates: import problem_pb2
# We need:              from . import problem_pb2
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' 's/^import problem_pb2/from . import problem_pb2/' "${OUTPUT_DIR}/problem_pb2_grpc.py"
else
  sed -i 's/^import problem_pb2/from . import problem_pb2/' "${OUTPUT_DIR}/problem_pb2_grpc.py"
fi

echo "=== Proto compilation complete ==="
echo "Generated files:"
ls -la "${OUTPUT_DIR}/"
