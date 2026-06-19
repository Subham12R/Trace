import time
import threading
from pathlib import Path
from apscheduler.schedulers.background import BackgroundScheduler

from app.core.config import SOURCE_CONFIG, WATCH_INTERVAL_SECONDS, get_source_paths
from app.services.ingestor import ingest_file
from app.core.database import SessionLocal

scheduler: BackgroundScheduler | None = None


def scan_source(source: str, cfg: dict):
    paths = get_source_paths(source)
    pattern = cfg.get("pattern")

    for base_path in paths:
        if not base_path.exists():
            continue

        if pattern is None:
            # Specific file or glob pattern in defaults
            if base_path.is_file():
                files = [base_path]
            else:
                files = list(base_path.parent.glob(base_path.name))
        else:
            files = list(base_path.rglob(pattern.split(";")[0].replace("**/*.", "*.")))
            # Simplified: use glob for now
            if "jsonl" in pattern:
                files = list(base_path.rglob("*.jsonl"))
            elif "json" in pattern:
                files = list(base_path.rglob("*.json"))
            elif "log" in pattern:
                files = list(base_path.rglob("*.log"))
            else:
                files = list(base_path.rglob("*"))

        for file_path in files:
            if file_path.is_file():
                try:
                    ingest_file(source, file_path)
                except Exception as e:
                    print(f"[Watcher] Error ingesting {file_path}: {e}")


def tick():
    db = SessionLocal()
    try:
        for source, cfg in SOURCE_CONFIG.items():
            scan_source(source, cfg)
    finally:
        db.close()


def start_watcher():
    global scheduler
    scheduler = BackgroundScheduler()
    scheduler.add_job(tick, "interval", seconds=WATCH_INTERVAL_SECONDS, id="watcher")
    scheduler.start()
    print("[Watcher] Started")


def stop_watcher():
    global scheduler
    if scheduler:
        scheduler.shutdown()
        print("[Watcher] Stopped")
