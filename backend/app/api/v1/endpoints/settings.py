"""
API endpoints for application settings and API Keys.
"""
from typing import Dict
from pydantic import BaseModel
from fastapi import APIRouter, Depends
from app.api.deps import get_settings_repo, verify_auth
from app.db.repositories.settings_repo import SettingsRepository
from app.models.common import APIResponse

router = APIRouter()


class SettingsPayload(BaseModel):
    settings: Dict[str, str]


def _mask_value(val: str) -> str:
    if not val:
        return ""
    if len(val) > 8:
        return val[:4] + "..." + val[-4:]
    return "****"


def _is_secret_key(k: str) -> bool:
    key_lower = k.lower()
    return any(term in key_lower for term in ["key", "secret", "token", "password"])


def _sanitize_settings(raw_settings: Dict[str, str]) -> Dict[str, str]:
    sanitized: Dict[str, str] = {}
    for k, v in raw_settings.items():
        if _is_secret_key(k):
            # Redact raw secret and only expose the masked representation
            sanitized[f"{k}_masked"] = _mask_value(v)
        else:
            sanitized[k] = v
    return sanitized


@router.get("", response_model=APIResponse[Dict[str, str]])
def get_all_settings(
    repo: SettingsRepository = Depends(get_settings_repo)
) -> APIResponse[Dict[str, str]]:
    all_settings = repo.get_all()
    sanitized = _sanitize_settings(all_settings)
    return APIResponse(data=sanitized)


@router.post("", response_model=APIResponse[Dict[str, str]], dependencies=[Depends(verify_auth)])
def save_settings(
    payload: SettingsPayload,
    repo: SettingsRepository = Depends(get_settings_repo)
) -> APIResponse[Dict[str, str]]:
    for k, v in payload.settings.items():
        repo.set(k, v)
    sanitized = _sanitize_settings(repo.get_all())
    return APIResponse(message="تم حفظ الإعدادات بنجاح", data=sanitized)
