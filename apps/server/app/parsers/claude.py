import json
from pathlib import Path
from typing import Iterator, Dict, Any
from datetime import datetime

from app.parsers.base import BaseParser
from app.core.git import get_branch


class ClaudeParser(BaseParser):
    """
    Parse Claude Code usage from its conversation .jsonl logs.

    Claude Code stores one conversation per file under:
      ~/.claude/projects/<encoded-cwd>/<session-id>.jsonl

    Each line is a JSON object. Usage records have the shape:
      {
        "timestamp": "2025-01-01T12:34:56.789Z",
        "message": {
          "usage": {
            "input_tokens": 100,
            "output_tokens": 50,
            "cache_creation_input_tokens": 0,
            "cache_read_input_tokens": 0
          },
          "model": "claude-sonnet-4-20250514",
          "id": "msg_..."
        },
        "requestId": "req_..."
      }

    We also harvest conversation titles from `custom-title`, `ai-title` and
    legacy `summary` lines, and skip synthetic user prompts.
    """

    def can_parse(self, file_path: Path) -> bool:
        return file_path.suffix == ".jsonl"

    def parse(self, file_path: Path) -> Iterator[Dict[str, Any]]:
        session_id = self._session_id_from_path(file_path)
        project = self._project_from_path(file_path)
        title: str | None = None

        try:
            lines = file_path.read_text(encoding="utf-8").splitlines()
        except (UnicodeDecodeError, OSError):
            return

        for raw_line in lines:
            line = raw_line.strip()
            if not line:
                continue

            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                continue

            if not isinstance(record, dict):
                continue

            # Title lines
            if record.get("type") == "custom-title" and isinstance(record.get("customTitle"), str):
                title = record["customTitle"]
                continue
            if record.get("type") == "ai-title" and isinstance(record.get("aiTitle"), str):
                title = title or record["aiTitle"]
                continue
            if record.get("type") == "summary" and isinstance(record.get("summary"), str):
                title = title or record["summary"]
                continue

            # Skip synthetic user-prompt markers; we count real assistant usage only.
            if record.get("type") == "user" or (
                isinstance(record.get("message"), dict)
                and record["message"].get("role") == "user"
            ):
                continue

            usage = self._extract_usage(record)
            if usage is None:
                continue

            ts = record.get("timestamp")
            if not ts:
                continue

            message = record.get("message") or {}
            model = message.get("model") or record.get("model")

            # Skip synthetic/error records and zero-token placeholders.
            if model == "<synthetic>" or record.get("isApiErrorMessage"):
                continue
            if (
                usage.get("input_tokens", 0) == 0
                and usage.get("output_tokens", 0) == 0
                and usage.get("cache_creation_input_tokens", 0) == 0
                and usage.get("cache_read_input_tokens", 0) == 0
            ):
                continue

            cwd = record.get("cwd")
            project_name = cwd or project
            yield {
                "session_id": session_id,
                "timestamp": self._parse_ts(ts),
                "model": self._normalize_model(model),
                "input_tokens": usage.get("input_tokens", 0),
                "output_tokens": usage.get("output_tokens", 0),
                "cache_read_tokens": usage.get("cache_read_input_tokens", 0),
                "cache_write_tokens": usage.get("cache_creation_input_tokens", 0),
                "project": project_name,
                "branch": get_branch(project_name),
                "latency_ms": None,
            }

    def _extract_usage(self, record: Dict[str, Any]) -> Dict[str, Any] | None:
        message = record.get("message")
        if not isinstance(message, dict):
            return None
        usage = message.get("usage")
        if not isinstance(usage, dict):
            return None
        if not isinstance(usage.get("input_tokens"), (int, float)):
            return None
        if not isinstance(usage.get("output_tokens"), (int, float)):
            return None
        return usage

    def _normalize_model(self, model) -> str | None:
        if not model:
            return None
        if isinstance(model, dict):
            return model.get("id") or model.get("name")
        if isinstance(model, str):
            return model
        return str(model)

    def _session_id_from_path(self, file_path: Path) -> str:
        # Claude stores logs as <projects>/<encoded-cwd>/<session-id>.jsonl
        # Sub-agent logs are nested under the session directory.
        parts = file_path.parts
        try:
            proj_idx = parts.index("projects")
        except ValueError:
            return file_path.stem

        if proj_idx + 2 < len(parts) - 1:
            # File is nested below a session directory; the session dir name is the id.
            return parts[proj_idx + 2]
        if proj_idx + 1 < len(parts) - 1:
            return file_path.stem
        return file_path.stem

    def _project_from_path(self, file_path: Path) -> str | None:
        parts = file_path.parts
        try:
            proj_idx = parts.index("projects")
        except ValueError:
            return None

        if proj_idx + 1 < len(parts) - 1:
            encoded = parts[proj_idx + 1]
            # encoded-cwd uses '-' as path separator; take last meaningful segment as name.
            segments = [s for s in encoded.split("-") if s]
            return segments[-1] if segments else encoded
        return None

    def _parse_ts(self, ts) -> datetime:
        if isinstance(ts, (int, float)):
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
