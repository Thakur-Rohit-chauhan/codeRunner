"""gRPC servicer implementation for ProblemService.

Implements all RPCs defined in problem.proto: GetProblem, GetTestCases,
ListProblems, and HealthCheck. Uses the shared async database session
factory and ProblemRepository for data access.
"""

import json
import time

import grpc
from sqlalchemy import text

from app.database import async_session_factory
from app.logger import get_logger
from app.models.problem import Problem
from app.repositories.problem_repository import ProblemRepository

logger = get_logger(__name__)


class ProblemServicer:
    """Async gRPC service implementation for problems.

    Each RPC acquires its own database session via the shared
    async_session_factory, ensuring proper connection lifecycle.
    """

    def __init__(self) -> None:
        self.repo = ProblemRepository()

    async def GetProblem(self, request, context):
        """Get a single problem by ID.

        Returns ProblemResponse on success.
        Aborts with INVALID_ARGUMENT or NOT_FOUND on error.
        """
        from app.grpc_gen import problem_pb2

        start = time.monotonic()
        problem_id = request.problem_id

        try:
            if problem_id <= 0:
                await context.abort(
                    grpc.StatusCode.INVALID_ARGUMENT,
                    f"Invalid problem_id: {problem_id}",
                )

            async with async_session_factory() as session:
                problem = await self.repo.get_by_id(session, problem_id)

            if not problem:
                await context.abort(
                    grpc.StatusCode.NOT_FOUND,
                    f"Problem {problem_id} not found",
                )

            # Parse topics from JSON string
            topics = []
            if problem.topics:
                try:
                    topics = json.loads(problem.topics)
                except (json.JSONDecodeError, TypeError):
                    topics = []

            # Build metadata Struct if present
            metadata_struct = None
            if problem.metadata_:
                from google.protobuf import struct_pb2

                metadata_struct = struct_pb2.Struct()
                metadata_struct.update(problem.metadata_)

            response = problem_pb2.ProblemResponse(
                id=problem.id,
                title=problem.title,
                description=problem.description,
                problem_type=problem.problem_type,
                time_limit=problem.time_limit,
                memory_limit=problem.memory_limit,
                difficulty=problem.difficulty,
                topics=topics,
                created_at=problem.created_at.isoformat(),
            )
            if metadata_struct:
                response.metadata.CopyFrom(metadata_struct)

            elapsed = (time.monotonic() - start) * 1000
            logger.info(
                "gRPC: GetProblem(%d) → OK | duration=%.1fms",
                problem_id,
                elapsed,
            )
            return response

        except grpc.aio.AbortError:
            raise
        except Exception as exc:
            logger.error("gRPC GetProblem error: %s", exc, exc_info=True)
            await context.abort(
                grpc.StatusCode.INTERNAL,
                "Internal server error",
            )

    async def GetTestCases(self, request, context):
        """Get all test cases for a problem (including hidden).

        Returns TestCasesResponse on success.
        Aborts with INVALID_ARGUMENT or NOT_FOUND on error.
        """
        from app.grpc_gen import problem_pb2

        start = time.monotonic()
        problem_id = request.problem_id

        try:
            if problem_id <= 0:
                await context.abort(
                    grpc.StatusCode.INVALID_ARGUMENT,
                    f"Invalid problem_id: {problem_id}",
                )

            async with async_session_factory() as session:
                # Verify problem exists
                problem = await self.repo.get_by_id(session, problem_id)
                if not problem:
                    await context.abort(
                        grpc.StatusCode.NOT_FOUND,
                        f"Problem {problem_id} not found",
                    )

                # Fetch test cases
                test_cases = await self.repo.get_test_cases(session, problem_id)

            # Convert to protobuf
            pb_test_cases = []
            visible_count = 0

            for tc in test_cases:
                pb_tc = problem_pb2.TestCase(
                    input=tc.input_data,
                    expected_output=tc.expected_output,
                    time_limit=tc.time_limit_override or 0,
                    hidden=1 if tc.is_hidden else 0,
                )
                pb_test_cases.append(pb_tc)
                if not tc.is_hidden:
                    visible_count += 1

            response = problem_pb2.TestCasesResponse(
                problem_id=problem_id,
                test_cases=pb_test_cases,
                total_count=len(pb_test_cases),
                visible_count=visible_count,
            )

            elapsed = (time.monotonic() - start) * 1000
            logger.info(
                "gRPC: GetTestCases(%d) → %d cases (%d visible) | duration=%.1fms",
                problem_id,
                len(pb_test_cases),
                visible_count,
                elapsed,
            )
            return response

        except grpc.aio.AbortError:
            raise
        except Exception as exc:
            logger.error("gRPC GetTestCases error: %s", exc, exc_info=True)
            await context.abort(
                grpc.StatusCode.INTERNAL,
                "Internal server error",
            )

    async def ListProblems(self, request, context):
        """List problems with pagination and optional type filter.

        Returns ListProblemsResponse on success.
        """
        from app.grpc_gen import problem_pb2

        start = time.monotonic()

        try:
            skip = max(request.skip, 0)
            limit = min(max(request.limit or 10, 1), 100)
            problem_type = request.problem_type or None

            async with async_session_factory() as session:
                problems, total = await self.repo.list_problems(
                    session,
                    skip=skip,
                    limit=limit,
                    problem_type=problem_type,
                )

            pb_problems = [
                problem_pb2.ProblemSummary(
                    id=p.id,
                    title=p.title,
                    problem_type=p.problem_type,
                    difficulty=p.difficulty,
                )
                for p in problems
            ]

            response = problem_pb2.ListProblemsResponse(
                problems=pb_problems,
                total=total,
                skip=skip,
                limit=limit,
            )

            elapsed = (time.monotonic() - start) * 1000
            logger.info(
                "gRPC: ListProblems(skip=%d, limit=%d) → %d/%d | duration=%.1fms",
                skip,
                limit,
                len(problems),
                total,
                elapsed,
            )
            return response

        except Exception as exc:
            logger.error("gRPC ListProblems error: %s", exc, exc_info=True)
            await context.abort(
                grpc.StatusCode.INTERNAL,
                "Internal server error",
            )

    async def HealthCheck(self, request, context):
        """gRPC health check — verifies database connectivity.

        Returns HealthCheckResponse (never aborts).
        """
        from app.grpc_gen import problem_pb2

        try:
            db_status = "connected"
            try:
                async with async_session_factory() as session:
                    await session.execute(text("SELECT 1"))
            except Exception:
                db_status = "disconnected"

            status = "healthy" if db_status == "connected" else "unhealthy"

            return problem_pb2.HealthCheckResponse(
                status=status,
                service="problem-service",
                database=db_status,
            )

        except Exception as exc:
            logger.error("gRPC HealthCheck error: %s", exc, exc_info=True)
            return problem_pb2.HealthCheckResponse(
                status="unhealthy",
                service="problem-service",
                database="disconnected",
            )
