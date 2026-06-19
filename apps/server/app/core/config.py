import os
from pathlib import Path
from typing import Dict, List

# All supported AI CLI tools matching ccusage
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
        "pattern": "**/*.db",
    },
    "amp": {
        "env": "AMP_DATA_DIR",
        "defaults": ["~/.local/share/amp"],
        "pattern": "**/*.{json,jsonl}",
    },
    "droid": {
        "env": "DROID_SESSIONS_DIR",
        "defaults": ["~/.factory/sessions"],
        "pattern": "**/*.{json,jsonl}",
    },
    "codebuff": {
        "env": "CODEBUFF_DATA_DIR",
        "defaults": ["~/.config/manicode"],
        "pattern": "**/*.{json,jsonl}",
    },
    "hermes": {
        "env": "HERMES_HOME",
        "defaults": ["~/.hermes"],
        "pattern": "**/*.{json,jsonl,db}",
    },
    "pi": {
        "env": "PI_AGENT_DIR",
        "defaults": ["~/.pi/agent/sessions"],
        "pattern": "**/*.{json,jsonl}",
    },
    "goose": {
        "env": "GOOSE_PATH_ROOT",
        "defaults": ["~/.goose"],
        "pattern": "**/*.{json,jsonl}",
    },
    "openclaw": {
        "env": "OPENCLAW_DIR",
        "defaults": ["~/.openclaw"],
        "pattern": "**/*.{json,jsonl}",
    },
    "kilo": {
        "env": "KILO_DATA_DIR",
        "defaults": ["~/.local/share/kilo"],
        "pattern": "**/*.{json,jsonl}",
    },
    "kimi": {
        "env": "KIMI_DATA_DIR",
        "defaults": ["~/.kimi"],
        "pattern": "**/*.{json,jsonl}",
    },
    "qwen": {
        "env": "QWEN_DATA_DIR",
        "defaults": ["~/.qwen"],
        "pattern": "**/*.{json,jsonl}",
    },
    "copilot": {
        "env": "COPILOT_OTEL_FILE_EXPORTER_PATH",
        "defaults": ["~/.copilot/otel/*.jsonl"],
        "pattern": None,
    },
    "gemini": {
        "env": "GEMINI_DATA_DIR",
        "defaults": ["~/.gemini/tmp"],
        "pattern": "**/*.json",
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
        resolved.append(expanded)
    return resolved


def detect_installed_sources() -> List[str]:
    """Detect which AI CLI tools are installed by checking their data directories."""
    installed = []
    for source, cfg in SOURCE_CONFIG.items():
        paths = get_source_paths(source)
        for p in paths:
            if p.exists():
                installed.append(source)
                break
    return installed
