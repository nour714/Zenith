"""
API endpoints for system overview metrics and statistics (User Scoped).
"""
from fastapi import APIRouter, Depends
from app.api.deps import get_db, get_current_user
from app.models.common import APIResponse, OverviewStats

router = APIRouter()


@router.get("", response_model=APIResponse[OverviewStats])
def get_stats(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
) -> APIResponse[OverviewStats]:
    cursor = db.cursor()
    user_id = current_user["id"]

    # Playlists & Videos for user
    cursor.execute(
        "SELECT COUNT(*) as count, COALESCE(SUM(completed_videos), 0) as completed, COALESCE(SUM(total_videos), 0) as total FROM zenith_playlists WHERE user_id = %s",
        (user_id,)
    )
    p_row = cursor.fetchone()
    total_playlists = p_row["count"] or 0
    total_videos = p_row["total"] or 0
    completed_videos = p_row["completed"] or 0

    # Custom Tasks for user
    cursor.execute(
        "SELECT COUNT(*) as count, SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) as completed FROM zenith_custom_tasks WHERE user_id = %s",
        (user_id,)
    )
    t_row = cursor.fetchone()
    total_tasks = t_row["count"] or 0
    completed_tasks = t_row["completed"] or 0

    # Notes for user
    cursor.execute("SELECT COUNT(*) as count FROM zenith_notes WHERE user_id = %s", (user_id,))
    total_notes = cursor.fetchone()["count"] or 0

    # Overall progress
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
