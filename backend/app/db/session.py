"""
Database connection and session lifecycle management using PostgreSQL (Supabase).
Features a thread-safe connection pool to eliminate TCP/TLS handshake latency
on every request.
"""
from typing import Generator, Optional
import psycopg2
import psycopg2.extras
from psycopg2 import pool
from app.core.config import settings
from app.core.logging import get_logger
from app.core.exceptions import AppBaseException

logger = get_logger(__name__)

_pool: Optional[pool.ThreadedConnectionPool] = None


def get_pool() -> pool.ThreadedConnectionPool:
    """Returns or initializes the singleton ThreadedConnectionPool."""
    global _pool
    if _pool is None or _pool.closed:
        if not settings.DATABASE_URL:
            raise AppBaseException(
                message="DATABASE_URL غير مضبوط. يرجى ضبط متغير البيئة DATABASE_URL برابط اتصال Postgres.",
                status_code=500
            )
        _pool = pool.ThreadedConnectionPool(
            minconn=2,
            maxconn=20,
            dsn=settings.DATABASE_URL,
            cursor_factory=psycopg2.extras.RealDictCursor,
            connect_timeout=10,
        )
        logger.info("Database connection pool initialized successfully (min=2, max=20).")
    return _pool


def get_db_connection() -> "psycopg2.extensions.connection":
    """
    Borrows a connection from the pool.
    Verifies it is healthy before returning.
    """
    p = get_pool()
    conn = p.getconn()
    if conn.closed:
        try:
            p.putconn(conn, close=True)
        except Exception:
            pass
        conn = p.getconn()
    return conn


def release_db_connection(conn: "psycopg2.extensions.connection", close: bool = False) -> None:
    """Returns a connection back to the pool."""
    global _pool
    if _pool and conn:
        try:
            _pool.putconn(conn, close=close)
        except Exception as exc:
            logger.warning(f"Error returning connection to pool: {exc}")


def close_pool() -> None:
    """Closes all connections in the pool gracefully on shutdown."""
    global _pool
    if _pool and not _pool.closed:
        try:
            _pool.closeall()
            logger.info("Database connection pool closed successfully.")
        except Exception as exc:
            logger.warning(f"Error closing connection pool: {exc}")


def get_db() -> Generator:
    """
    FastAPI dependency yielding a managed database connection from the pool.
    Ensures rollback on uncaught exceptions and automatic return to pool.
    """
    conn = get_db_connection()
    is_closed = False
    try:
        yield conn
        conn.commit()
    except Exception as exc:
        try:
            conn.rollback()
        except Exception:
            pass
        logger.error(f"Database error occurred: {exc}")
        is_closed = True
        raise
    finally:
        release_db_connection(conn, close=is_closed)
