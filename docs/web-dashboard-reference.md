# Trace Web Dashboard — Reference

This document combines all the information needed to build the Trace web dashboard:
- Cloud API endpoints
- Liquid glass / liquid card design system
- Dashboard layout & design spec

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Cloud API Endpoints](#2-cloud-api-endpoints)
3. [Liquid Glass Design System](#3-liquid-glass-design-system)
4. [Dashboard Design Spec](#4-dashboard-design-spec)

---

## 1. Architecture Overview

The web dashboard (`traceanalytics.vercel.app`) talks exclusively to the **Cloud app** (Hono.js, deployed at `trace.monostack.in`).

```
Browser (Web Dashboard)
        │
        ▼  HTTPS
  Cloud App (Hono.js)          ← only these endpoints are reachable from the web
        │
        ▼
  Neon Postgres (cloud DB)     ← synced from user devices via /sync/push
```

The **Server app** (FastAPI, Python) runs as a local sidecar inside the Electron desktop app and is NOT accessible from the web. All data the web dashboard needs must come through the Cloud app endpoints.

**Base URL:** `https://trace.monostack.in`

**Auth:** Better Auth session cookie or Bearer token. All endpoints except `/health` and `/auth/*` require authentication.

**CORS origins allowed:** `https://traceanalytics.vercel.app`, `http://localhost:3000`, `http://localhost:3001`

**CORS headers allowed:** `Content-Type`, `Authorization`, `X-Device-Id`

---

## 2. Cloud API Endpoints

### 2.1 Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | None | Returns `{ status: "ok" }` — use for ping/uptime checks |

---

### 2.2 Authentication

Handled by **Better Auth**. All auth routes are mounted under `/api/auth`.

| Method | Path | Body / Notes |
|--------|------|--------------|
| `POST` | `/api/auth/sign-up/email` | `{ email, password, name }` |
| `POST` | `/api/auth/sign-in/email` | `{ email, password }` |
| `POST` | `/api/auth/sign-in/social` | OAuth — provider: `github` or `google` |
| `GET` | `/auth/login` | Login page (server-rendered HTML) |
| `GET` | `/auth/callback` | OAuth callback — returns desktop deep-link |

Session is returned as a cookie. Include `credentials: "include"` on all fetch calls from the web dashboard.

---

### 2.3 Account

| Method | Path | Auth | Response |
|--------|------|------|----------|
| `GET` | `/account` | Required | `{ id, email, name, providers: string[] }` |

`providers` lists the OAuth providers connected to the account (e.g. `["github"]`).

---

### 2.4 Devices

| Method | Path | Auth | Body / Notes |
|--------|------|------|--------------|
| `POST` | `/devices/register` | Required | `{ platform, version }` — registers/updates a device; returns device record |
| `GET` | `/devices` | Required | Returns array of devices ordered by `last_seen` desc |
| `DELETE` | `/devices/:id` | Required | Deletes a specific device by ID |

**Device object shape:**
```ts
{
  id: string
  platform: string       // "darwin" | "win32" | "linux"
  version: string        // app version
  last_seen: string      // ISO 8601
  created_at: string
}
```

---

### 2.5 Sync

| Method | Path | Auth | Headers | Body |
|--------|------|------|---------|------|
| `POST` | `/sync/push` | Required | `X-Device-Id` (optional) | Array of request log objects |

Used by the desktop app to push local request logs to the cloud. Not called from the web dashboard.

---

### 2.6 Metrics

All metrics endpoints accept a `range` query parameter:

| Value | Meaning |
|-------|---------|
| `today` | Current calendar day |
| `week` | Current calendar week |
| `month` | Current calendar month |
| `all` | All time (default when omitted) |

---

#### `GET /api/metrics/summary`

Aggregated top-level stats for the selected range.

**Query params:** `?range=today|week|month|all`

**Response:**
```ts
{
  total_cost: number           // USD
  total_requests: number
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  cache_write_tokens: number
  cache_hit_rate: number       // 0–100 (%)
  session_count: number
}
```

Use for: KPI cards at the top of the dashboard.

---

#### `GET /api/metrics/trends`

Time-series data bucketed by time for charting.

**Query params:** `?range=today|week|month|all`

**Bucketing logic:**
- `today` → hourly buckets
- `week` / `month` → daily buckets
- `all` → monthly buckets

**Response:**
```ts
{
  buckets: Array<{
    bucket: string          // ISO date/datetime string
    cost: number
    input_tokens: number
    output_tokens: number
    requests: number
    source: string          // "claude" | "codex" | "opencode" | ...
  }>
}
```

Use for: Bar chart / area chart showing usage over time, grouped by source.

---

#### `GET /api/metrics/models`

Usage broken down per model.

**Query params:** `?range=today|week|month|all`

**Response:**
```ts
{
  models: Array<{
    model: string
    source: string
    requests: number
    input_tokens: number
    output_tokens: number
    cost: number
  }>
}
```

Use for: Model breakdown table or donut chart.

---

#### `GET /api/metrics/sessions`

List of sessions with summary stats.

**Query params:** `?range=today|week|month|all`

**Response:**
```ts
{
  sessions: Array<{
    session_id: string
    source: string
    started_at: string      // ISO 8601
    ended_at: string        // ISO 8601
    requests: number
    input_tokens: number
    output_tokens: number
    cost: number
  }>
}
```

Use for: Sessions list / table with per-session drill-down.

---

#### `GET /api/metrics/sources`

Cost and usage broken down by AI provider/source.

**Query params:** `?range=today|week|month|all`

**Response:**
```ts
{
  sources: Array<{
    source: string          // "claude" | "codex" | "opencode" | "gemini" | ...
    requests: number
    input_tokens: number
    output_tokens: number
    cache_read_tokens: number
    cache_write_tokens: number
    cost: number
  }>
}
```

Use for: Provider breakdown bar chart or card grid.

---

### 2.7 Summary Table

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Uptime ping |
| `POST` | `/api/auth/sign-up/email` | Register |
| `POST` | `/api/auth/sign-in/email` | Login |
| `POST` | `/api/auth/sign-in/social` | OAuth login |
| `GET` | `/account` | Current user + connected providers |
| `GET` | `/devices` | List user's registered devices |
| `POST` | `/devices/register` | Register a device |
| `DELETE` | `/devices/:id` | Remove a device |
| `GET` | `/api/metrics/summary` | KPI totals |
| `GET` | `/api/metrics/trends` | Time-series chart data |
| `GET` | `/api/metrics/models` | Per-model breakdown |
| `GET` | `/api/metrics/sessions` | Session list |
| `GET` | `/api/metrics/sources` | Per-provider breakdown |

---

## 3. Liquid Glass Design System

The Trace design language is **liquid glass** — frosted, blurred panels with gradient pill borders. Below are the exact CSS/style specs used in the desktop app. Mirror these on the web dashboard for visual consistency.

---

### 3.1 Liquid Glass Card

The core card surface used for metric panels, tooltips, and modal dialogs.

```css
/* Light mode */
.glass-card {
  background: linear-gradient(
    160deg,
    rgba(255, 255, 255, 0.72) 0%,
    rgba(255, 255, 255, 0.48) 100%
  );
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow:
    inset 0px 1px 0px rgba(255, 255, 255, 0.6),
    0px 8px 32px rgba(0, 0, 0, 0.08),
    0px 2px 8px rgba(0, 0, 0, 0.04);
  border-radius: 16px;   /* rounded-2xl */
}

/* Dark mode */
.dark .glass-card {
  background: linear-gradient(
    160deg,
    rgba(30, 30, 35, 0.82) 0%,
    rgba(20, 20, 25, 0.72) 100%
  );
  border: 1px solid rgba(255, 255, 255, 0.10);
  box-shadow:
    inset 0px 1px 0px rgba(255, 255, 255, 0.06),
    0px 8px 32px rgba(0, 0, 0, 0.40);
}
```

**Tailwind equivalent (structure only — gradients must be inline styles):**
```tsx
<div
  className="rounded-2xl border backdrop-blur-xl"
  style={{
    background: "linear-gradient(160deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.48) 100%)",
    border: "1px solid rgba(255,255,255,0.5)",
    boxShadow: "inset 0px 1px 0px rgba(255,255,255,0.6), 0px 8px 32px rgba(0,0,0,0.08), 0px 2px 8px rgba(0,0,0,0.04)",
  }}
>
```

---

### 3.2 Liquid Button (Pill)

Used for KPI chips, the Claude usage widget, and any action button that needs the glass treatment.

**Outer wrapper — gradient pill border:**
```css
/* Light mode */
.liquid-button-outer {
  background: linear-gradient(
    180deg,
    rgb(245, 245, 245) 0%,
    rgba(101, 104, 111, 0.39) 24%,
    rgba(255, 255, 255, 0.75) 100%
  );
  box-shadow:
    inset 0px 4px 6.1px 0px rgba(255, 255, 255, 0.23),
    2px 23px 14px 0px rgba(0, 0, 0, 0.02),
    1px 10px 10px 0px rgba(0, 0, 0, 0.03),
    0px 3px 6px 0px rgba(0, 0, 0, 0.03);
  border-radius: 9999px;
  padding: 2px;
}

/* Dark mode */
.dark .liquid-button-outer {
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.12) 0%,
    rgba(255, 255, 255, 0.04) 24%,
    rgba(255, 255, 255, 0.08) 100%
  );
}
```

**Inner span — frosted fill:**
```css
.liquid-button-inner {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-radius: 9999px;
  padding: 4px 10px;
}

.dark .liquid-button-inner {
  background: rgba(255, 255, 255, 0.07);
}
```

**Text treatment:**
```css
.liquid-button-label {
  text-shadow: 0px 1px 0px rgba(255, 255, 255, 0.46);
  font-size: 12px;
  font-weight: 600;
}
```

**React component skeleton:**
```tsx
function LiquidButton({ children, className, ...props }) {
  return (
    <button
      className={cn("rounded-full p-[2px]", className)}
      style={{
        background: "linear-gradient(180deg, rgb(245,245,245) 0%, rgba(101,104,111,0.39) 24%, rgba(255,255,255,0.75) 100%)",
        boxShadow: "inset 0px 4px 6.1px 0px rgba(255,255,255,0.23), 2px 23px 14px 0px rgba(0,0,0,0.02)",
      }}
      {...props}
    >
      <span
        className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
        style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)" }}
      >
        {children}
      </span>
    </button>
  )
}
```

---

### 3.3 Glass Tooltip

Used for hover cards showing detailed stats. Entry uses a blur-morph spring animation.

**Visual treatment:**
```css
.glass-tooltip {
  /* same as .glass-card */
  background: linear-gradient(160deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.48) 100%);
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255,255,255,0.5);
  box-shadow:
    inset 0px 1px 0px rgba(255,255,255,0.6),
    0px 8px 32px rgba(0,0,0,0.08),
    0px 2px 8px rgba(0,0,0,0.04);
  border-radius: 16px;
  min-width: 240px;
  padding: 12px 16px;
}
```

**Framer Motion entry animation:**
```ts
const tooltipVariants = {
  initial:  { opacity: 0, scale: 0.92, filter: "blur(6px)" },
  animate:  { opacity: 1, scale: 1,    filter: "blur(0px)" },
  exit:     { opacity: 0, scale: 0.94, filter: "blur(4px)" },
}

const tooltipTransition = { type: "spring", stiffness: 300, damping: 28 }
```

**Divider inside tooltip:**
```css
.glass-divider {
  border-color: rgba(0, 0, 0, 0.08);   /* light */
}
.dark .glass-divider {
  border-color: rgba(255, 255, 255, 0.08);
}
```

---

### 3.4 Progress / Battery Bar

Used inside cards and tooltips to show utilization at a glance.

**Structure:**
```tsx
// Outer track
<div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
  {/* Inner fill — framer-motion */}
  <motion.div
    className={fillColor}   // see thresholds below
    style={{ transformOrigin: "left" }}
    animate={{ scaleX: percent / 100 }}
    transition={{ type: "spring", stiffness: 120, damping: 20 }}
  />
</div>
```

**Color thresholds:**
```ts
function getFillColor(percent: number): string {
  if (percent >= 90) return "bg-red-400"
  if (percent >= 70) return "bg-amber-400"
  return "bg-emerald-400"
}
```

**Vertical battery bar (for compact header widget):**
```tsx
<div className="w-1 h-5 rounded-full overflow-hidden bg-black/10 dark:bg-white/10">
  <motion.div
    className={fillColor}
    style={{ transformOrigin: "bottom" }}
    animate={{ scaleY: percent / 100 }}
    transition={{ type: "spring", stiffness: 120, damping: 20 }}
  />
</div>
```

---

### 3.5 Background

The page background should complement the glass cards — use a subtle gradient, not pure white.

```css
/* Light mode */
body {
  background: linear-gradient(135deg, #f8f8fa 0%, #efefef 100%);
  min-height: 100vh;
}

/* Dark mode */
.dark body {
  background: linear-gradient(135deg, #0f0f12 0%, #141418 100%);
}
```

---

## 4. Dashboard Design Spec

### 4.1 Overall Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  HEADER: Logo · "Trace" · [Range Tabs] · [Account] · [Devices] │
├─────────────────────────────────────────────────────────────────┤
│  RANGE TABS:  Today  |  This Week  |  This Month  |  All Time   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  KPI CARDS ROW                                                  │
│  [Total Cost] [Requests] [Input Tokens] [Output Tokens]         │
│  [Cache Miss] [Cache Hit] [Cache Hit Rate] [Sessions]           │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  TRENDS CHART (full width)                                      │
│  [Bar/Area chart — usage over time, grouped by source]          │
│  Toggle: Tokens | Dollars                                       │
│                                                                 │
├──────────────────────────┬──────────────────────────────────────┤
│  BY PROVIDER             │  BY MODEL                            │
│  [Source breakdown list] │  [Model breakdown table]             │
├──────────────────────────┴──────────────────────────────────────┤
│                                                                 │
│  SESSIONS TABLE                                                 │
│  [Session ID | Source | Start | End | Requests | Cost]          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 4.2 KPI Cards

Each card is a `glass-card` (Section 3.1) with the following layout:

```
┌─────────────────────┐
│  Label (xs muted)   │
│                     │
│  $12.40  ↑ 14%     │  ← large number + trend badge
└─────────────────────┘
```

**Trend badge:**
- Green `↑ X%` when above previous period
- Red `↓ X%` when below

**Cards to render** (from `/api/metrics/summary`):

| Label | Field | Format |
|-------|-------|--------|
| Total Cost | `total_cost` | `$0.0000` |
| Total Requests | `total_requests` | `1,234` |
| Input Tokens | `input_tokens` | `1.2M` |
| Output Tokens | `output_tokens` | `234K` |
| Cache Miss | `cache_write_tokens` | `45K` |
| Cache Hit | `cache_read_tokens` | `180K` |
| Cache Hit Rate | `cache_hit_rate` | `80%` |
| Sessions | `session_count` | `12` |

---

### 4.3 Trends Chart

Data from `/api/metrics/trends`.

- **Chart type:** Grouped bar chart (Recharts `<BarChart>`)
- **X-axis:** Time buckets — hours for Today, days for Week/Month, months for All Time
- **Y-axis:** Cost (`$`) or tokens (K/M), toggled by user
- **Series:** One bar group per `source` (claude, codex, opencode, gemini, …)
- **Colors:** Assign a consistent color per source:

| Source | Color |
|--------|-------|
| claude | `#D97706` (amber-600) |
| codex | `#2563EB` (blue-600) |
| opencode | `#7C3AED` (violet-600) |
| gemini | `#059669` (emerald-600) |
| copilot | `#0284C7` (sky-600) |
| ollama | `#DC2626` (red-600) |

- **Container:** Full-width glass card, `p-6`, height `280px`
- **Toggle:** LiquidButton pair `[Tokens] [Dollars]` in top-right of card

---

### 4.4 Provider Breakdown

Data from `/api/metrics/sources`.

```
┌──────────────────────────────────────────────────┐
│  Provider      Requests  Tokens      Cost        │
│  ──────────────────────────────────────────────  │
│  [●] Claude    1,234     1.2M / 45K  $9.20      │
│  [●] Codex       234     200K        $1.80      │
│  [●] Gemini       45      40K        $0.30      │
└──────────────────────────────────────────────────┘
```

- Each row: source color dot + name, request count, token total (input+output), cost
- Glass card container
- Rows separated by `glass-divider`

---

### 4.5 Model Breakdown

Data from `/api/metrics/models`.

```
┌─────────────────────────────────────────────────────────────┐
│  Model                  Requests   Tokens     Cost          │
│  ─────────────────────────────────────────────────────────  │
│  claude-sonnet-4-6        890      900K       $7.10        │
│  claude-haiku-4-5         344      320K       $0.90        │
│  gpt-4o                   234      200K       $1.80        │
└─────────────────────────────────────────────────────────────┘
```

- Glass card container, `p-4`
- Sortable by any column

---

### 4.6 Sessions Table

Data from `/api/metrics/sessions`.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Session          Source    Started       Duration   Requests   Cost      │
│  ────────────────────────────────────────────────────────────────────     │
│  abc123…          claude    2h ago        4m 20s     23         $0.34     │
│  def456…          codex     Yesterday     12m 10s    45         $0.89     │
└──────────────────────────────────────────────────────────────────────────┘
```

- `session_id` truncated to 8 chars + `…`
- `started_at` shown as relative time (`2h ago`, `Yesterday`)
- Duration = `ended_at - started_at`
- Glass card container, row hover: `bg-black/[0.03] dark:bg-white/[0.03]`

---

### 4.7 Range Selector

Four pill tabs: **Today · This Week · This Month · All Time**

Active tab = LiquidButton style (Section 3.2).
Inactive tab = ghost style: `bg-transparent text-foreground/60 hover:text-foreground`.

Changing range re-fetches all four metrics endpoints with the new `?range=` param.

---

### 4.8 Header

```
┌─────────────────────────────────────────────────────────────────┐
│  [T] Trace                              [Devices]  [Account ▾] │
└─────────────────────────────────────────────────────────────────┘
```

- Logo: `T` monogram or SVG logo, `font-bold text-xl`
- Glass card treatment on header: `sticky top-0 z-50`, same `backdrop-blur-xl`
- **Devices button:** LiquidButton → opens a dropdown/sheet listing registered devices with `last_seen`
- **Account menu:** name + avatar → Sign out

---

### 4.9 Empty & Loading States

- **Loading:** Skeleton shimmer inside each card (use `animate-pulse` on placeholder divs with `bg-black/5 dark:bg-white/5 rounded`)
- **No data:** Centered muted text `"No data for this period"` inside the card — no error state unless fetch fails
- **Fetch error:** Toast notification bottom-right — `"Failed to load metrics"` with retry button

---

### 4.10 Typography Scale

| Use | Class |
|-----|-------|
| KPI number | `text-3xl font-bold tabular-nums` |
| KPI label | `text-xs font-medium text-foreground/55` |
| Section heading | `text-sm font-semibold` |
| Table header | `text-xs font-medium text-foreground/55 uppercase tracking-wide` |
| Table cell | `text-sm tabular-nums` |
| Trend badge | `text-xs font-semibold px-1.5 py-0.5 rounded-full` |
| Muted detail | `text-xs text-foreground/55` |

Always use `tabular-nums` on any number that changes dynamically to prevent layout shift.

---

### 4.11 Spacing & Sizing

| Element | Value |
|---------|-------|
| Page padding | `px-6 py-8` (desktop), `px-4 py-6` (mobile) |
| Card padding | `p-5` (KPI), `p-6` (charts/tables) |
| Card gap | `gap-4` (KPI row), `gap-6` (section rows) |
| Card border radius | `rounded-2xl` (16px) |
| Button border radius | `rounded-full` |
| Header height | `h-14` |
| Chart height | `280px` |
| Table row height | `h-11` |
