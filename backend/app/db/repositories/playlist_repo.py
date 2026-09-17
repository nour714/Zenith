"""
Repository pattern for Playlists and Videos SQL operations (PostgreSQL).
User-scoped for multi-tenancy.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from app.core.exceptions import ResourceNotFoundException


class PlaylistRepository:
    def __init__(self, conn) -> None:
        self.conn = conn

    def create_playlist(
        self,
        user_id: int,
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
            INSERT INTO zenith_playlists (
                user_id, playlist_id, title, channel_title, description,
                thumbnail_url, webpage_url, total_videos, completed_videos
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 0)
            ON CONFLICT(user_id, playlist_id) DO UPDATE SET
                title = excluded.title,
                channel_title = excluded.channel_title,
                description = excluded.description,
                thumbnail_url = excluded.thumbnail_url,
                webpage_url = excluded.webpage_url,
                total_videos = excluded.total_videos,
                updated_at = CURRENT_TIMESTAMP
            RETURNING id;
            """,
            (user_id, playlist_id, title, channel_title, description, thumbnail_url, webpage_url, total_videos)
        )
        row = cursor.fetchone()
        return row["id"]

    def add_videos_batch(self, playlist_db_id: int, videos: List[Dict[str, Any]]) -> None:
        cursor = self.conn.cursor()
        cursor.execute("SELECT video_id, is_completed, completed_at FROM zenith_videos WHERE playlist_id = %s", (playlist_db_id,))
        existing_status = {row["video_id"]: (row["is_completed"], row["completed_at"]) for row in cursor.fetchall()}

        cursor.execute("DELETE FROM zenith_videos WHERE playlist_id = %s", (playlist_db_id,))

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

        if insert_data:
            cursor.executemany(
                """
                INSERT INTO zenith_videos (
                    playlist_id, video_id, title, duration,
                    thumbnail_url, webpage_url, position, is_completed, completed_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                insert_data
            )
        cursor.execute(
            """
            UPDATE zenith_playlists
            SET total_videos = %s, completed_videos = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            """,
            (len(videos), completed_count, playlist_db_id)
        )

    def _with_progress(self, rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        result = []
        for row in rows:
            row = dict(row)
            total = row.get("total_videos") or 0
            completed = row.get("completed_videos") or 0
            row["progress_percentage"] = round((completed / total) * 100, 1) if total > 0 else 0.0
            result.append(row)
        return result

    def get_all_playlists(self, user_id: int) -> List[Dict[str, Any]]:
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM zenith_playlists WHERE user_id = %s ORDER BY updated_at DESC", (user_id,))
        rows = cursor.fetchall()
        return self._with_progress(rows)

    def get_playlist_by_id(self, playlist_id: int, user_id: int) -> Optional[Dict[str, Any]]:
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM zenith_playlists WHERE id = %s AND user_id = %s", (playlist_id, user_id))
        row = cursor.fetchone()
        if not row:
            return None
        return self._with_progress([row])[0]

    def get_playlist_by_yt_id(self, yt_id: str, user_id: int) -> Optional[Dict[str, Any]]:
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM zenith_playlists WHERE playlist_id = %s AND user_id = %s", (yt_id, user_id))
        row = cursor.fetchone()
        return dict(row) if row else None

    def get_videos_for_playlist(self, playlist_id: int, user_id: int) -> List[Dict[str, Any]]:
        cursor = self.conn.cursor()
        # Verify ownership
        cursor.execute("SELECT id FROM zenith_playlists WHERE id = %s AND user_id = %s", (playlist_id, user_id))
        if not cursor.fetchone():
            return []
        cursor.execute(
            """
            SELECT * FROM zenith_videos
            WHERE playlist_id = %s
            ORDER BY position ASC
            """,
            (playlist_id,)
        )
        rows = cursor.fetchall()
        return [dict(row) for row in rows]

    def toggle_video_status(self, video_id: int, is_completed: bool, user_id: int) -> Dict[str, Any]:
        cursor = self.conn.cursor()
        cursor.execute(
            """
            SELECT v.playlist_id
            FROM zenith_videos v
            JOIN zenith_playlists p ON v.playlist_id = p.id
            WHERE v.id = %s AND p.user_id = %s
            """,
            (video_id, user_id)
        )
        row = cursor.fetchone()
        if not row:
            raise ResourceNotFoundException("Video", video_id)
        playlist_db_id = row["playlist_id"]

        now_str = datetime.utcnow().isoformat() if is_completed else None
        cursor.execute(
            """
            UPDATE zenith_videos
            SET is_completed = %s, completed_at = %s
            WHERE id = %s
            """,
            (1 if is_completed else 0, now_str, video_id)
        )

        cursor.execute(
            "SELECT COUNT(*) as count FROM zenith_videos WHERE playlist_id = %s AND is_completed = 1",
            (playlist_db_id,)
        )
        completed_count = cursor.fetchone()["count"]

        cursor.execute(
            """
            UPDATE zenith_playlists
            SET completed_videos = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
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

    def delete_playlist(self, playlist_id: int, user_id: int) -> bool:
        cursor = self.conn.cursor()
        cursor.execute("DELETE FROM zenith_playlists WHERE id = %s AND user_id = %s", (playlist_id, user_id))
        return cursor.rowcount > 0
