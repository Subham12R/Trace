import os
from pathlib import Path
from typing import Dict, List

# Configurable paths per source. Env vars override defaults.
# Comma-separated directories supported.
SOURCE_CONFIG: Dict[str, Dict] = {
    "claude": {
        "env": "CLAUDE_HOME",
        "defaults": ["~/.claude", "~/.config/claude/projects"],
        "pattern": "**/*.json",
    },
    "codex": {
        "env": "CODEX_HOME",
        "defaults": ["~/.codex"],
        "pattern": "**/*.{json,jsonl}",
    },
    "opencode": {
        "env": "OPENCODE_DATA_DIR",
        "defaults": ["~/.local/share/opencode"],
        "pattern": "**/*.{json,jsonl}",
    },
    "gemini": {
        "env": "GEMINI_DATA_DIR",
        "defaults": ["~/.gemini/tmp"],
        "pattern": "**/*.json",
    },
    "copilot": {
        "env": "COPILOT_OTEL_FILE_EXPORTER_PATH",
        "defaults": ["~/.copilot/otel/*.jsonl"],
        "pattern": None,  # specific glob
    },
    "ollama": {
        "env": "OLLAMA_DATA_DIR",
        "defaults": ["~/.ollama"],
        "pattern": "**/*.log",
    },
}

WATCH_INTERVAL_SECONDS = 5
ACTIVE_SESSION_THRESHOLD_SECONDS = 60


def get_source_paths(source: str) -> List[Path]:
    cfg = SOURCE_CONFIG.get(source)
    if not cfg:
        return []

    raw = os.environ.get(cfg["env"])
    if raw:
        paths = [p.strip() for p in raw.split(",")]
    else:
        paths = cfg["defaults"]

    resolved = []
    for p in paths:
        expanded = Path(p).expanduser()
        if cfg["pattern"]:
            resolved.append(expanded)
        else:
            resolved.append(expanded)
    return resolved
