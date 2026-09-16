"""
Database schema initialization and migration runner.
"""
from app.db.session import get_db_connection
from app.core.logging import get_logger

logger = get_logger(__name__)

SCHEMA_SQL = """
-- Playlists Table
CREATE TABLE IF NOT EXISTS playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    channel_title TEXT,
    description TEXT,
    thumbnail_url TEXT,
    webpage_url TEXT,
    total_videos INTEGER DEFAULT 0,
    completed_videos INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Videos Table
CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id INTEGER NOT NULL,
    video_id TEXT NOT NULL,
    title TEXT NOT NULL,
    duration INTEGER DEFAULT 0,
    thumbnail_url TEXT,
    webpage_url TEXT,
    position INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT 0,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
);

-- Indexes for Videos
CREATE INDEX IF NOT EXISTS idx_videos_playlist ON videos(playlist_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(playlist_id, is_completed);

-- Custom Tasks Table
CREATE TABLE IF NOT EXISTS custom_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'medium',
    category TEXT DEFAULT 'general',
    due_date TEXT,
    is_completed BOOLEAN DEFAULT 0,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON custom_tasks(is_completed);

-- Notes Table
CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id INTEGER,
    video_id INTEGER,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
    FOREIGN KEY(video_id) REFERENCES videos(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_notes_playlist ON notes(playlist_id);
CREATE INDEX IF NOT EXISTS idx_notes_video ON notes(video_id);

-- Settings Key-Value Store Table
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
"""


def init_db() -> None:
    """Initializes SQLite database schemas and indices."""
    logger.info("Initializing database schema...")
    conn = get_db_connection()
    try:
        conn.executescript(SCHEMA_SQL)
        conn.commit()
        logger.info("Database schema initialized successfully.")
    except Exception as exc:
        logger.error(f"Failed to initialize database: {exc}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    init_db()
