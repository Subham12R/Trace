import json
from pathlib import Path
from typing import Iterator, Dict, Any
from datetime import datetime

from app.parsers.base import BaseParser


class GenericJsonParser(BaseParser):
    """Generic parser for JSON/JSONL log files."""

    def __init__(self, source_name: str):
        self.source_name = source_name

    def can_parse(self, file_path: Path) -> bool:
        return file_path.suffix in (".json", ".jsonl")

    def parse(self, file_path: Path) -> Iterator[Dict[str, Any]]:
        text = file_path.read_text(encoding="utf-8", errors="ignore")

        if file_path.suffix == ".jsonl":
            for line in text.strip().splitlines():
                if not line.strip():
                    continue
                try:
                    record = json.loads(line)
                except json.JSONDecodeError:
                    continue
                yield self._normalize(record)
        else:
            try:
                data = json.loads(text)
            except json.JSONDecodeError:
                return
            records = data if isinstance(data, list) else [data]
            for record in records:
                yield self._normalize(record)

    def _normalize(self, record: dict) -> dict:
        usage = record.get("usage") or {}
        ts = record.get("timestamp") or record.get("created_at")
        return {
            "session_id": record.get("session_id") or record.get("conversation_id"),
            "timestamp": self._parse_ts(ts) if ts else datetime.utcnow(),
            "model": record.get("model"),
            "input_tokens": usage.get("input_tokens", 0) or usage.get("prompt_tokens", 0),
            "output_tokens": usage.get("output_tokens", 0) or usage.get("completion_tokens", 0),
            "cache_read_tokens": usage.get("cache_read_tokens", 0),
            "cache_write_tokens": usage.get("cache_write_tokens", 0),
            "project": record.get("project") or record.get("cwd"),
            "latency_ms": record.get("latency_ms"),
        }

    def _parse_ts(self, ts) -> datetime:
        if isinstance(ts, (int, float)):
            return datetime.utcfromtimestamp(ts)
        if isinstance(ts, str):
            try:
                return datetime.fromisoformat(ts.replace("Z", "+00:00"))
            except ValueError:
                pass
        return datetime.utcnow()
