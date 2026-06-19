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
            files = []
            # Use the full glob pattern directly (supports ** and named files)
            try:
                files.extend(base_path.rglob(pattern.lstrip("**/").lstrip("**/")))
            except Exception:
                pass

            # If the pattern has a specific filename (not just extension), use rglob on it
            import re
            filename_match = re.search(r"([^/*{}]+\.[a-zA-Z0-9]+)$", pattern)
            if filename_match and not files:
                filename = filename_match.group(1)
                files.extend(base_path.rglob(filename))

            # Also handle brace-expanded patterns like *.{json,jsonl}
            if not files:
                brace_match = re.search(r"\*\.\{([^}]+)\}", pattern)
                if brace_match:
                    exts = brace_match.group(1).split(",")
                    for ext in exts:
                        files.extend(base_path.rglob(f"*.{ext.strip()}"))

            # Handle single extension patterns like **/*.jsonl
            if not files:
                ext_match = re.search(r"\*\.([a-zA-Z0-9]+)$", pattern)
                if ext_match:
                    files.extend(base_path.rglob(f"*.{ext_match.group(1)}"))

        for file_path in set(files):
            # Skip dependency and virtual environment directories to prevent scanning vendor files
            file_str = str(file_path)
            if any(p in file_str for p in ["node_modules", "venv", ".venv", "site-packages"]):
                continue

            if file_path.is_file():
                try:
                    ingest_file(source, file_path)
                except Exception as e:
                    print(f"[Watcher] Error ingesting {file_path}: {e}")


def tick():
    for source, cfg in SOURCE_CONFIG.items():
        scan_source(source, cfg)


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
