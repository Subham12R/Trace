import os
from pathlib import Path
from typing import Dict, List

# All supported AI CLI tools matching ccusage
SOURCE_CONFIG: Dict[str, Dict] = {
    "claude": {
        "env": "CLAUDE_HOME",
        "defaults": ["~/.claude/projects", "~/.config/claude/projects"],
        "pattern": "**/*.jsonl",
        "domain": "anthropic.com",
        "logo_url": "/logos/claudecode.png",
    },
    "codex": {
        "env": "CODEX_HOME",
        "defaults": ["~/.codex"],
        "pattern": "**/*.{json,jsonl}",
        "domain": "openai.com",
        "logo_url": "/logos/openai.svg",
    },
    "opencode": {
        "env": "OPENCODE_DATA_DIR",
        "defaults": ["~/.local/share/opencode"],
        "pattern": "**/*.db",
        "domain": "opencode.ai",
        "logo_url": "/logos/opencode.png",
    },
    "amp": {
        "env": "AMP_DATA_DIR",
        "defaults": ["~/.local/share/amp"],
        "pattern": "**/*.{json,jsonl}",
        "domain": None,
        "logo_url": "/logos/amp.png",
    },
    "droid": {
        "env": "DROID_SESSIONS_DIR",
        "defaults": ["~/.factory/sessions"],
        "pattern": "**/*.{json,jsonl}",
        "domain": "factory.ai",
        "logo_url": "/logos/droid.png",
    },
    "codebuff": {
        "env": "CODEBUFF_DATA_DIR",
        "defaults": ["~/.config/manicode"],
        "pattern": "**/*.{json,jsonl}",
        "domain": "manicode.ai",
        "logo_url": "/logos/codebuff.png",
    },
    "hermes": {
        "env": "HERMES_HOME",
        "defaults": ["~/.hermes"],
        "pattern": "**/*.{json,jsonl,db}",
        "domain": None,
        "logo_url": "/logos/hermes.png",
    },
    "pi": {
        "env": "PI_AGENT_DIR",
        "defaults": ["~/.pi/agent/sessions"],
        "pattern": "**/*.{json,jsonl}",
        "domain": "pi.ai",
        "logo_url": "/logos/pi.png",
    },
    "goose": {
        "env": "GOOSE_PATH_ROOT",
        "defaults": ["~/.goose"],
        "pattern": "**/*.{json,jsonl}",
        "domain": "block.github.io",
        "logo_url": "/logos/goose.png",
    },
    "openclaw": {
        "env": "OPENCLAW_DIR",
        "defaults": ["~/.openclaw"],
        "pattern": "**/*.{json,jsonl}",
        "domain": None,
        "logo_url": "/logos/openclaw.png",
    },
    "kilo": {
        "env": "KILO_DATA_DIR",
        "defaults": ["~/.local/share/kilo"],
        "pattern": "**/*.{json,jsonl}",
        "domain": None,
        "logo_url": "/logos/kilo.png",
    },
    "kimi": {
        "env": "KIMI_DATA_DIR",
        "defaults": ["~/.kimi"],
        "pattern": "**/*.{json,jsonl}",
        "domain": "moonshot.cn",
        "logo_url": "/logos/kimi.png",
    },
    "qwen": {
        "env": "QWEN_DATA_DIR",
        "defaults": ["~/.qwen"],
        "pattern": "**/*.{json,jsonl}",
        "domain": "alibabacloud.com",
        "logo_url": "/logos/qwen.png",
    },
    "copilot": {
        "env": "COPILOT_OTEL_FILE_EXPORTER_PATH",
        "defaults": ["~/.copilot/otel/*.jsonl"],
        "pattern": None,
        "domain": "github.com",
        "logo_url": "/logos/github.svg",
    },
    "gemini": {
        "env": "GEMINI_DATA_DIR",
        "defaults": ["~/.gemini/tmp"],
        "pattern": "**/*.json",
        "domain": "google.com",
        "logo_url": "/logos/gemini.svg",
    },
    "ollama": {
        "env": "OLLAMA_DATA_DIR",
        "defaults": ["~/.ollama", "~/AppData/Local/Ollama"],
        "pattern": "**/*.{log,sqlite,db}",
        "domain": "ollama.com",
        "logo_url": "/logos/ollama.svg",
    },
    "cursor": {
        "env": "CURSOR_DATA_DIR",
        "defaults": [
            "~/AppData/Roaming/Cursor/User/globalStorage",
            "~/.config/Cursor/User/globalStorage",
            "~/Library/Application Support/Cursor/User/globalStorage",
        ],
        "pattern": "**/state.vscdb",
        "domain": "cursor.com",
        "logo_url": "/logos/cursor.png",
    },
    "antigravity": {
        "env": "ANTIGRAVITY_DATA_DIR",
        "defaults": [
            "~/AppData/Roaming/antigravity-ide/brain",
            "~/.gemini/antigravity-ide/brain",
            "~/Library/Application Support/antigravity-ide/brain",
        ],
        "pattern": "**/.system_generated/logs/transcript.jsonl",
        "domain": "antigravity.google",
        "logo_url": "/logos/antigravity.jpg",
    },
}

WATCH_INTERVAL_SECONDS = 5
ACTIVE_SESSION_THRESHOLD_SECONDS = 300


_SYSTEM_PATH_PREFIXES = ("/dev/", "/proc/", "/sys/")


def _is_user_data_path(p: Path) -> bool:
    """Return False for system device paths (e.g. /dev/null used to disable OTEL)."""
    s = str(p)
    return not any(s.startswith(prefix) for prefix in _SYSTEM_PATH_PREFIXES)


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
        if _is_user_data_path(expanded):
            resolved.append(expanded)
    return resolved


def detect_installed_sources() -> List[str]:
    """Detect which AI CLI tools are installed by checking their data directories."""
    installed = []
    for source, cfg in SOURCE_CONFIG.items():
        paths = get_source_paths(source)
        for p in paths:
            # Paths with glob characters (e.g. ~/.copilot/otel/*.jsonl) — check parent
            if "*" in str(p) or "?" in str(p):
                if p.parent.exists() and any(p.parent.glob(p.name)):
                    installed.append(source)
                    break
            elif p.exists():
                installed.append(source)
                break
    return installed
