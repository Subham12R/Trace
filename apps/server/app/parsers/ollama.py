import json
import sqlite3
from pathlib import Path
from typing import Iterator, Dict, Any
from datetime import datetime

from app.parsers.base import BaseParser
from app.core.git import get_branch


def _estimate_tokens(text: str | None) -> int:
    """Rough token estimate: ~4 characters per token."""
    if not text:
        return 0
    return max(1, len(text) // 4)


class OllamaParser(BaseParser):
    def can_parse(self, file_path: Path) -> bool:
        return file_path.suffix in (".json", ".jsonl", ".log", ".sqlite", ".db")

    def parse(self, file_path: Path) -> Iterator[Dict[str, Any]]:
        suffix = file_path.suffix.lower()

        if suffix in (".sqlite", ".db"):
            yield from self._parse_db(file_path)
            return

        text = file_path.read_text(encoding="utf-8", errors="ignore")

        if suffix == ".jsonl":
            for line in text.strip().splitlines():
                if not line.strip():
                    continue
                try:
                    record = json.loads(line)
                except json.JSONDecodeError:
                    continue
                yield self._normalize(record)
        elif suffix == ".json":
            try:
                data = json.loads(text)
            except json.JSONDecodeError:
                return
            records = data if isinstance(data, list) else [data]
            for record in records:
                yield self._normalize(record)
        else:
            # Log format: attempt to parse JSON lines
            for line in text.strip().splitlines():
                try:
                    record = json.loads(line)
                except json.JSONDecodeError:
                    continue
                yield self._normalize(record)

    def _parse_db(self, file_path: Path) -> Iterator[Dict[str, Any]]:
        """Parse the Ollama desktop SQLite database (chats + messages)."""
        try:
            conn = sqlite3.connect(str(file_path))
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            # Verify expected schema
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = {row[0] for row in cursor.fetchall()}
            if "messages" not in tables or "chats" not in tables:
                conn.close()
                return

            # Build chat_id -> created_at map
            cursor.execute("SELECT id, created_at FROM chats")
            chat_created = {row["id"]: row["created_at"] for row in cursor.fetchall()}

            cursor.execute("""
                SELECT id, chat_id, role, content, model_name, created_at
                FROM messages
                WHERE role IN ('user', 'assistant')
                ORDER BY chat_id, created_at
            """)
            rows = cursor.fetchall()

            # Group consecutive messages into synthetic request/response pairs.
            messages_by_chat: Dict[str, list[Dict[str, Any]]] = {}
            for row in rows:
                messages_by_chat.setdefault(row["chat_id"], []).append(dict(row))

            for chat_id, messages in messages_by_chat.items():
                for i, msg in enumerate(messages):
                    if msg["role"] != "assistant":
                        continue
                    # Pair with the most recent preceding user message.
                    user_content = ""
                    for prev in reversed(messages[:i]):
                        if prev["role"] == "user":
                            user_content = prev.get("content") or ""
                            break

                    assistant_content = msg.get("content") or ""
                    input_tokens = _estimate_tokens(user_content)
                    output_tokens = _estimate_tokens(assistant_content)

                    yield {
                        "session_id": chat_id,
                        "timestamp": self._parse_ts(msg["created_at"]),
                        "model": msg.get("model_name") or "unknown",
                        "input_tokens": input_tokens,
                        "output_tokens": output_tokens,
                        "cache_read_tokens": 0,
                        "cache_write_tokens": 0,
                        "project": None,
                        "branch": None,
                        "latency_ms": None,
                    }

            conn.close()
        except Exception as e:
            print(f"[OllamaParser] Error parsing {file_path}: {e}")

    def _normalize(self, record: dict) -> dict:
        usage = record.get("usage") or {}
        ts = record.get("timestamp") or record.get("created_at")
        project = record.get("project") or record.get("cwd")
        return {
            "session_id": record.get("session_id") or record.get("conversation_id"),
            "timestamp": self._parse_ts(ts) if ts else datetime.utcnow(),
            "model": record.get("model"),
            "input_tokens": (
                usage.get("prompt_tokens")
                or usage.get("input_tokens")
                or record.get("prompt_eval_count", 0)
            ),
            "output_tokens": (
                usage.get("completion_tokens")
                or usage.get("output_tokens")
                or record.get("eval_count", 0)
            ),
            "cache_read_tokens": 0,
            "cache_write_tokens": 0,
            "project": project,
            "branch": get_branch(project),
            "latency_ms": record.get("latency_ms"),
        }

    def _parse_ts(self, ts) -> datetime:
        if isinstance(ts, (int, float)):
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
