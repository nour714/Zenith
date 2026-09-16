"""
Database connection and session lifecycle management using SQLite3.
"""
import sqlite3
from typing import Generator
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


def get_db_connection() -> sqlite3.Connection:
    """
    Creates and returns a new SQLite connection configured with:
    - Row factory enabled for dict-like access
    - Foreign key constraints enabled
    - WAL journal mode for high-concurrency read/write performance
    """
    conn = sqlite3.connect(
        database=str(settings.DATABASE_PATH),
        check_same_thread=False,
        timeout=15.0
    )
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn


def get_db() -> Generator[sqlite3.Connection, None, None]:
    """
    FastAPI dependency yielding a managed database connection.
    Ensures rollback on uncaught exceptions and automatic closure.
    """
    conn = get_db_connection()
    try:
        yield conn
        conn.commit()
    except Exception as exc:
        conn.rollback()
        logger.error(f"Database error occurred: {exc}")
        raise
    finally:
        conn.close()
