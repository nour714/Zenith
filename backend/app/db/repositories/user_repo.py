"""
Repository pattern for User operations (PostgreSQL).
"""
from typing import Any, Dict, Optional


class UserRepository:
    def __init__(self, conn) -> None:
        self.conn = conn

    def create(
        self,
        email: str,
        password_hash: Optional[str] = None,
        full_name: Optional[str] = None,
        avatar_url: Optional[str] = None,
        google_id: Optional[str] = None
    ) -> Dict[str, Any]:
        cursor = self.conn.cursor()
        cursor.execute(
            """
            INSERT INTO zenith_users (email, password_hash, full_name, avatar_url, google_id)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING *;
            """,
            (email.lower().strip(), password_hash, full_name, avatar_url, google_id)
        )
        row = cursor.fetchone()
        return dict(row)

    def get_by_id(self, user_id: int) -> Optional[Dict[str, Any]]:
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM zenith_users WHERE id = %s", (user_id,))
        row = cursor.fetchone()
        return dict(row) if row else None

    def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM zenith_users WHERE LOWER(email) = LOWER(%s)", (email.strip(),))
        row = cursor.fetchone()
        return dict(row) if row else None

    def get_by_google_id(self, google_id: str) -> Optional[Dict[str, Any]]:
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM zenith_users WHERE google_id = %s", (google_id,))
        row = cursor.fetchone()
        return dict(row) if row else None

    def update_profile(
        self,
        user_id: int,
        full_name: Optional[str] = None,
        password_hash: Optional[str] = None,
        avatar_url: Optional[str] = None
    ) -> Dict[str, Any]:
        cursor = self.conn.cursor()
        fields = []
        params = []
        if full_name is not None:
            fields.append("full_name = %s")
            params.append(full_name)
        if password_hash is not None:
            fields.append("password_hash = %s")
            params.append(password_hash)
        if avatar_url is not None:
            fields.append("avatar_url = %s")
            params.append(avatar_url)

        if not fields:
            return self.get_by_id(user_id) or {}

        params.append(user_id)
        query = f"UPDATE zenith_users SET {', '.join(fields)} WHERE id = %s RETURNING *;"
        cursor.execute(query, params)
        row = cursor.fetchone()
        return dict(row)
