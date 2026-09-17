import os
from typing import Generator, Optional
from fastapi import Depends, Header
from app.core.config import settings
from app.core.logging import get_logger
from app.core.exceptions import UnauthorizedException
from app.db.session import get_db
from app.db.repositories.playlist_repo import PlaylistRepository
from app.db.repositories.task_repo import TaskRepository
from app.db.repositories.note_repo import NoteRepository
from app.db.repositories.settings_repo import SettingsRepository
from app.services.youtube_service import YouTubeService
from app.services.playlist_service import PlaylistService
from app.services.task_service import TaskService
from app.services.ai_service import AIService

auth_logger = get_logger("zenith.auth")


def verify_auth(
    x_zenith_key: Optional[str] = Header(None, alias="X-Zenith-Key")
) -> None:
    """
    Minimal auth guard validating X-Zenith-Key against ZENITH_ADMIN_KEY.
    If ZENITH_ADMIN_KEY is unset, logs a warning and permits open access for local dev.
    """
    expected_key = os.getenv("ZENITH_ADMIN_KEY") or settings.ZENITH_ADMIN_KEY
    if not expected_key:
        auth_logger.warning("ZENITH_ADMIN_KEY is not set; mutating endpoints are open without authentication.")
        return

    if not x_zenith_key or x_zenith_key != expected_key:
        raise UnauthorizedException("مفتاح المصادقة غير صالح أو مفقود (X-Zenith-Key).")



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
