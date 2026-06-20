<img width="3780" height="1890" alt="your one stop solution for all analytics" src="https://github.com/user-attachments/assets/19f38972-59e3-476f-bda2-a0bfe63c523a" />


Trace is a local-first AI observability dashboard — like Grafana for your AI CLI usage. Monitor token consumption, estimated costs, and usage trends across Claude Code, Cursor, Codex, OpenCode, Gemini CLI, Copilot CLI, and Ollama from a single unified interface.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

---

## Download

| Platform | Link |
|---|---|
| **macOS** (Apple Silicon) | **[Trace-0.3.1-mac.dmg](https://github.com/Subham12R/Trace/releases/latest)** |
| **Windows** | **[Trace-Setup.exe](https://github.com/Subham12R/Trace/releases/latest)** |

No Python or runtime required — everything is bundled. Trace auto-updates silently in the background. When a new version is ready, a banner appears inside the app — click **Restart & Update** and you're done.

---

## What It Does

AI coding CLI tools generate local usage logs. Trace reads those logs in real time and gives you:

- **Unified dashboard** — See all your AI CLI usage in one place
- **Cost tracking** — Estimated spend across providers, models, and sessions
- **Usage trends** — Hourly, daily, weekly, monthly breakdowns with bar charts
- **Session drill-down** — Per-conversation token and cost analysis
- **Active session indicator** — Know which tool is running right now
- **System tray** — Closing the window keeps Trace running in the background
- **Auto-update** — New releases download automatically, one click to apply
- **100% local** — Your data never leaves your machine

---

## Supported Tools

| Tool | Status | Notes |
|---|---|---|
| Claude Code | ✅ Supported | Reads `~/.claude/` and `~/.config/claude/projects/` |
| Cursor | ✅ Supported | Reads `~/Library/Application Support/Cursor/` (Mac), `%APPDATA%\Cursor\` (Windows) |
| Codex | ✅ Supported | Reads `~/.codex/` |
| OpenCode | ✅ Supported | Reads `~/.local/share/opencode/` |
| Gemini CLI | ✅ Supported | Reads `~/.gemini/tmp/` |
| Copilot CLI | ⚡ P1 | Reads `~/.copilot/otel/*.jsonl` |
| Ollama | ⚡ P1 | Reads `~/.ollama/` or local API |

All paths are configurable via environment variables.

---

## How It Works

1. **Start Trace** — Electron boots and spawns a bundled local FastAPI server (no Python needed)
2. **File watcher scans** — Every 5 seconds, Trace checks known CLI log directories
3. **Parses & ingests** — Log files are parsed (JSON, JSONL, SQLite) into a unified SQLite database
4. **Dashboard updates** — React frontend polls the API every 5 seconds for live metrics
5. **Visualize** — KPI cards, bar charts, session tables, and trend indicators
6. **Close to tray** — Closing the window hides Trace to the system tray; the watcher keeps running

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
│  ~/.ollama/  ~/Library/Application Support/   │
└─────────────────────────────────────────────┘
```

---

## Development

### Prerequisites
- Node.js 20+
- Python 3.12+ (required for development only — not needed to run the installed app)
- npm

### Setup

```bash
# 1. Install dependencies
npm install --include=dev

# 2. Install backend dependencies (Mac)
cd apps/server
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# Windows
py -3.12 -m venv .venv312
.venv312\Scripts\pip install -r requirements.txt

# 3. Start development (runs server + Vite + Electron)
cd ../..
npm run dev
```

Or run components separately:

```bash
# Terminal 1: FastAPI server (Mac)
cd apps/server
.venv/bin/python start.py

# Terminal 1: FastAPI server (Windows)
cd apps/server
.venv312\Scripts\python.exe start.py

# Terminal 2: Vite dev server
cd apps/desktop
npm run dev

# Terminal 3: Electron shell
cd apps/desktop
npm run electron:dev
```

### Building

```bash
# Mac
cd apps/desktop
npm run electron:build:mac

# Windows
cd apps/desktop
npm run electron:build
```

### Project Structure

```
trace/
├── apps/
│   ├── desktop/          # Electron + Vite + React
│   │   ├── electron/     # Main process (main.ts, preload.ts)
│   │   └── src/          # React frontend
│   └── server/           # FastAPI sidecar
│       ├── app/          # API routes, parsers, watcher
│       ├── build.sh      # Mac PyInstaller build script
│       └── build.ps1     # Windows PyInstaller build script
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
