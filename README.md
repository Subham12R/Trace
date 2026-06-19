<img width="3780" height="1890" alt="your one stop solution for all analytics" src="https://github.com/user-attachments/assets/19f38972-59e3-476f-bda2-a0bfe63c523a" />
# Trace

Trace is a local-first AI observability dashboard — like Grafana for your AI CLI usage. Monitor token consumption, estimated costs, and usage trends across Claude Code, Codex, OpenCode, Gemini CLI, Copilot CLI, and Ollama from a single unified interface.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

---

## What It Does

AI coding CLI tools generate local usage logs. Trace reads those logs in real time and gives you:

- **Unified dashboard** — See all your AI CLI usage in one place
- **Cost tracking** — Estimated spend across providers, models, and sessions
- **Usage trends** — Hourly, daily, weekly, monthly breakdowns with bar charts
- **Session drill-down** — Per-conversation token and cost analysis
- **Active session indicator** — Know which tool is running right now
- **100% local** — Your data never leaves your machine

---

## Supported Tools

| Tool | Status | Notes |
|---|---|---|
| Claude Code | ✅ Supported | Reads `~/.claude/` and `~/.config/claude/projects/` |
| Codex | ✅ Supported | Reads `~/.codex/` |
| OpenCode | ✅ Supported | Reads `~/.local/share/opencode/` |
| Gemini CLI | ✅ Supported | Reads `~/.gemini/tmp/` |
| Copilot CLI | ⚡ P1 | Reads `~/.copilot/otel/*.jsonl` |
| Ollama | ⚡ P1 | Reads `~/.ollama/` or local API |

All paths are configurable via environment variables.

---

## How It Works

1. **Start Trace** — Electron boots and spawns a local FastAPI server
2. **File watcher scans** — Every 5 seconds, Trace checks known CLI log directories
3. **Parses & ingests** — Log files are parsed (JSON, JSONL, SQLite) into a unified SQLite database
4. **Dashboard updates** — React frontend polls the API every 5 seconds for live metrics
5. **Visualize** — KPI cards, bar charts, session tables, and trend indicators

---

## Architecture

```
┌─────────────────────────────────────────────┐
│  Electron + Vite + React + Tailwind + Recharts│
│              Dark Dashboard UI                │
│                   ↓ HTTP poll                 │
│  ┌─────────────────────────────────────────┐  │
│  │      FastAPI Sidecar (Python)           │  │
│  │  ├─ Background File Watcher (5s)        │  │
│  │  ├─ Parsers (JSON, JSONL, SQLite)       │  │
│  │  ├─ Ingestor → SQLite                   │  │
│  │  └─ Metrics API (aggregation)           │  │
│  └─────────────────────────────────────────┘  │
│         ↑ reads local log files               │
│  ~/.claude/  ~/.codex/  ~/.copilot/otel/      │
│  ~/.gemini/  ~/.local/share/opencode/         │
│  ~/.ollama/                                   │
└─────────────────────────────────────────────┘
```

---

## Development

### Prerequisites
- Node.js 20+
- Python 3.11+
- pnpm (or npm)

### Setup

```bash
# Clone
git clone <repo>
cd trace

# Install frontend dependencies
cd apps/desktop
pnpm install

# Install backend dependencies
cd ../server
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements.txt

# Start development
cd apps/desktop
pnpm dev
```

### Project Structure

```
trace/
├── apps/
│   ├── desktop/          # Electron + Vite + React
│   └── server/           # FastAPI sidecar
├── database/
│   └── schema.sql        # Reference SQLite schema
└── docs/
    ├── PRD.md            # Product requirements
    └── TECH_STACK.md     # Tech stack details
```

---

## Privacy

- **100% local** — All analysis happens on your machine
- **No data transmission** — Your usage data never leaves your computer
- **Read-only** — Trace only reads log files, never modifies them
- **No authentication** — Single-user, no accounts or cloud

---

## License

MIT
