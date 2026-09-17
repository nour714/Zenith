"""
API endpoints for Playlists and Video completion tracking.
"""
from typing import Any, Dict, List
from fastapi import APIRouter, Depends, status
from app.api.deps import get_playlist_service, verify_auth
from app.services.playlist_service import PlaylistService
from app.models.playlist import PlaylistSearchRequest, VideoToggleRequest
from app.models.common import APIResponse

router = APIRouter()


@router.post("/import", response_model=APIResponse[Dict[str, Any]], status_code=status.HTTP_201_CREATED, dependencies=[Depends(verify_auth)])
def import_playlist(
    request: PlaylistSearchRequest,
    service: PlaylistService = Depends(get_playlist_service)
) -> APIResponse[Dict[str, Any]]:
    """
    Searches for a YouTube playlist using name/channel or direct link,
    extracts its video list, and stores it in database.
    """
    playlist = service.search_and_import(request)
    return APIResponse(
        success=True,
        message=f"تم استيراد قائمة '{playlist.get('title')}' بنجاح مع {playlist.get('total_videos')} فيديو.",
        data=playlist
    )


@router.get("", response_model=APIResponse[List[Dict[str, Any]]])
def list_playlists(
    service: PlaylistService = Depends(get_playlist_service)
) -> APIResponse[List[Dict[str, Any]]]:
    """Retrieves all stored playlists with completion percentage."""
    playlists = service.get_all_playlists()
    return APIResponse(data=playlists)


@router.get("/{playlist_id}", response_model=APIResponse[Dict[str, Any]])
def get_playlist(
    playlist_id: int,
    service: PlaylistService = Depends(get_playlist_service)
) -> APIResponse[Dict[str, Any]]:
    """Retrieves playlist detail along with its full video checklist."""
    playlist = service.get_playlist_detail(playlist_id)
    return APIResponse(data=playlist)


@router.patch("/videos/{video_id}/toggle", response_model=APIResponse[Dict[str, Any]], dependencies=[Depends(verify_auth)])
def toggle_video(
    video_id: int,
    request: VideoToggleRequest,
    service: PlaylistService = Depends(get_playlist_service)
) -> APIResponse[Dict[str, Any]]:
    """Updates video completion status and recalculates playlist progress."""
    result = service.toggle_video_status(video_id, request.is_completed)
    status_text = "مكتمل" if request.is_completed else "قيد المتابعة"
    return APIResponse(
        message=f"تم تحديث حالة الفيديو إلى: {status_text}",
        data=result
    )


@router.delete("/{playlist_id}", response_model=APIResponse[bool], dependencies=[Depends(verify_auth)])
def delete_playlist(
    playlist_id: int,
    service: PlaylistService = Depends(get_playlist_service)
) -> APIResponse[bool]:
    """Deletes a playlist and all associated video records."""
    deleted = service.delete_playlist(playlist_id)
    return APIResponse(
        message="تم حذف قائمة التشغيل بنجاح",
        data=deleted
    )
