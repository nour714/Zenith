"""
Repository pattern for key-value Settings SQL operations (PostgreSQL).
Supports user-specific settings with global fallback.
"""
from typing import Dict, Optional


class SettingsRepository:
    def __init__(self, conn) -> None:
        self.conn = conn

    def get_all(self, user_id: Optional[int] = None) -> Dict[str, str]:
        cursor = self.conn.cursor()
        settings: Dict[str, str] = {}

        if user_id is not None:
            cursor.execute("SELECT key, value FROM zenith_user_settings WHERE user_id = %s", (user_id,))
            for row in cursor.fetchall():
                settings[row["key"]] = row["value"]
            return settings

        # Fallback for unauthenticated/system settings
        cursor.execute("SELECT key, value FROM zenith_settings")
        for row in cursor.fetchall():
            settings[row["key"]] = row["value"]

        return settings

    def get(self, key: str, user_id: Optional[int] = None, default: Optional[str] = None) -> Optional[str]:
        cursor = self.conn.cursor()
        if user_id is not None:
            cursor.execute("SELECT value FROM zenith_user_settings WHERE user_id = %s AND key = %s", (user_id, key))
            row = cursor.fetchone()
            return row["value"] if row else default

        # Fallback to global
        cursor.execute("SELECT value FROM zenith_settings WHERE key = %s", (key,))
        row = cursor.fetchone()
        return row["value"] if row else default

    def set(self, key: str, value: str, user_id: Optional[int] = None) -> None:
        cursor = self.conn.cursor()
        if user_id is not None:
            cursor.execute(
                """
                INSERT INTO zenith_user_settings (user_id, key, value)
                VALUES (%s, %s, %s)
                ON CONFLICT (user_id, key) DO UPDATE SET value = excluded.value;
                """,
                (user_id, key, value)
            )
        else:
            cursor.execute(
                """
                INSERT INTO zenith_settings (key, value)
                VALUES (%s, %s)
                ON CONFLICT (key) DO UPDATE SET value = excluded.value;
                """,
                (key, value)
            )
