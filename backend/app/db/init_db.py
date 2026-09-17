"""
Database connectivity check on startup.
Schema is managed via Supabase migrations (see supabase/migrations or the
Supabase dashboard) — tables are created there, not by the app at runtime.
"""
from app.db.session import get_db_connection
from app.core.logging import get_logger

logger = get_logger(__name__)


def init_db() -> None:
    """Verifies the database connection is reachable on startup."""
    logger.info("Verifying database connectivity...")
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT 1;")
        cursor.fetchone()
        logger.info("Database connection verified successfully.")
    except Exception as exc:
        logger.error(f"Failed to connect to the database: {exc}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    init_db()
