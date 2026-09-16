"""
Pydantic schemas for Notes.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class NoteBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., description="Markdown note content")
    tags: Optional[str] = None
    playlist_id: Optional[int] = None
    video_id: Optional[int] = None


class NoteCreate(NoteBase):
    pass


class NoteUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    content: Optional[str] = None
    tags: Optional[str] = None
    playlist_id: Optional[int] = None
    video_id: Optional[int] = None


class NoteResponse(NoteBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    playlist_title: Optional[str] = None
    video_title: Optional[str] = None
