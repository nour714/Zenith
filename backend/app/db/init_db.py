"""
Database schema initialization and migration runner for PostgreSQL (Supabase).
Automatically ensures all necessary Zenith tables exist on startup and applies
user-isolation migrations.
"""
from app.db.session import get_db_connection
from app.core.logging import get_logger

logger = get_logger(__name__)

POSTGRES_SCHEMA_SQL = """
-- Zenith Users Table
CREATE TABLE IF NOT EXISTS zenith_users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    full_name TEXT,
    avatar_url TEXT,
    google_id TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_zenith_users_email ON zenith_users(email);

-- Zenith Playlists Table
CREATE TABLE IF NOT EXISTS zenith_playlists (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES zenith_users(id) ON DELETE CASCADE,
    playlist_id TEXT NOT NULL,
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
    user_id INTEGER REFERENCES zenith_users(id) ON DELETE CASCADE,
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
    user_id INTEGER REFERENCES zenith_users(id) ON DELETE CASCADE,
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

-- User-scoped Settings
CREATE TABLE IF NOT EXISTS zenith_user_settings (
    user_id INTEGER NOT NULL REFERENCES zenith_users(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (user_id, key)
);

-- Global Settings Key-Value Store Table (fallback/system-wide)
CREATE TABLE IF NOT EXISTS zenith_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
"""


def apply_migrations(cursor) -> None:
    """Safely adds user_id columns, cleans orphan data, and applies user isolation constraints."""
    # 1. Add user_id column to existing tables if missing
    cursor.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'zenith_playlists' AND column_name = 'user_id'
            ) THEN
                ALTER TABLE zenith_playlists ADD COLUMN user_id INTEGER REFERENCES zenith_users(id) ON DELETE CASCADE;
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'zenith_custom_tasks' AND column_name = 'user_id'
            ) THEN
                ALTER TABLE zenith_custom_tasks ADD COLUMN user_id INTEGER REFERENCES zenith_users(id) ON DELETE CASCADE;
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'zenith_notes' AND column_name = 'user_id'
            ) THEN
                ALTER TABLE zenith_notes ADD COLUMN user_id INTEGER REFERENCES zenith_users(id) ON DELETE CASCADE;
            END IF;
        END $$;
    """)

    # 2. Clean unassigned demo rows where user_id IS NULL (per user's approved clean-start decision)
    cursor.execute("DELETE FROM zenith_playlists WHERE user_id IS NULL;")
    cursor.execute("DELETE FROM zenith_custom_tasks WHERE user_id IS NULL;")
    cursor.execute("DELETE FROM zenith_notes WHERE user_id IS NULL;")

    # 3. Drop legacy global unique constraint on zenith_playlists.playlist_id if it exists
    cursor.execute("""
        DO $$
        DECLARE
            c_name text;
        BEGIN
            FOR c_name IN 
                SELECT tc.constraint_name 
                FROM information_schema.table_constraints tc 
                JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name 
                WHERE tc.table_name = 'zenith_playlists' 
                  AND kcu.column_name = 'playlist_id' 
                  AND tc.constraint_type = 'UNIQUE'
            LOOP
                EXECUTE 'ALTER TABLE zenith_playlists DROP CONSTRAINT IF EXISTS ' || quote_ident(c_name);
            END LOOP;
        END $$;
    """)

    # 4. Add composite UNIQUE (user_id, playlist_id) constraint if missing
    cursor.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints 
                WHERE table_name = 'zenith_playlists' AND constraint_name = 'uq_zenith_playlists_user_playlist'
            ) THEN
                ALTER TABLE zenith_playlists ADD CONSTRAINT uq_zenith_playlists_user_playlist UNIQUE (user_id, playlist_id);
            END IF;
        END $$;
    """)

    # 5. Indexes for fast user queries
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_zenith_playlists_user ON zenith_playlists(user_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_zenith_tasks_user ON zenith_custom_tasks(user_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_zenith_notes_user ON zenith_notes(user_id);")


def init_db() -> None:
    """Verifies database connectivity, ensures all Zenith tables exist, and applies migrations."""
    logger.info("Initializing and verifying database schema with user isolation...")
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(POSTGRES_SCHEMA_SQL)
            apply_migrations(cursor)
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
