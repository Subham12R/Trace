import json
from pathlib import Path
from typing import Iterator, Dict, Any
from datetime import datetime

from app.parsers.base import BaseParser


class ClaudeParser(BaseParser):
    def can_parse(self, file_path: Path) -> bool:
        return file_path.suffix == ".json"

    def parse(self, file_path: Path) -> Iterator[Dict[str, Any]]:
        # Claude Code stores usage in JSON files. Format may vary.
        # This is a scaffold — actual structure needs inspection.
        try:
            data = json.loads(file_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            return

        # Handle both single object and list of objects
        records = data if isinstance(data, list) else [data]

        for record in records:
            ts = record.get("timestamp") or record.get("created_at")
            if not ts:
                continue
            yield {
                "session_id": record.get("session_id") or record.get("conversation_id"),
                "timestamp": self._parse_ts(ts),
                "model": record.get("model"),
                "input_tokens": record.get("input_tokens", 0) or record.get("usage", {}).get("input_tokens", 0),
                "output_tokens": record.get("output_tokens", 0) or record.get("usage", {}).get("output_tokens", 0),
                "cache_read_tokens": record.get("cache_read_tokens", 0) or record.get("usage", {}).get("cache_read_input_tokens", 0),
                "cache_write_tokens": record.get("cache_write_tokens", 0) or record.get("usage", {}).get("cache_creation_input_tokens", 0),
                "project": record.get("project") or record.get("cwd"),
                "latency_ms": record.get("latency_ms"),
            }

    def _parse_ts(self, ts) -> datetime:
        if isinstance(ts, (int, float)):
            return datetime.utcfromtimestamp(ts)
        if isinstance(ts, str):
            # Try ISO format
            try:
                return datetime.fromisoformat(ts.replace("Z", "+00:00"))
            except ValueError:
                pass
        return datetime.utcnow()
