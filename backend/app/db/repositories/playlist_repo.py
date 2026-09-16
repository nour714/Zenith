"""
Repository pattern for Playlists and Videos SQL operations.
"""
import sqlite3
from datetime import datetime
from typing import Any, Dict, List, Optional
from app.core.exceptions import ResourceNotFoundException


class PlaylistRepository:
    def __init__(self, conn: sqlite3.Connection) -> None:
        self.conn = conn

    def create_playlist(
        self,
        playlist_id: str,
        title: str,
        channel_title: Optional[str],
        description: Optional[str],
        thumbnail_url: Optional[str],
        webpage_url: Optional[str],
        total_videos: int = 0
    ) -> int:
        cursor = self.conn.cursor()
        cursor.execute(
            """
            INSERT INTO playlists (
                playlist_id, title, channel_title, description,
                thumbnail_url, webpage_url, total_videos, completed_videos
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 0)
            ON CONFLICT(playlist_id) DO UPDATE SET
                title = excluded.title,
                channel_title = excluded.channel_title,
                description = excluded.description,
                thumbnail_url = excluded.thumbnail_url,
                webpage_url = excluded.webpage_url,
                total_videos = excluded.total_videos,
                updated_at = CURRENT_TIMESTAMP
            RETURNING id;
            """,
            (playlist_id, title, channel_title, description, thumbnail_url, webpage_url, total_videos)
        )
        row = cursor.fetchone()
        return row["id"] if row else cursor.lastrowid

    def add_videos_batch(self, playlist_db_id: int, videos: List[Dict[str, Any]]) -> None:
        cursor = self.conn.cursor()
        # Fetch existing completed video_ids to preserve completion status if re-importing
        cursor.execute("SELECT video_id, is_completed, completed_at FROM videos WHERE playlist_id = ?", (playlist_db_id,))
        existing_status = {row["video_id"]: (row["is_completed"], row["completed_at"]) for row in cursor.fetchall()}

        cursor.execute("DELETE FROM videos WHERE playlist_id = ?", (playlist_db_id,))
        
        insert_data = []
        completed_count = 0
        for pos, v in enumerate(videos, start=1):
            vid = v["video_id"]
            is_comp, comp_at = existing_status.get(vid, (0, None))
            if is_comp:
                completed_count += 1
            insert_data.append((
                playlist_db_id,
                vid,
                v.get("title", "Untitled"),
                v.get("duration", 0),
                v.get("thumbnail_url", ""),
                v.get("webpage_url", ""),
                pos,
                is_comp,
                comp_at
            ))

        cursor.executemany(
            """
            INSERT INTO videos (
                playlist_id, video_id, title, duration,
                thumbnail_url, webpage_url, position, is_completed, completed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            insert_data
        )
        # Update playlist counts
        cursor.execute(
            """
            UPDATE playlists
            SET total_videos = ?, completed_videos = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (len(videos), completed_count, playlist_db_id)
        )

    def get_all_playlists(self) -> List[Dict[str, Any]]:
        cursor = self.conn.cursor()
        cursor.execute(
            """
            SELECT 
                p.*,
                CASE 
                    WHEN p.total_videos > 0 THEN ROUND((CAST(p.completed_videos AS REAL) / p.total_videos) * 100, 1)
                    ELSE 0.0
                END as progress_percentage
            FROM playlists p
            ORDER BY p.updated_at DESC
            """
        )
        rows = cursor.fetchall()
        return [dict(row) for row in rows]

    def get_playlist_by_id(self, playlist_id: int) -> Optional[Dict[str, Any]]:
        cursor = self.conn.cursor()
        cursor.execute(
            """
            SELECT 
                p.*,
                CASE 
                    WHEN p.total_videos > 0 THEN ROUND((CAST(p.completed_videos AS REAL) / p.total_videos) * 100, 1)
                    ELSE 0.0
                END as progress_percentage
            FROM playlists p
            WHERE p.id = ?
            """,
            (playlist_id,)
        )
        row = cursor.fetchone()
        return dict(row) if row else None

    def get_playlist_by_yt_id(self, yt_id: str) -> Optional[Dict[str, Any]]:
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM playlists WHERE playlist_id = ?", (yt_id,))
        row = cursor.fetchone()
        return dict(row) if row else None

    def get_videos_for_playlist(self, playlist_id: int) -> List[Dict[str, Any]]:
        cursor = self.conn.cursor()
        cursor.execute(
            """
            SELECT * FROM videos
            WHERE playlist_id = ?
            ORDER BY position ASC
            """,
            (playlist_id,)
        )
        rows = cursor.fetchall()
        return [dict(row) for row in rows]

    def toggle_video_status(self, video_id: int, is_completed: bool) -> Dict[str, Any]:
        cursor = self.conn.cursor()
        cursor.execute("SELECT playlist_id FROM videos WHERE id = ?", (video_id,))
        row = cursor.fetchone()
        if not row:
            raise ResourceNotFoundException("Video", video_id)
        playlist_db_id = row["playlist_id"]

        now_str = datetime.utcnow().isoformat() if is_completed else None
        cursor.execute(
            """
            UPDATE videos
            SET is_completed = ?, completed_at = ?
            WHERE id = ?
            """,
            (1 if is_completed else 0, now_str, video_id)
        )

        # Recalculate playlist completed count
        cursor.execute(
            "SELECT COUNT(*) as count FROM videos WHERE playlist_id = ? AND is_completed = 1",
            (playlist_db_id,)
        )
        completed_count = cursor.fetchone()["count"]

        cursor.execute(
            """
            UPDATE playlists
            SET completed_videos = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (completed_count, playlist_db_id)
        )

        return {
            "video_id": video_id,
            "playlist_id": playlist_db_id,
            "is_completed": is_completed,
            "completed_at": now_str,
            "completed_count": completed_count
        }

    def delete_playlist(self, playlist_id: int) -> bool:
        cursor = self.conn.cursor()
        cursor.execute("DELETE FROM playlists WHERE id = ?", (playlist_id,))
        return cursor.rowcount > 0
