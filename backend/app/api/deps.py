"""
FastAPI Dependency Injections for clean architecture.
"""
from typing import Generator
from fastapi import Depends
from app.db.session import get_db
from app.db.repositories.playlist_repo import PlaylistRepository
from app.db.repositories.task_repo import TaskRepository
from app.db.repositories.note_repo import NoteRepository
from app.db.repositories.settings_repo import SettingsRepository
from app.services.youtube_service import YouTubeService
from app.services.playlist_service import PlaylistService
from app.services.task_service import TaskService
from app.services.ai_service import AIService


def get_playlist_repo(db = Depends(get_db)) -> PlaylistRepository:
    return PlaylistRepository(db)


def get_task_repo(db = Depends(get_db)) -> TaskRepository:
    return TaskRepository(db)


def get_note_repo(db = Depends(get_db)) -> NoteRepository:
    return NoteRepository(db)


def get_settings_repo(db = Depends(get_db)) -> SettingsRepository:
    return SettingsRepository(db)


def get_youtube_service() -> YouTubeService:
    return YouTubeService()


def get_playlist_service(
    repo: PlaylistRepository = Depends(get_playlist_repo),
    yt_service: YouTubeService = Depends(get_youtube_service)
) -> PlaylistService:
    return PlaylistService(repo, yt_service)


def get_task_service(
    repo: TaskRepository = Depends(get_task_repo)
) -> TaskService:
    return TaskService(repo)


def get_ai_service(
    settings_repo: SettingsRepository = Depends(get_settings_repo)
) -> AIService:
    # Check if a custom key is stored in DB settings first
    db_key = settings_repo.get("gemini_api_key")
    return AIService(api_key=db_key)
