#!/usr/bin/env python3
"""
Async gRPC client test for problem-service.
Tests all gRPC endpoints: GetProblem, GetTestCases, ListProblems,
HealthCheck, plus error handling (NOT_FOUND, INVALID_ARGUMENT).

Usage:
    pip install grpcio grpcio-tools protobuf
    python test_grpc_client.py
"""

import asyncio
import sys
import os
from datetime import datetime

# Add src to path so grpc_gen is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

import grpc
from app.grpc_gen import problem_pb2, problem_pb2_grpc

GRPC_ADDRESS = os.getenv("GRPC_ADDRESS", "localhost:50051")


async def test_health_check(stub):
    """Test HealthCheck endpoint."""
    print("\n=== Testing HealthCheck ===")
    try:
        request = problem_pb2.HealthCheckRequest()
        response = await stub.HealthCheck(request)
        print(f"✅ HealthCheck succeeded:")
        print(f"   Status: {response.status}")
        print(f"   Service: {response.service}")
        print(f"   Database: {response.database}")
        return True
    except grpc.RpcError as e:
        print(f"❌ HealthCheck failed: {e.code()} - {e.details()}")
        return False


async def test_get_problem(stub):
    """Test GetProblem endpoint."""
    print("\n=== Testing GetProblem ===")
    try:
        request = problem_pb2.GetProblemRequest(problem_id=1)
        response = await stub.GetProblem(request)
        print(f"✅ GetProblem(1) succeeded:")
        print(f"   ID: {response.id}")
        print(f"   Title: {response.title}")
        print(f"   Type: {response.problem_type}")
        print(f"   Difficulty: {response.difficulty}")
        print(f"   Time Limit: {response.time_limit}ms")
        print(f"   Memory Limit: {response.memory_limit}MB")
        if response.topics:
            print(f"   Topics: {list(response.topics)}")
        return True
    except grpc.RpcError as e:
        print(f"❌ GetProblem failed: {e.code()} - {e.details()}")
        return False


async def test_get_test_cases(stub):
    """Test GetTestCases endpoint."""
    print("\n=== Testing GetTestCases ===")
    try:
        request = problem_pb2.GetTestCasesRequest(problem_id=1)
        response = await stub.GetTestCases(request)
        print(f"✅ GetTestCases(1) succeeded:")
        print(f"   Problem ID: {response.problem_id}")
        print(f"   Total test cases: {response.total_count}")
        print(f"   Visible test cases: {response.visible_count}")
        for i, tc in enumerate(response.test_cases, 1):
            hidden_label = "(hidden)" if tc.hidden else "(visible)"
            inp = tc.input[:50] + "..." if len(tc.input) > 50 else tc.input
            out = tc.expected_output[:50] + "..." if len(tc.expected_output) > 50 else tc.expected_output
            print(f"     {i}. {hidden_label} Input: {inp} → Expected: {out}")
        return True
    except grpc.RpcError as e:
        print(f"❌ GetTestCases failed: {e.code()} - {e.details()}")
        return False


async def test_list_problems(stub):
    """Test ListProblems endpoint."""
    print("\n=== Testing ListProblems ===")
    try:
        request = problem_pb2.ListProblemsRequest(skip=0, limit=5)
        response = await stub.ListProblems(request)
        print(f"✅ ListProblems succeeded:")
        print(f"   Total problems: {response.total}")
        print(f"   Returned: {len(response.problems)}")
        for p in response.problems:
            print(f"     {p.id}. {p.title} ({p.difficulty}) [{p.problem_type}]")
        return True
    except grpc.RpcError as e:
        print(f"❌ ListProblems failed: {e.code()} - {e.details()}")
        return False


async def test_not_found(stub):
    """Test error handling — non-existent problem should return NOT_FOUND."""
    print("\n=== Testing Error Handling (NOT_FOUND) ===")
    try:
        request = problem_pb2.GetProblemRequest(problem_id=99999)
        await stub.GetProblem(request)
        print("❌ Expected NOT_FOUND error, but got response")
        return False
    except grpc.RpcError as e:
        if e.code() == grpc.StatusCode.NOT_FOUND:
            print(f"✅ Correctly returned NOT_FOUND: {e.details()}")
            return True
        print(f"❌ Got wrong error: {e.code()} - {e.details()}")
        return False


async def test_invalid_input(stub):
    """Test validation — negative problem_id should return INVALID_ARGUMENT."""
    print("\n=== Testing Input Validation (INVALID_ARGUMENT) ===")
    try:
        request = problem_pb2.GetProblemRequest(problem_id=-1)
        await stub.GetProblem(request)
        print("❌ Expected INVALID_ARGUMENT error, but got response")
        return False
    except grpc.RpcError as e:
        if e.code() == grpc.StatusCode.INVALID_ARGUMENT:
            print(f"✅ Correctly returned INVALID_ARGUMENT: {e.details()}")
            return True
        print(f"❌ Got wrong error: {e.code()} - {e.details()}")
        return False


async def main():
    """Run all gRPC tests."""
    print("=" * 60)
    print("gRPC Client Test Suite for problem-service")
    print(f"Target: {GRPC_ADDRESS}")
    print(f"Time: {datetime.now().isoformat()}")
    print("=" * 60)

    # Connect
    print(f"\n⏳ Connecting to {GRPC_ADDRESS}...")
    try:
        channel = grpc.aio.insecure_channel(GRPC_ADDRESS)
        await asyncio.wait_for(channel.channel_ready(), timeout=10)
        print("✅ Connected to gRPC server")
    except Exception as e:
        print(f"❌ Failed to connect: {e}")
        return False

    stub = problem_pb2_grpc.ProblemServiceStub(channel)

    # Run tests
    results = []
    results.append(("HealthCheck", await test_health_check(stub)))
    results.append(("GetProblem", await test_get_problem(stub)))
    results.append(("GetTestCases", await test_get_test_cases(stub)))
    results.append(("ListProblems", await test_list_problems(stub)))
    results.append(("Error Handling (NOT_FOUND)", await test_not_found(stub)))
    results.append(("Input Validation", await test_invalid_input(stub)))

    await channel.close()

    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    passed = sum(1 for _, r in results if r)
    for name, result in results:
        print(f"  {'✅ PASS' if result else '❌ FAIL'}: {name}")
    print(f"\nTotal: {passed}/{len(results)} tests passed")
    print("=" * 60)

    return passed == len(results)


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
