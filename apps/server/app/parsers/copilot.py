import json
from pathlib import Path
from typing import Iterator, Dict, Any
from datetime import datetime

from app.parsers.base import BaseParser


class CopilotParser(BaseParser):
    """Parse Copilot CLI OTel JSONL export files."""

    def can_parse(self, file_path: Path) -> bool:
        return file_path.suffix == ".jsonl"

    def parse(self, file_path: Path) -> Iterator[Dict[str, Any]]:
        text = file_path.read_text(encoding="utf-8", errors="ignore")
        for line in text.strip().splitlines():
            if not line.strip():
                continue
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                continue

            # OTel format: look for attributes and token counts
            attrs = record.get("Attributes", {}) or record.get("attributes", {})
            usage = attrs.get("gen_ai.usage") or {}
            ts = record.get("Timestamp") or record.get("timestamp") or record.get("time")

            yield {
                "session_id": attrs.get("session.id") or attrs.get("conversation.id"),
                "timestamp": self._parse_ts(ts) if ts else datetime.utcnow(),
                "model": attrs.get("gen_ai.response.model") or attrs.get("model"),
                "input_tokens": usage.get("input_tokens", 0) or usage.get("prompt_tokens", 0),
                "output_tokens": usage.get("output_tokens", 0) or usage.get("completion_tokens", 0),
                "cache_read_tokens": 0,
                "cache_write_tokens": 0,
                "project": attrs.get("project") or attrs.get("cwd"),
                "latency_ms": None,
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
