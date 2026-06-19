import json
import sqlite3
from pathlib import Path
from typing import Iterator, Dict, Any
from datetime import datetime, timezone

from app.parsers.base import BaseParser


class CursorParser(BaseParser):
    """
    Parse Cursor AI IDE usage from its globalStorage state.vscdb SQLite file.

    Cursor stores AI chat history in:
      %APPDATA%\\Cursor\\User\\globalStorage\\state.vscdb   (Windows)
      ~/.config/Cursor/User/globalStorage/state.vscdb    (Linux)
      ~/Library/Application Support/Cursor/User/globalStorage/state.vscdb (macOS)

    The database has two tables:
      - ItemTable: key-value pairs for IDE settings/state
      - cursorDiskKV: key-value pairs for chat/composer data

    Each AI turn is stored as a 'bubbleId:<composer-id>:<bubble-id>' entry in
    cursorDiskKV. Type-2 bubbles are assistant responses containing:
      {
        "tokenCount": {"inputTokens": N, "outputTokens": M},
        "requestId": "...",
        "type": 2,
        ...
      }

    We aggregate all bubbles per composer session (first part of bubbleId) and
    yield one record per composer with summed token counts.
    """

    def can_parse(self, file_path: Path) -> bool:
        return file_path.name == "state.vscdb"

    def parse(self, file_path: Path) -> Iterator[Dict[str, Any]]:
        # Only parse globalStorage DB — workspace DBs don't contain token data
        if "globalStorage" not in str(file_path):
            return

        try:
            conn = sqlite3.connect(f"file:{file_path}?mode=ro", uri=True)
        except Exception as e:
            print(f"[CursorParser] Cannot open {file_path}: {e}")
            return

        try:
            cursor = conn.cursor()

            # Check if cursorDiskKV table exists
            tables = {r[0] for r in cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()}

            if "cursorDiskKV" not in tables:
                return

            # Get current configured model from ItemTable preferences
            configured_model = "composer-2.5"
            try:
                row = cursor.execute(
                    "SELECT value FROM ItemTable WHERE key LIKE '%persistentStorage.applicationUser%'"
                ).fetchone()
                if row:
                    raw = row[0].decode("utf-8", errors="ignore") if isinstance(row[0], bytes) else row[0]
                    data = json.loads(raw)
                    ai_settings = data.get("aiSettings") or {}
                    model_config = ai_settings.get("modelConfig") or {}
                    composer_config = model_config.get("composer") or {}
                    m_name = composer_config.get("modelName")
                    if m_name and m_name != "default":
                        configured_model = m_name
                    else:
                        m_name = ai_settings.get("composerModel")
                        if m_name and m_name != "default":
                            configured_model = m_name
            except Exception:
                pass

            # Fetch all bubbleId entries - these contain per-turn token counts
            cursor.execute(
                "SELECT key, value FROM cursorDiskKV WHERE key LIKE 'bubbleId:%'"
            )
            rows = cursor.fetchall()

            # Group by composer_id (first UUID in bubbleId key)
            sessions: Dict[str, Dict[str, Any]] = {}

            for key, val in rows:
                if val is None:
                    continue
                try:
                    raw = val.decode("utf-8", errors="ignore") if isinstance(val, bytes) else val
                    data = json.loads(raw)
                except (json.JSONDecodeError, UnicodeDecodeError, AttributeError):
                    continue

                if not isinstance(data, dict):
                    continue

                # Only process assistant response bubbles (type=2)
                bubble_type = data.get("type")
                if bubble_type != 2:
                    continue

                tc = data.get("tokenCount") or {}
                inp = int(tc.get("inputTokens") or 0)
                out = int(tc.get("outputTokens") or 0)
                if inp == 0 and out == 0:
                    continue

                # Extract composer_id from key: "bubbleId:<composer_id>:<bubble_id>"
                parts = key.split(":")
                composer_id = parts[1] if len(parts) >= 2 else "unknown"

                if composer_id not in sessions:
                    sessions[composer_id] = {
                        "input_tokens": 0,
                        "output_tokens": 0,
                        "model": configured_model,
                        "timestamp": None,
                    }

                sessions[composer_id]["input_tokens"] += inp
                sessions[composer_id]["output_tokens"] += out

            # Fetch timestamps from composerData if available
            for composer_id in list(sessions.keys()):
                try:
                    c_row = cursor.execute(
                        "SELECT value FROM cursorDiskKV WHERE key = ?",
                        (f"composerData:{composer_id}",)
                    ).fetchone()
                    if c_row and c_row[0]:
                        c_raw = c_row[0].decode("utf-8", errors="ignore") if isinstance(c_row[0], bytes) else c_row[0]
                        c_data = json.loads(c_raw)
                        created_ms = c_data.get("createdAt")
                        if created_ms:
                            sessions[composer_id]["timestamp"] = datetime.fromtimestamp(
                                created_ms / 1000.0, timezone.utc
                            ).replace(tzinfo=None)
                except Exception:
                    pass

            # Yield one record per composer session
            for composer_id, session in sessions.items():
                yield {
                    "session_id": composer_id,
                    "timestamp": session["timestamp"] or datetime.utcnow(),
                    "model": session["model"],
                    "input_tokens": session["input_tokens"],
                    "output_tokens": session["output_tokens"],
                    "cache_read_tokens": 0,
                    "cache_write_tokens": 0,
                    "project": None,
                    "branch": None,
                    "latency_ms": None,
                }

        finally:
            conn.close()
