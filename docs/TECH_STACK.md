# Tech Stack

## Desktop
- **Electron** — Desktop shell, spawns FastAPI sidecar

## Frontend
- **Vite** — Build tool and dev server
- **React** — UI framework
- **TypeScript** — Type safety
- **Tailwind CSS** — Utility-first styling
- **shadcn/ui** — Component primitives
- **Recharts** — Bar charts, trend visualizations
- **Zustand** — Lightweight state management
- **TanStack Query** — Server state, caching, polling

## Backend
- **FastAPI** — Python web framework
- **SQLAlchemy** — SQLite ORM
- **Pydantic** — Data validation
- **Uvicorn** — ASGI server
- **APScheduler** — Background file watcher scheduler

## Storage
- **SQLite** — Local metrics database

## Analytics
- **Pandas** — Data aggregation and rollups
- **NumPy** — Numerical operations

## Data Sources
File system parsers for:
- **Claude Code** — `~/.claude/`, `~/.config/claude/projects/`
- **Codex** — `~/.codex/`
- **OpenCode** — `~/.local/share/opencode/`
- **Gemini CLI** — `~/.gemini/tmp/`
- **Copilot CLI** — `~/.copilot/otel/*.jsonl`
- **Ollama** — `~/.ollama/` or local API

All paths configurable via environment variables.
