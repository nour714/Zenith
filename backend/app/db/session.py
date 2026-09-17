"""
Database connection and session lifecycle management using PostgreSQL (Supabase).
"""
import psycopg2
import psycopg2.extras
from typing import Generator
from app.core.config import settings
from app.core.logging import get_logger
from app.core.exceptions import AppBaseException

logger = get_logger(__name__)


def get_db_connection() -> "psycopg2.extensions.connection":
    """
    Creates and returns a new PostgreSQL connection.
    Uses RealDictCursor by default so rows behave like sqlite3.Row
    (dict-like access via row["column"] and dict(row)).
    """
    if not settings.DATABASE_URL:
        raise AppBaseException(
            message="DATABASE_URL غير مضبوط. يرجى ضبط متغير البيئة DATABASE_URL برابط اتصال Postgres.",
            status_code=500
        )
    conn = psycopg2.connect(
        dsn=settings.DATABASE_URL,
        cursor_factory=psycopg2.extras.RealDictCursor,
        connect_timeout=10,
    )
    return conn


def get_db() -> Generator:
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
