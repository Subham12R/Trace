import os
from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

DB_PATH = Path(os.environ.get("TRACE_DB_PATH", "~/.trace/metrics.db")).expanduser()
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _migrate_columns():
    """Add any columns that are missing from an existing SQLite database."""
    with engine.connect() as conn:
        result = conn.execute(text("PRAGMA table_info(requests)"))
        columns = {row[1] for row in result.fetchall()}
        missing = {
            "branch": "ALTER TABLE requests ADD COLUMN branch VARCHAR",
            "cloud_synced_at": "ALTER TABLE requests ADD COLUMN cloud_synced_at DATETIME",
        }
        for col, stmt in missing.items():
            if col not in columns:
                conn.execute(text(stmt))
        conn.commit()


def init_db():
    from app.models.models import Base as ModelsBase
    ModelsBase.metadata.create_all(bind=engine)
    _migrate_columns()
