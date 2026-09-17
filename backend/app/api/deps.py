import os
from typing import Generator, Optional, Dict, Any
from fastapi import Depends, Header
from app.core.config import settings
from app.core.logging import get_logger
from app.core.exceptions import UnauthorizedException
from app.core.security import decode_access_token
from app.db.session import get_db
from app.db.repositories.user_repo import UserRepository
from app.db.repositories.playlist_repo import PlaylistRepository
from app.db.repositories.task_repo import TaskRepository
from app.db.repositories.note_repo import NoteRepository
from app.db.repositories.settings_repo import SettingsRepository
from app.services.auth_service import AuthService
from app.services.youtube_service import YouTubeService
from app.services.playlist_service import PlaylistService
from app.services.task_service import TaskService
from app.services.ai_service import AIService

auth_logger = get_logger("zenith.auth")


def get_user_repo(db = Depends(get_db)) -> UserRepository:
    return UserRepository(db)


def get_auth_service(user_repo: UserRepository = Depends(get_user_repo)) -> AuthService:
    return AuthService(user_repo)


def get_current_user(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    user_repo: UserRepository = Depends(get_user_repo)
) -> Dict[str, Any]:
    """
    Extracts Bearer token from Authorization header, validates JWT claims,
    and returns current user dict. Raises 401 if missing or invalid.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise UnauthorizedException("يرجى تسجيل الدخول للوصول إلى هذا المحتوى.")

    token = authorization[7:].strip()
    payload = decode_access_token(token)
    if not payload or not payload.get("sub"):
        raise UnauthorizedException("جلسة الدخول منتهية أو غير صالحة. يرجى تسجيل الدخول مجدداً.")

    try:
        user_id = int(payload["sub"])
    except (ValueError, TypeError):
        raise UnauthorizedException("رمز الجلسة غير صالح.")

    user = user_repo.get_by_id(user_id)
    if not user:
        raise UnauthorizedException("حساب المستخدم غير موجود.")
    return user


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
    db_key = settings_repo.get("gemini_api_key")
    return AIService(api_key=db_key)
