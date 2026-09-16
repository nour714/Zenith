"""
V1 API Routers aggregation.
"""
from fastapi import APIRouter
from app.api.v1.endpoints import playlists, tasks, notes, settings, ai, stats

api_router = APIRouter()

api_router.include_router(playlists.router, prefix="/playlists", tags=["Playlists"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["Tasks"])
api_router.include_router(notes.router, prefix="/notes", tags=["Notes"])
api_router.include_router(settings.router, prefix="/settings", tags=["Settings"])
api_router.include_router(ai.router, prefix="/ai", tags=["AI Features"])
api_router.include_router(stats.router, prefix="/stats", tags=["Statistics"])
