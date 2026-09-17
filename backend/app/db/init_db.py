"""
Database schema initialization and migration runner for PostgreSQL (Supabase).
Automatically ensures all necessary Zenith tables exist on startup.
"""
from app.db.session import get_db_connection
from app.core.logging import get_logger

logger = get_logger(__name__)

POSTGRES_SCHEMA_SQL = """
-- Zenith Playlists Table
CREATE TABLE IF NOT EXISTS zenith_playlists (
    id SERIAL PRIMARY KEY,
    playlist_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    channel_title TEXT,
    description TEXT,
    thumbnail_url TEXT,
    webpage_url TEXT,
    total_videos INTEGER DEFAULT 0,
    completed_videos INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Zenith Videos Table
CREATE TABLE IF NOT EXISTS zenith_videos (
    id SERIAL PRIMARY KEY,
    playlist_id INTEGER NOT NULL REFERENCES zenith_playlists(id) ON DELETE CASCADE,
    video_id TEXT NOT NULL,
    title TEXT NOT NULL,
    duration INTEGER DEFAULT 0,
    thumbnail_url TEXT,
    webpage_url TEXT,
    position INTEGER DEFAULT 0,
    is_completed SMALLINT DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_zenith_videos_playlist ON zenith_videos(playlist_id);
CREATE INDEX IF NOT EXISTS idx_zenith_videos_status ON zenith_videos(playlist_id, is_completed);

-- Zenith Custom Tasks Table
CREATE TABLE IF NOT EXISTS zenith_custom_tasks (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'medium',
    category TEXT DEFAULT 'general',
    due_date TEXT,
    is_completed SMALLINT DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_zenith_tasks_status ON zenith_custom_tasks(is_completed);

-- Zenith Notes Table
CREATE TABLE IF NOT EXISTS zenith_notes (
    id SERIAL PRIMARY KEY,
    playlist_id INTEGER REFERENCES zenith_playlists(id) ON DELETE CASCADE,
    video_id INTEGER REFERENCES zenith_videos(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_zenith_notes_playlist ON zenith_notes(playlist_id);
CREATE INDEX IF NOT EXISTS idx_zenith_notes_video ON zenith_notes(video_id);

-- Zenith Settings Key-Value Store Table
CREATE TABLE IF NOT EXISTS zenith_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
"""


def init_db() -> None:
    """Verifies database connectivity and ensures all Zenith tables exist."""
    logger.info("Initializing and verifying database schema...")
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(POSTGRES_SCHEMA_SQL)
        conn.commit()
        logger.info("Database schema initialized and verified successfully.")
    except Exception as exc:
        conn.rollback()
        logger.error(f"Failed to initialize database schema: {exc}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    init_db()
