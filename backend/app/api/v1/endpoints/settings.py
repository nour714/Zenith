"""
API endpoints for application settings and API Keys.
"""
from typing import Dict
from pydantic import BaseModel
from fastapi import APIRouter, Depends
from app.api.deps import get_settings_repo
from app.db.repositories.settings_repo import SettingsRepository
from app.models.common import APIResponse

router = APIRouter()


class SettingsPayload(BaseModel):
    settings: Dict[str, str]


@router.get("", response_model=APIResponse[Dict[str, str]])
def get_all_settings(
    repo: SettingsRepository = Depends(get_settings_repo)
) -> APIResponse[Dict[str, str]]:
    all_settings = repo.get_all()
    # Mask API key if returned
    if "gemini_api_key" in all_settings and all_settings["gemini_api_key"]:
        key = all_settings["gemini_api_key"]
        masked = key[:4] + "..." + key[-4:] if len(key) > 8 else "****"
        all_settings["gemini_api_key_masked"] = masked
    return APIResponse(data=all_settings)


@router.post("", response_model=APIResponse[Dict[str, str]])
def save_settings(
    payload: SettingsPayload,
    repo: SettingsRepository = Depends(get_settings_repo)
) -> APIResponse[Dict[str, str]]:
    for k, v in payload.settings.items():
        repo.set(k, v)
    return APIResponse(message="تم حفظ الإعدادات بنجاح", data=repo.get_all())
