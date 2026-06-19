import hashlib
from pathlib import Path
from datetime import datetime
from typing import Dict, Any

from app.core.database import SessionLocal
from app.models.models import Request, IngestionState
from app.parsers.claude import ClaudeParser
from app.parsers.codex import CodexParser
from app.parsers.opencode import OpenCodeParser
from app.parsers.gemini import GeminiParser
from app.parsers.copilot import CopilotParser
from app.parsers.ollama import OllamaParser
from app.parsers.cursor import CursorParser
from app.parsers.antigravity import AntigravityParser
from app.parsers.generic import GenericJsonParser
from app.services.pricing import calculate_cost

PARSERS = {
    "claude": ClaudeParser(),
    "codex": CodexParser(),
    "opencode": OpenCodeParser(),
    "gemini": GeminiParser(),
    "copilot": CopilotParser(),
    "ollama": OllamaParser(),
    "cursor": CursorParser(),
    "antigravity": AntigravityParser(),
    # Generic parsers for tools with similar JSON structures
    "amp": GenericJsonParser("amp"),
    "droid": GenericJsonParser("droid"),
    "codebuff": GenericJsonParser("codebuff"),
    "hermes": GenericJsonParser("hermes"),
    "pi": GenericJsonParser("pi"),
    "goose": GenericJsonParser("goose"),
    "openclaw": GenericJsonParser("openclaw"),
    "kilo": GenericJsonParser("kilo"),
    "kimi": GenericJsonParser("kimi"),
    "qwen": GenericJsonParser("qwen"),
}


def ingest_file(source: str, file_path: Path):
    db = SessionLocal()
    try:
        stat = file_path.stat()
        mtime = datetime.utcfromtimestamp(stat.st_mtime)
        size = stat.st_size

        # Check ingestion state
        state = db.query(IngestionState).filter_by(file_path=str(file_path)).first()
        if state and state.last_modified == mtime and state.file_size == size:
            return  # Already up to date

        parser = PARSERS.get(source)
        if not parser or not parser.can_parse(file_path):
            return

        # Avoid duplicates on re-ingest: remove previous records from this file.
        db.query(Request).filter_by(source_file=str(file_path)).delete(synchronize_session=False)

        for record in parser.parse(file_path):
            record["source"] = source
            record["source_file"] = str(file_path)
            record["cost"] = calculate_cost(
                record.get("model"),
                record.get("input_tokens", 0),
                record.get("output_tokens", 0),
                record.get("cache_read_tokens", 0),
                record.get("cache_write_tokens", 0),
            )
            db.add(Request(**record))

        if state:
            state.last_modified = mtime
            state.file_size = size
            state.last_parsed_at = datetime.utcnow()
        else:
            db.add(IngestionState(
                source=source,
                file_path=str(file_path),
                file_size=size,
                last_modified=mtime,
            ))

        db.commit()
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()
