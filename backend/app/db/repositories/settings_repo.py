"""
Repository pattern for key-value Settings SQL operations.
"""
import sqlite3
from typing import Dict, Optional


class SettingsRepository:
    def __init__(self, conn: sqlite3.Connection) -> None:
        self.conn = conn

    def get_all(self) -> Dict[str, str]:
        cursor = self.conn.cursor()
        cursor.execute("SELECT key, value FROM settings")
        return {row["key"]: row["value"] for row in cursor.fetchall()}

    def get(self, key: str, default: Optional[str] = None) -> Optional[str]:
        cursor = self.conn.cursor()
        cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
        row = cursor.fetchone()
        return row["value"] if row else default

    def set(self, key: str, value: str) -> None:
        cursor = self.conn.cursor()
        cursor.execute(
            """
            INSERT INTO settings (key, value)
            VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value;
            """,
            (key, value)
        )
