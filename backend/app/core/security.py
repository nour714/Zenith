"""
Security utilities: Password hashing (bcrypt), JWT generation & validation,
and Google OAuth token verification.
"""
import json
import urllib.request
import urllib.error
from datetime import datetime, timedelta, timezone
from typing import Optional, Any, Dict
import bcrypt
import jwt

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("zenith.security")


def hash_password(password: str) -> str:
    """Hashes a plaintext password using bcrypt with salt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plaintext password against a bcrypt hashed password."""
    if not hashed_password or not plain_password:
        return False
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception as exc:
        logger.warning(f"Error checking password hash: {exc}")
        return False


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Creates a signed JWT access token containing subject and custom claims."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"iat": now, "exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and validates a JWT access token. Returns claims dict or None."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        logger.info("JWT token has expired.")
        return None
    except jwt.PyJWTError as exc:
        logger.warning(f"Failed to decode JWT: {exc}")
        return None


def verify_google_token(id_token: str) -> Optional[Dict[str, Any]]:
    """
    Verifies a Google OAuth ID token using Google's tokeninfo API.
    Returns the user's profile info (email, name, picture, sub) or None.
    """
    try:
        url = f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}"
        req = urllib.request.Request(url, headers={"User-Agent": "Zenith-Auth/1.0"})
        with urllib.request.urlopen(req, timeout=8) as response:
            if response.status == 200:
                body = response.read().decode("utf-8")
                token_data = json.loads(body)
                if settings.GOOGLE_CLIENT_ID and token_data.get("aud") != settings.GOOGLE_CLIENT_ID:
                    logger.warning(f"Google token audience mismatch: {token_data.get('aud')} != {settings.GOOGLE_CLIENT_ID}")
                    return None
                return token_data
    except urllib.error.HTTPError as err:
        logger.warning(f"Google tokeninfo returned HTTP error: {err.code}")
    except Exception as exc:
        logger.error(f"Failed to verify Google token: {exc}")
    return None
