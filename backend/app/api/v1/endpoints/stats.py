"""
API endpoints for system overview metrics and statistics (User Scoped).
Includes high-performance single round-trip bootstrap endpoint.
"""
from typing import Any, Dict
from fastapi import APIRouter, Depends
from app.api.deps import (
    get_db,
    get_current_user,
    get_playlist_repo,
    get_task_repo,
    get_note_repo
)
from app.db.repositories.playlist_repo import PlaylistRepository
from app.db.repositories.task_repo import TaskRepository
from app.db.repositories.note_repo import NoteRepository
from app.models.common import APIResponse, OverviewStats

router = APIRouter()


@router.get("", response_model=APIResponse[OverviewStats])
def get_stats(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
) -> APIResponse[OverviewStats]:
    cursor = db.cursor()
    user_id = current_user["id"]

    # Ultra-fast single database round-trip for all system metrics
    cursor.execute("""
        SELECT
            (SELECT COUNT(*) FROM zenith_playlists WHERE user_id = %(uid)s) AS total_playlists,
            (SELECT COALESCE(SUM(total_videos), 0) FROM zenith_playlists WHERE user_id = %(uid)s) AS total_videos,
            (SELECT COALESCE(SUM(completed_videos), 0) FROM zenith_playlists WHERE user_id = %(uid)s) AS completed_videos,
            (SELECT COUNT(*) FROM zenith_custom_tasks WHERE user_id = %(uid)s) AS total_tasks,
            (SELECT COALESCE(SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END), 0) FROM zenith_custom_tasks WHERE user_id = %(uid)s) AS completed_tasks,
            (SELECT COUNT(*) FROM zenith_notes WHERE user_id = %(uid)s) AS total_notes;
    """, {"uid": user_id})
    row = cursor.fetchone()

    total_playlists = int(row["total_playlists"] or 0)
    total_videos = int(row["total_videos"] or 0)
    completed_videos = int(row["completed_videos"] or 0)
    total_tasks = int(row["total_tasks"] or 0)
    completed_tasks = int(row["completed_tasks"] or 0)
    total_notes = int(row["total_notes"] or 0)

    total_items = total_videos + total_tasks
    completed_items = completed_videos + completed_tasks
    percentage = round((completed_items / total_items) * 100, 1) if total_items > 0 else 0.0

    stats = OverviewStats(
        total_playlists=total_playlists,
        total_videos=total_videos,
        completed_videos=completed_videos,
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        total_notes=total_notes,
        overall_progress_percentage=percentage
    )
    return APIResponse(data=stats)


@router.get("/bootstrap", response_model=APIResponse[Dict[str, Any]])
def get_bootstrap(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
    playlist_repo: PlaylistRepository = Depends(get_playlist_repo),
    task_repo: TaskRepository = Depends(get_task_repo),
    note_repo: NoteRepository = Depends(get_note_repo)
) -> APIResponse[Dict[str, Any]]:
    """
    Consolidated single-request bootstrap endpoint for the frontend.
    Fetches statistics, playlists, tasks, and notes in one roundtrip over a single DB connection.
    """
    user_id = current_user["id"]
    cursor = db.cursor()

    cursor.execute("""
        SELECT
            (SELECT COUNT(*) FROM zenith_playlists WHERE user_id = %(uid)s) AS total_playlists,
            (SELECT COALESCE(SUM(total_videos), 0) FROM zenith_playlists WHERE user_id = %(uid)s) AS total_videos,
            (SELECT COALESCE(SUM(completed_videos), 0) FROM zenith_playlists WHERE user_id = %(uid)s) AS completed_videos,
            (SELECT COUNT(*) FROM zenith_custom_tasks WHERE user_id = %(uid)s) AS total_tasks,
            (SELECT COALESCE(SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END), 0) FROM zenith_custom_tasks WHERE user_id = %(uid)s) AS completed_tasks,
            (SELECT COUNT(*) FROM zenith_notes WHERE user_id = %(uid)s) AS total_notes;
    """, {"uid": user_id})
    row = cursor.fetchone()

    total_playlists = int(row["total_playlists"] or 0)
    total_videos = int(row["total_videos"] or 0)
    completed_videos = int(row["completed_videos"] or 0)
    total_tasks = int(row["total_tasks"] or 0)
    completed_tasks = int(row["completed_tasks"] or 0)
    total_notes = int(row["total_notes"] or 0)

    total_items = total_videos + total_tasks
    completed_items = completed_videos + completed_tasks
    percentage = round((completed_items / total_items) * 100, 1) if total_items > 0 else 0.0

    stats = {
        "total_playlists": total_playlists,
        "total_videos": total_videos,
        "completed_videos": completed_videos,
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "total_notes": total_notes,
        "overall_progress_percentage": percentage
    }

    playlists = playlist_repo.get_all_playlists(user_id)
    tasks = task_repo.get_all(user_id)
    notes = note_repo.get_all(user_id)

    return APIResponse(data={
        "stats": stats,
        "playlists": playlists,
        "tasks": tasks,
        "notes": notes
    })
