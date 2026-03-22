"""Main API v1 router combining all endpoint groups.

Includes problem CRUD endpoints and health check endpoint.
"""

from fastapi import APIRouter

from app.api.v1.endpoints.problems import router as problems_router
from app.api.v1.health import router as health_router

api_v1_router = APIRouter()

# Include problem endpoints: POST/GET /api/problems, GET /api/problems/{id}
api_v1_router.include_router(problems_router)

# Include health check: GET /health
api_v1_router.include_router(health_router)
