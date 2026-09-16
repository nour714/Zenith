"""
API endpoints for Notebook management.
"""
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query, status
from app.api.deps import get_note_repo
from app.db.repositories.note_repo import NoteRepository
from app.models.note import NoteCreate, NoteUpdate
from app.models.common import APIResponse

router = APIRouter()


@router.post("", response_model=APIResponse[Dict[str, Any]], status_code=status.HTTP_201_CREATED)
def create_note(
    note: NoteCreate,
    repo: NoteRepository = Depends(get_note_repo)
) -> APIResponse[Dict[str, Any]]:
    new_note = repo.create(note)
    return APIResponse(message="تم حفظ الملاحظة بنجاح", data=new_note)


@router.get("", response_model=APIResponse[List[Dict[str, Any]]])
def list_notes(
    playlist_id: Optional[int] = Query(None),
    video_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    repo: NoteRepository = Depends(get_note_repo)
) -> APIResponse[List[Dict[str, Any]]]:
    notes = repo.get_all(playlist_id=playlist_id, video_id=video_id, search_query=search)
    return APIResponse(data=notes)


@router.get("/{note_id}", response_model=APIResponse[Dict[str, Any]])
def get_note(
    note_id: int,
    repo: NoteRepository = Depends(get_note_repo)
) -> APIResponse[Dict[str, Any]]:
    note = repo.get_by_id(note_id)
    if not note:
        from app.core.exceptions import ResourceNotFoundException
        raise ResourceNotFoundException("Note", note_id)
    return APIResponse(data=note)


@router.put("/{note_id}", response_model=APIResponse[Dict[str, Any]])
def update_note(
    note_id: int,
    note: NoteUpdate,
    repo: NoteRepository = Depends(get_note_repo)
) -> APIResponse[Dict[str, Any]]:
    updated = repo.update(note_id, note)
    return APIResponse(message="تم تحديث الملاحظة بنجاح", data=updated)


@router.delete("/{note_id}", response_model=APIResponse[bool])
def delete_note(
    note_id: int,
    repo: NoteRepository = Depends(get_note_repo)
) -> APIResponse[bool]:
    deleted = repo.delete(note_id)
    return APIResponse(message="تم حذف الملاحظة", data=deleted)
