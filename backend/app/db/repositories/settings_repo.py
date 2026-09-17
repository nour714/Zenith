"""
Repository pattern for key-value Settings SQL operations (PostgreSQL).
"""
from typing import Dict, Optional


class SettingsRepository:
    def __init__(self, conn) -> None:
        self.conn = conn

    def get_all(self) -> Dict[str, str]:
        cursor = self.conn.cursor()
        cursor.execute("SELECT key, value FROM zenith_settings")
        return {row["key"]: row["value"] for row in cursor.fetchall()}

    def get(self, key: str, default: Optional[str] = None) -> Optional[str]:
        cursor = self.conn.cursor()
        cursor.execute("SELECT value FROM zenith_settings WHERE key = %s", (key,))
        row = cursor.fetchone()
        return row["value"] if row else default

    def set(self, key: str, value: str) -> None:
        cursor = self.conn.cursor()
        cursor.execute(
            """
            INSERT INTO zenith_settings (key, value)
            VALUES (%s, %s)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value;
            """,
            (key, value)
        )
