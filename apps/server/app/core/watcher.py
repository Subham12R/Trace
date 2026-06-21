import re
import time
import threading
from pathlib import Path
from apscheduler.schedulers.background import BackgroundScheduler

from app.core.config import SOURCE_CONFIG, WATCH_INTERVAL_SECONDS, get_source_paths
from app.services.ingestor import ingest_file
from app.core.database import SessionLocal

scheduler: BackgroundScheduler | None = None

# Matches brace-expanded extensions like *.{json,jsonl,db}
_BRACE_EXT_RE = re.compile(r"\*\.\{([^}]+)\}")
# Matches single extension like **/*.jsonl or *.jsonl
_SINGLE_EXT_RE = re.compile(r"\*\.([a-zA-Z0-9]+)$")
# Matches a specific filename like **/state.vscdb or state.vscdb
_SPECIFIC_FILE_RE = re.compile(r"([^/*{}]+\.[a-zA-Z0-9]+)$")


def _glob_files(base_path: Path, pattern: str) -> list[Path]:
    """Resolve a glob pattern relative to base_path, handling ** prefixes and brace expansion."""
    # Strip leading **/ prefix properly (not via lstrip which strips characters not strings)
    stripped = re.sub(r"^\*\*/", "", pattern)

    files: list[Path] = []

    # Case 1: brace-expanded extensions — *.{json,jsonl,db}
    brace = _BRACE_EXT_RE.search(pattern)
    if brace:
        for ext in brace.group(1).split(","):
            files.extend(base_path.rglob(f"*.{ext.strip()}"))
        return files

    # Case 2: specific filename — **/state.vscdb or state.vscdb
    specific = _SPECIFIC_FILE_RE.search(stripped)
    if specific and "*" not in specific.group(1):
        files.extend(base_path.rglob(specific.group(1)))
        return files

    # Case 3: single extension — **/*.jsonl or *.jsonl
    single = _SINGLE_EXT_RE.search(pattern)
    if single:
        files.extend(base_path.rglob(f"*.{single.group(1)}"))
        return files

    # Fallback: try rglob with the stripped pattern directly
    try:
        files.extend(base_path.rglob(stripped))
    except Exception:
        pass

    return files


def scan_source(source: str, cfg: dict):
    paths = get_source_paths(source)
    pattern = cfg.get("pattern")

    for base_path in paths:
        # For glob paths (e.g. ~/.copilot/otel/*.jsonl), use the parent directory
        if "*" in str(base_path) or "?" in str(base_path):
            effective_base = base_path.parent
            if not effective_base.exists():
                continue
            if pattern is None:
                # Pattern is in the path itself — glob directly
                files = list(effective_base.glob(base_path.name))
            else:
                files = _glob_files(effective_base, pattern)
        else:
            if not base_path.exists():
                continue

            if pattern is None:
                if base_path.is_file():
                    files = [base_path]
                else:
                    files = list(base_path.parent.glob(base_path.name))
            else:
                files = _glob_files(base_path, pattern)

        for file_path in set(files):
            # Skip dependency and virtual environment directories
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
    # Fire-and-forget cloud sync if a token is stored
    from app.services.cloud_account import get_cloud_token, sync_to_cloud
    token = get_cloud_token()
    if token:
        t = threading.Thread(target=sync_to_cloud, args=(token,), daemon=True)
        t.start()


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
