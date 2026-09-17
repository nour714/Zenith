"""
Auth service implementing user registration, credential login, and Google OAuth.
"""
from typing import Dict, Any, Optional
from app.core.security import hash_password, verify_password, create_access_token, verify_google_token
from app.core.exceptions import ValidationException, UnauthorizedException, ResourceNotFoundException
from app.db.repositories.user_repo import UserRepository
from app.models.user import UserRegister, UserLogin, GoogleLoginRequest, TokenResponse, UserResponse, UserProfileUpdate
from app.core.logging import get_logger

logger = get_logger("zenith.auth_service")


class AuthService:
    def __init__(self, user_repo: UserRepository) -> None:
        self.user_repo = user_repo

    def register(self, data: UserRegister) -> TokenResponse:
        email = data.email.lower().strip()
        existing = self.user_repo.get_by_email(email)
        if existing:
            raise ValidationException(f"البريد الإلكتروني '{email}' مسجل مسبقاً. يرجى تسجيل الدخول.")

        hashed = hash_password(data.password)
        user_row = self.user_repo.create(
            email=email,
            password_hash=hashed,
            full_name=data.full_name or email.split("@")[0]
        )

        user_resp = UserResponse(**user_row)
        token = create_access_token({"sub": str(user_resp.id), "email": user_resp.email})
        return TokenResponse(access_token=token, token_type="bearer", user=user_resp)

    def login(self, data: UserLogin) -> TokenResponse:
        email = data.email.lower().strip()
        user_row = self.user_repo.get_by_email(email)
        if not user_row or not user_row.get("password_hash"):
            raise UnauthorizedException("البريد الإلكتروني أو كلمة المرور غير صحيحة.")

        if not verify_password(data.password, user_row["password_hash"]):
            raise UnauthorizedException("البريد الإلكتروني أو كلمة المرور غير صحيحة.")

        user_resp = UserResponse(**user_row)
        token = create_access_token({"sub": str(user_resp.id), "email": user_resp.email})
        return TokenResponse(access_token=token, token_type="bearer", user=user_resp)

    def login_with_google(self, data: GoogleLoginRequest) -> TokenResponse:
        google_info = verify_google_token(data.credential)
        if not google_info or not google_info.get("email"):
            raise UnauthorizedException("فشل التحقق من هوية حساب Google. يرجى المحاولة مرة أخرى.")

        email = google_info["email"].lower().strip()
        google_id = google_info.get("sub")
        full_name = google_info.get("name") or email.split("@")[0]
        avatar_url = google_info.get("picture")

        user_row = self.user_repo.get_by_email(email)
        if user_row:
            # Update google_id and avatar if missing
            if not user_row.get("google_id") or not user_row.get("avatar_url"):
                user_row = self.user_repo.update_profile(
                    user_row["id"],
                    full_name=user_row.get("full_name") or full_name,
                    avatar_url=user_row.get("avatar_url") or avatar_url
                )
        else:
            # Create new user via Google
            user_row = self.user_repo.create(
                email=email,
                password_hash=None,
                full_name=full_name,
                avatar_url=avatar_url,
                google_id=google_id
            )

        user_resp = UserResponse(**user_row)
        token = create_access_token({"sub": str(user_resp.id), "email": user_resp.email})
        return TokenResponse(access_token=token, token_type="bearer", user=user_resp)

    def update_profile(self, user_id: int, data: UserProfileUpdate) -> UserResponse:
        user_row = self.user_repo.get_by_id(user_id)
        if not user_row:
            raise ResourceNotFoundException("User", user_id)

        new_hash = None
        if data.new_password:
            if user_row.get("password_hash"):
                if not data.current_password or not verify_password(data.current_password, user_row["password_hash"]):
                    raise ValidationException("كلمة المرور الحالية غير صحيحة.")
            new_hash = hash_password(data.new_password)

        updated = self.user_repo.update_profile(
            user_id=user_id,
            full_name=data.full_name,
            password_hash=new_hash
        )
        return UserResponse(**updated)
