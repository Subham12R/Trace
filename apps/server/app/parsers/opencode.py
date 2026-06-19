import json
import sqlite3
from pathlib import Path
from typing import Iterator, Dict, Any
from datetime import datetime

from app.parsers.base import BaseParser
from app.core.git import get_branch


class OpenCodeParser(BaseParser):
    """Parse OpenCode usage from its SQLite database."""

    def can_parse(self, file_path: Path) -> bool:
        return file_path.suffix == ".db"

    def parse(self, file_path: Path) -> Iterator[Dict[str, Any]]:
        try:
            conn = sqlite3.connect(str(file_path))
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            # First try the session table (aggregated per session)
            try:
                cursor.execute("""
                    SELECT id, title, directory, model, cost,
                           tokens_input, tokens_output, tokens_reasoning,
                           tokens_cache_read, tokens_cache_write,
                           time_created, time_updated
                    FROM session
                    WHERE tokens_input > 0 OR tokens_output > 0
                """)
                rows = cursor.fetchall()
                for row in rows:
                    directory = row["directory"]
                    yield {
                        "session_id": row["id"],
                        "timestamp": self._parse_ts(row["time_created"]),
                        "model": self._extract_model_id(row["model"]),
                        "input_tokens": row["tokens_input"] or 0,
                        "output_tokens": row["tokens_output"] or 0,
                        "cache_read_tokens": row["tokens_cache_read"] or 0,
                        "cache_write_tokens": row["tokens_cache_write"] or 0,
                        "project": directory,
                        "branch": get_branch(directory),
                        "latency_ms": None,
                    }

                if rows:
                    conn.close()
                    return
            except Exception:
                pass

            # Fallback: parse individual messages
            try:
                cursor.execute("""
                    SELECT id, session_id, time_created, data
                    FROM message
                    WHERE data LIKE '%tokens%'
                """)
                for row in cursor.fetchall():
                    try:
                        data = json.loads(row["data"])
                    except json.JSONDecodeError:
                        continue

                    tokens = data.get("tokens", {})
                    if not tokens:
                        continue

                    cwd = data.get("path", {}).get("cwd")
                    yield {
                        "session_id": row["session_id"],
                        "timestamp": self._parse_ts(row["time_created"]),
                        "model": data.get("modelID"),
                        "input_tokens": tokens.get("input", 0),
                        "output_tokens": tokens.get("output", 0),
                        "cache_read_tokens": tokens.get("cache", {}).get("read", 0),
                        "cache_write_tokens": tokens.get("cache", {}).get("write", 0),
                        "project": cwd,
                        "branch": get_branch(cwd),
                        "latency_ms": None,
                    }
            except Exception:
                pass

            conn.close()
        except Exception as e:
            print(f"[OpenCodeParser] Error parsing {file_path}: {e}")

    def _extract_model_id(self, model) -> str | None:
        if not model:
            return None
        if isinstance(model, str):
            try:
                parsed = json.loads(model)
                if isinstance(parsed, dict):
                    return parsed.get("id") or parsed.get("name") or model
            except json.JSONDecodeError:
                pass
            return model
        if isinstance(model, dict):
            return model.get("id") or model.get("name")
        return str(model)

    def _parse_ts(self, ts) -> datetime:
        if isinstance(ts, (int, float)):
            # OpenCode stores milliseconds
            if ts > 1e12:
                ts = ts / 1000
            return datetime.utcfromtimestamp(ts)
        if isinstance(ts, str):
            try:
                dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                # Normalize to naive UTC for consistent DB comparisons.
                if dt.tzinfo is not None:
                    dt = dt.replace(tzinfo=None)
                return dt
            except ValueError:
                pass
        return datetime.utcnow()
