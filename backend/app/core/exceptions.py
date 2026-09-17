"""
Custom domain exceptions for centralized error handling.
"""
from typing import Any, Optional


class AppBaseException(Exception):
    """Base exception for all domain-specific errors."""
    def __init__(self, message: str, status_code: int = 400, details: Optional[Any] = None) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details


class ResourceNotFoundException(AppBaseException):
    """Raised when an entity is not found in the database."""
    def __init__(self, resource_name: str, resource_id: Any) -> None:
        message = f"{resource_name} with id '{resource_id}' was not found."
        super().__init__(message=message, status_code=404)


class YouTubeExtractionError(AppBaseException):
    """Raised when yt-dlp fails to search or extract playlist metadata."""
    def __init__(self, message: str, details: Optional[Any] = None) -> None:
        super().__init__(message=message, status_code=422, details=details)


class AIServiceError(AppBaseException):
    """Raised when Gemini AI service fails."""
    def __init__(self, message: str, details: Optional[Any] = None) -> None:
        super().__init__(message=message, status_code=502, details=details)


class UnauthorizedException(AppBaseException):
    """Raised when authentication fails or is missing on protected routes."""
    def __init__(self, message: str = "مفتاح المصادقة غير صالح أو مفقود.", details: Optional[Any] = None) -> None:
        super().__init__(message=message, status_code=401, details=details)


class ValidationException(AppBaseException):
    """Raised when request payload or parameters fail validation."""
    def __init__(self, message: str = "بيانات الطلب غير صحيحة.", details: Optional[Any] = None) -> None:
        super().__init__(message=message, status_code=400, details=details)

