"""
Common Pydantic models and response wrappers.
"""
from typing import Generic, Optional, TypeVar, Any
from pydantic import BaseModel, Field

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    """Standardized JSON envelope response."""
    success: bool = True
    message: str = "Operation completed successfully"
    data: Optional[T] = None
    error: Optional[str] = None


class OverviewStats(BaseModel):
    """System overview statistics for dashboard widgets."""
    total_playlists: int = 0
    total_videos: int = 0
    completed_videos: int = 0
    total_tasks: int = 0
    completed_tasks: int = 0
    total_notes: int = 0
    overall_progress_percentage: float = 0.0
