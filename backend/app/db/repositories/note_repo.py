"""
Repository pattern for Notes SQL operations (PostgreSQL).
"""
from typing import Any, Dict, List, Optional
from app.core.exceptions import ResourceNotFoundException
from app.models.note import NoteCreate, NoteUpdate


class NoteRepository:
    def __init__(self, conn) -> None:
        self.conn = conn

    def create(self, note: NoteCreate) -> Dict[str, Any]:
        cursor = self.conn.cursor()
        cursor.execute(
            """
            INSERT INTO zenith_notes (title, content, tags, playlist_id, video_id)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING *;
            """,
            (note.title, note.content, note.tags, note.playlist_id, note.video_id)
        )
        row = cursor.fetchone()
        return dict(row)

    def get_all(
        self,
        playlist_id: Optional[int] = None,
        video_id: Optional[int] = None,
        search_query: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        cursor = self.conn.cursor()
        query = """
            SELECT
                n.*,
                p.title as playlist_title,
                v.title as video_title
            FROM zenith_notes n
            LEFT JOIN zenith_playlists p ON n.playlist_id = p.id
            LEFT JOIN zenith_videos v ON n.video_id = v.id
            WHERE 1=1
        """
        params: List[Any] = []

        if playlist_id:
            query += " AND n.playlist_id = %s"
            params.append(playlist_id)
        if video_id:
            query += " AND n.video_id = %s"
            params.append(video_id)
        if search_query:
            query += " AND (n.title ILIKE %s OR n.content ILIKE %s OR n.tags ILIKE %s)"
            like_term = f"%{search_query}%"
            params.extend([like_term, like_term, like_term])

        query += " ORDER BY n.updated_at DESC"
        cursor.execute(query, params)
        return [dict(row) for row in cursor.fetchall()]

    def get_by_id(self, note_id: int) -> Optional[Dict[str, Any]]:
        cursor = self.conn.cursor()
        cursor.execute(
            """
            SELECT
                n.*,
                p.title as playlist_title,
                v.title as video_title
            FROM zenith_notes n
            LEFT JOIN zenith_playlists p ON n.playlist_id = p.id
            LEFT JOIN zenith_videos v ON n.video_id = v.id
            WHERE n.id = %s
            """,
            (note_id,)
        )
        row = cursor.fetchone()
        return dict(row) if row else None

    def update(self, note_id: int, note: NoteUpdate) -> Dict[str, Any]:
        existing = self.get_by_id(note_id)
        if not existing:
            raise ResourceNotFoundException("Note", note_id)

        update_fields = []
        values = []
        data = note.model_dump(exclude_unset=True)

        for field, val in data.items():
            update_fields.append(f"{field} = %s")
            values.append(val)

        if not update_fields:
            return existing

        update_fields.append("updated_at = CURRENT_TIMESTAMP")
        values.append(note_id)
        sql = f"UPDATE zenith_notes SET {', '.join(update_fields)} WHERE id = %s RETURNING *;"
        cursor = self.conn.cursor()
        cursor.execute(sql, values)
        row = cursor.fetchone()
        return dict(row)

    def delete(self, note_id: int) -> bool:
        cursor = self.conn.cursor()
        cursor.execute("DELETE FROM zenith_notes WHERE id = %s", (note_id,))
        return cursor.rowcount > 0
