"""
Pydantic schemas for Playlists and Videos.
"""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, HttpUrl


class VideoBase(BaseModel):
    video_id: str
    title: str
    duration: int = 0
    thumbnail_url: Optional[str] = None
    webpage_url: Optional[str] = None
    position: int = 0
    is_completed: bool = False


class VideoResponse(VideoBase):
    id: int
    playlist_id: int
    completed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    @property
    def formatted_duration(self) -> str:
        """Converts duration in seconds to MM:SS or HH:MM:SS."""
        if not self.duration:
            return "00:00"
        hours = self.duration // 3600
        minutes = (self.duration % 3600) // 60
        seconds = self.duration % 60
        if hours > 0:
            return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
        return f"{minutes:02d}:{seconds:02d}"


class VideoToggleRequest(BaseModel):
    is_completed: bool


class PlaylistSearchRequest(BaseModel):
    """
    Search request payload.
    Supports either:
    1. query: "playlist name" + channel: "channel name"
    2. direct_url: Direct YouTube playlist URL
    """
    playlist_name: Optional[str] = Field(None, description="Name or title of the playlist/course")
    channel_name: Optional[str] = Field(None, description="Name of the YouTube channel")
    direct_url: Optional[str] = Field(None, description="Direct URL of the playlist")


class PlaylistBase(BaseModel):
    playlist_id: str
    title: str
    channel_title: Optional[str] = None
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    webpage_url: Optional[str] = None


class PlaylistResponse(PlaylistBase):
    id: int
    total_videos: int = 0
    completed_videos: int = 0
    progress_percentage: float = 0.0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class PlaylistDetailResponse(PlaylistResponse):
    videos: List[VideoResponse] = []
    total_duration_seconds: int = 0
    formatted_total_duration: str = "00:00"
