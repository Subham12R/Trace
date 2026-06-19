import json
from pathlib import Path
from typing import Iterator, Dict, Any
from datetime import datetime

from app.parsers.base import BaseParser


class AntigravityParser(BaseParser):
    """
    Parse Antigravity IDE (Google DeepMind) usage from its conversation transcript JSONL files.

    Antigravity stores transcripts under:
      %APPDATA%\\antigravity-ide\\brain\\<conversation-id>\\.system_generated\\logs\\transcript.jsonl

    Each line is a JSON step record. We look for PLANNER_RESPONSE steps that contain
    usage metadata, or for any step that has token usage information.

    The transcript format stores tool calls and responses inline; usage data may appear
    in model response steps tagged with token counts.
    """

    def can_parse(self, file_path: Path) -> bool:
        return file_path.name == "transcript.jsonl"

    def parse(self, file_path: Path) -> Iterator[Dict[str, Any]]:
        # Derive conversation_id from path: .../brain/<conv-id>/.system_generated/logs/transcript.jsonl
        parts = file_path.parts
        conversation_id = None
        brain_idx = None
        for i, part in enumerate(parts):
            if part == "brain" and i + 1 < len(parts):
                brain_idx = i
                conversation_id = parts[i + 1]
                break

        try:
            text = file_path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            return

        # Collect steps, then aggregate by conversation
        total_input = 0
        total_output = 0
        model = "antigravity"
        ts_first = None

        for line in text.strip().splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                step = json.loads(line)
            except json.JSONDecodeError:
                continue

            if not isinstance(step, dict):
                continue

            # Extract usage from various step formats
            usage = step.get("usage") or step.get("token_usage") or {}
            if not usage and "content" in step:
                # Sometimes usage is embedded in content string as JSON
                content = step.get("content", "")
                if isinstance(content, str) and "input_tokens" in content:
                    try:
                        parsed = json.loads(content)
                        usage = parsed.get("usage", {})
                    except (json.JSONDecodeError, TypeError):
                        pass

            if usage and isinstance(usage, dict):
                inp = usage.get("input_tokens") or usage.get("prompt_tokens") or 0
                out = usage.get("output_tokens") or usage.get("completion_tokens") or 0
                total_input += int(inp)
                total_output += int(out)

                if not model or model == "antigravity":
                    model = usage.get("model") or step.get("model") or model
                if not ts_first:
                    ts_raw = step.get("created_at") or step.get("timestamp")
                    ts_first = self._parse_ts(ts_raw)

            # Also grab model from PLANNER_RESPONSE or similar steps
            if not model or model == "antigravity":
                model = step.get("model") or model

            # First timestamp from step
            if not ts_first:
                ts_raw = step.get("created_at")
                if ts_raw:
                    ts_first = self._parse_ts(ts_raw)

        if total_input == 0 and total_output == 0:
            # No explicit usage found - count steps as a proxy
            # Each PLANNER_RESPONSE is one round-trip, emit minimal entry
            step_count = sum(
                1 for line in text.strip().splitlines()
                if '"type":"PLANNER_RESPONSE"' in line or '"type": "PLANNER_RESPONSE"' in line
            )
            if step_count == 0:
                return
            # Assign reasonable token estimates per step (e.g. 15,000 input, 1,000 output tokens)
            total_input = step_count * 15000
            total_output = step_count * 1000

        yield {
            "session_id": conversation_id,
            "timestamp": ts_first or datetime.utcnow(),
            "model": model,
            "input_tokens": total_input,
            "output_tokens": total_output,
            "cache_read_tokens": 0,
            "cache_write_tokens": 0,
            "project": None,
            "branch": None,
            "latency_ms": None,
        }

    def _parse_ts(self, ts) -> datetime:
        if ts is None:
            return datetime.utcnow()
        if isinstance(ts, (int, float)):
            if ts > 1e12:
                ts = ts / 1000
            return datetime.utcfromtimestamp(ts)
        if isinstance(ts, str):
            try:
                dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                if dt.tzinfo is not None:
                    dt = dt.replace(tzinfo=None)
                return dt
            except ValueError:
                pass
        return datetime.utcnow()
