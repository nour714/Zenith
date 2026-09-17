"""
Authentication endpoints: Registration, Login, Google OAuth, and Profile.
"""
from fastapi import APIRouter, Depends, status
from app.models.user import (
    UserRegister,
    UserLogin,
    GoogleLoginRequest,
    TokenResponse,
    UserResponse,
    UserProfileUpdate,
)
from app.services.auth_service import AuthService
from app.api.deps import get_auth_service, get_current_user
from app.core.config import settings

router = APIRouter(tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(
    data: UserRegister,
    auth_service: AuthService = Depends(get_auth_service)
):
    """Creates a new user account and returns access token."""
    return auth_service.register(data)


@router.post("/login", response_model=TokenResponse)
def login(
    data: UserLogin,
    auth_service: AuthService = Depends(get_auth_service)
):
    """Authenticates user with email and password and returns access token."""
    return auth_service.login(data)


@router.post("/google", response_model=TokenResponse)
def google_login(
    data: GoogleLoginRequest,
    auth_service: AuthService = Depends(get_auth_service)
):
    """Authenticates or signs up user via verified Google OAuth ID token."""
    return auth_service.login_with_google(data)


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(
    current_user: dict = Depends(get_current_user)
):
    """Returns profile information for the authenticated user."""
    return UserResponse(**current_user)


@router.put("/profile", response_model=UserResponse)
def update_profile(
    data: UserProfileUpdate,
    current_user: dict = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service)
):
    """Updates profile name or password for the current user."""
    return auth_service.update_profile(current_user["id"], data)


@router.get("/config")
def get_auth_config():
    """Returns public client auth configuration (e.g. Google Client ID)."""
    return {
        "google_client_id": settings.GOOGLE_CLIENT_ID or ""
    }
