"""gRPC server lifecycle management.

Handles async gRPC server startup, shutdown, and reflection
for the problem-service dual-protocol setup.
"""

import grpc
from grpc_reflection.v1alpha import reflection

from app.logger import get_logger

logger = get_logger(__name__)


class GrpcServer:
    """Manage async gRPC server lifecycle.

    Attributes:
        host: Bind address for the gRPC server.
        port: Port number for the gRPC server.
        server: The grpc.aio.Server instance (set after start).
    """

    def __init__(self, host: str = "0.0.0.0", port: int = 50051) -> None:
        self.host = host
        self.port = port
        self.server: grpc.aio.Server | None = None

    async def start(self, servicer) -> None:
        """Start the async gRPC server with the given servicer.

        Registers the servicer, enables server reflection for debugging
        (grpcurl), binds to the configured address, and starts serving.

        Args:
            servicer: ProblemServicer instance implementing the RPCs.
        """
        from app.grpc_gen import problem_pb2, problem_pb2_grpc

        try:
            self.server = grpc.aio.server()

            # Register servicer
            problem_pb2_grpc.add_ProblemServiceServicer_to_server(
                servicer, self.server
            )

            # Enable reflection for grpcurl / debugging
            service_names = (
                problem_pb2.DESCRIPTOR.services_by_name["ProblemService"].full_name,
                reflection.SERVICE_NAME,
            )
            reflection.enable_server_reflection(service_names, self.server)

            # Bind to address
            listen_addr = f"{self.host}:{self.port}"
            self.server.add_insecure_port(listen_addr)

            await self.server.start()
            logger.info("gRPC server started on %s", listen_addr)

            # Block until termination
            await self.server.wait_for_termination()

        except Exception as exc:
            logger.error("gRPC server error: %s", exc, exc_info=True)
            raise

    async def stop(self) -> None:
        """Stop the gRPC server gracefully with a 5-second grace period."""
        if self.server:
            await self.server.stop(grace=5)
            logger.info("gRPC server stopped")
