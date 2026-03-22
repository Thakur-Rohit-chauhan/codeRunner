"""Main API v1 router combining all endpoint groups."""

from fastapi import APIRouter

from app.api.v1.endpoints.contests import router as contests_router
from app.api.v1.endpoints.leaderboards import router as leaderboards_router
from app.api.v1.health import router as health_router

api_v1_router = APIRouter()
api_v1_router.include_router(contests_router)
api_v1_router.include_router(leaderboards_router)
api_v1_router.include_router(health_router)
