"""
API endpoints for AI-driven study plans and note enhancements.
"""
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends
from app.api.deps import get_ai_service, get_playlist_service, verify_auth
from app.services.ai_service import AIService
from app.services.playlist_service import PlaylistService
from app.models.common import APIResponse

router = APIRouter()


class StudyPlanRequest(BaseModel):
    playlist_id: int
    target_days: Optional[int] = 14


class NoteEnhanceRequest(BaseModel):
    title: str
    content: str


@router.post("/study-plan", response_model=APIResponse[str], dependencies=[Depends(verify_auth)])
def generate_study_plan(
    req: StudyPlanRequest,
    ai: AIService = Depends(get_ai_service),
    playlist_service: PlaylistService = Depends(get_playlist_service)
) -> APIResponse[str]:
    playlist = playlist_service.get_playlist_detail(req.playlist_id)
    video_titles = [v["title"] for v in playlist.get("videos", [])]
    plan = ai.generate_study_plan(
        playlist_title=playlist["title"],
        channel_title=playlist.get("channel_title"),
        video_titles=video_titles,
        target_days=req.target_days or 14
    )
    return APIResponse(message="تم توليد خطة المذاكرة بنجاح", data=plan)


@router.post("/enhance-note", response_model=APIResponse[str], dependencies=[Depends(verify_auth)])
def enhance_note(
    req: NoteEnhanceRequest,
    ai: AIService = Depends(get_ai_service)
) -> APIResponse[str]:
    enhanced = ai.enhance_note(note_title=req.title, note_content=req.content)
    return APIResponse(message="تم تحسين الملاحظات بنجاح", data=enhanced)
