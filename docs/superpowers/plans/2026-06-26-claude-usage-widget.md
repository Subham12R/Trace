# Claude Usage Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a liquid-glass Claude usage widget to the app header showing the 5-hour rolling window battery bar and a morph-transition tooltip with rolling usage, weekly usage, and reset time.

**Architecture:** A new `LiquidButton` shared component provides the glass shell. `SystemWidget` wraps it with `@base-ui/react/tooltip` primitives, a framer spring battery bar, and a morph-entry glass tooltip panel. A new Python FastAPI endpoint on the existing `/api/system` router fetches Claude OAuth usage + queries local SQLite for weekly totals.

**Tech Stack:** React 18, TypeScript, `motion/react` v12, `@base-ui/react/tooltip` v1.6, TanStack Query v5, FastAPI (Python), SQLAlchemy, `httpx`, Tailwind CSS v3.4, inline `style` props for multi-stop gradients.

## Global Constraints

- Motion library is `motion/react` v12 — import as `import { motion, AnimatePresence } from "motion/react"` (NOT `framer-motion`)
- Tooltip primitives from `@base-ui/react/tooltip` — import as `import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"`
- Dark mode detection via `useThemeStore(s => s.resolved)` — returns `'light' | 'dark'`
- Claude SVG path: `${import.meta.env.BASE_URL}logos/claude.svg`
- All gradients/shadows use inline `style` props (Tailwind can't express multi-stop inline gradients)
- Layout classes use Tailwind utilities
- Battery fill color thresholds: 0–69% emerald-400, 70–89% amber-400, ≥90% red-400
- Weekly boundary: Monday 00:00 UTC
- Widget returns `null` (not a loading state) when `rolling` is `null` — silent hide
- No new npm packages — all dependencies already installed

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `apps/desktop/src/components/ui/LiquidButton.tsx` | Create | Reusable liquid-glass pill button shell |
| `apps/desktop/src/components/SystemWidget.tsx` | Rewrite | Claude widget: battery bar + glass tooltip |
| `apps/desktop/src/hooks/useMetrics.ts` | Modify | Add `ClaudeUsage` type + `useClaudeUsage` hook |
| `apps/server/app/api/system.py` | Modify | Add `GET /usage` endpoint |
| `apps/desktop/src/components/app-shell.tsx` | Fix | Add missing `motion` import |

---

## Task 1: LiquidButton shared component

**Files:**
- Create: `apps/desktop/src/components/ui/LiquidButton.tsx`

**Interfaces:**
- Produces: `LiquidButton` React component exported as default and named export
  - Props: `React.ButtonHTMLAttributes<HTMLButtonElement>` + `textColor?: string` + `dark?: boolean`
  - Used by Task 3 (`SystemWidget.tsx`) as the tooltip trigger wrapper

- [ ] **Step 1: Create the file**

```typescript
// apps/desktop/src/components/ui/LiquidButton.tsx
"use client";
import React from "react";
import { cn } from "@/lib/utils";

interface LiquidButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  textColor?: string;
  dark?: boolean;
}

const LiquidButton = React.forwardRef<HTMLButtonElement, LiquidButtonProps>(
  ({ className, children, textColor, dark = false, ...props }, ref) => {
    const outerStyle: React.CSSProperties = dark
      ? {
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 24%, rgba(255,255,255,0.08) 100%)",
          boxShadow:
            "inset 0px 4px 6.1px 0px rgba(255,255,255,0.08), 2px 23px 14px 0px rgba(0,0,0,0.06), 1px 10px 10px 0px rgba(0,0,0,0.08), 0px 3px 6px 0px rgba(0,0,0,0.08)",
        }
      : {
          background:
            "linear-gradient(180deg, rgb(245,245,245) 0%, rgba(101,104,111,0.39) 24%, rgba(255,255,255,0.75) 100%)",
          boxShadow:
            "inset 0px 4px 6.1px 0px rgba(255,255,255,0.23), 2px 23px 14px 0px rgba(0,0,0,0.02), 1px 10px 10px 0px rgba(0,0,0,0.03), 0px 3px 6px 0px rgba(0,0,0,0.03)",
        };

    const innerStyle: React.CSSProperties = {
      background: dark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.6)",
      backdropFilter: "blur(8px)",
    };

    const textStyle: React.CSSProperties = {
      color: textColor ?? (dark ? "rgba(255,255,255,0.9)" : "rgb(61,61,61)"),
      letterSpacing: "-0.03em",
      lineHeight: 1.2,
      textShadow: dark
        ? "0px 1px 0px rgba(0,0,0,0.3)"
        : "0px 1px 0px rgba(255,255,255,0.46)",
    };

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "group/lb relative inline-flex items-center justify-center rounded-full p-[2px] text-sm transition-opacity hover:opacity-90 active:opacity-75",
          className,
        )}
        style={outerStyle}
        {...props}
      >
        <span
          className="flex items-center justify-center rounded-full px-2 py-1"
          style={innerStyle}
        >
          <span className="flex items-center gap-1.5 whitespace-nowrap font-semibold" style={textStyle}>
            {children}
          </span>
        </span>
      </button>
    );
  },
);

LiquidButton.displayName = "LiquidButton";
export { LiquidButton };
export default LiquidButton;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/desktop && npx tsc --noEmit 2>&1 | grep LiquidButton
```

Expected: no output (no errors referencing LiquidButton).

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/components/ui/LiquidButton.tsx
git commit -m "feat: add LiquidButton shared liquid-glass component"
```

---

## Task 2: Python `/api/system/usage` endpoint

**Files:**
- Modify: `apps/server/app/api/system.py`

**Interfaces:**
- Consumes: `fetch_claude_oauth_usage()` from `app.services.cloud_sync` (already imported in metrics.py — add import here)
- Consumes: `SessionLocal` from `app.core.database`, `Request` model from `app.models.models`
- Produces: `GET /api/system/usage` → JSON matching `ClaudeUsageResponse`

  ```
  {
    "rolling": {
      "used": int,
      "limit": int,
      "percent": float,   // 0.0–100.0
      "reset_at": str     // ISO 8601, e.g. "2026-06-26T18:45:00Z"
    } | null,
    "weekly": {
      "tokens": int,
      "cost": float
    }
  }
  ```

- [ ] **Step 1: Manually trigger the OAuth call to inspect the real response shape**

Run the server locally, then in a separate terminal:
```bash
cd apps/server
source .venv/Scripts/activate  # Windows: .venv\Scripts\activate
python -c "
from app.services.cloud_sync import fetch_claude_oauth_usage
import json
data = fetch_claude_oauth_usage()
print(json.dumps(data, indent=2))
"
```

Observe the actual field names. Common shapes from Anthropic's OAuth usage endpoint:
- `data["message_limits"]["messages_used"]` / `["message_limit"]` / `["reset_time"]`
- `data["usage"]["input_tokens"]` / `["limit"]` / `["reset_at"]`

Note the exact keys and update the parser in step 3 accordingly.

- [ ] **Step 2: Add imports and Pydantic models to `system.py`**

Open `apps/server/app/api/system.py` and replace the file content with:

```python
import getpass
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import func

from app.core.database import SessionLocal
from app.models.models import Request
from app.services.cloud_sync import fetch_claude_oauth_usage

router = APIRouter()


class SystemUser(BaseModel):
    name: str
    avatar_url: str | None = None


class RollingUsage(BaseModel):
    used: int
    limit: int
    percent: float
    reset_at: str


class WeeklyUsage(BaseModel):
    tokens: int
    cost: float


class ClaudeUsageResponse(BaseModel):
    rolling: Optional[RollingUsage]
    weekly: WeeklyUsage


def _find_windows_account_picture() -> str | None:
    """Best-effort lookup of the Windows account picture."""
    appdata = os.environ.get("APPDATA")
    if not appdata:
        return None
    account_dir = Path(appdata) / "Microsoft" / "Windows" / "AccountPictures"
    if not account_dir.exists():
        return None
    candidates = sorted(
        [p for p in account_dir.iterdir() if p.suffix.lower() in (".png", ".jpg", ".jpeg", ".bmp")],
        key=lambda p: p.stat().st_size,
        reverse=True,
    )
    if candidates:
        return candidates[0].as_uri()
    return None


def _parse_rolling(raw: dict | None) -> Optional[RollingUsage]:
    """
    Defensively parse the Claude OAuth usage response.
    Tries multiple known field paths; returns None on any failure.
    """
    if not raw or not isinstance(raw, dict):
        return None
    try:
        # Try nested message_limits shape
        ml = raw.get("message_limits") or raw.get("consumption_limits", {}).get("message_limits", {})
        if ml:
            used = int(ml.get("messages_used") or ml.get("used") or 0)
            limit = int(ml.get("message_limit") or ml.get("limit") or 0)
            reset_at = str(ml.get("reset_time") or ml.get("reset_at") or "")
        else:
            # Try flat shape
            used = int(raw.get("used") or raw.get("messages_used") or 0)
            limit = int(raw.get("limit") or raw.get("message_limit") or 0)
            reset_at = str(raw.get("reset_at") or raw.get("reset_time") or "")

        if limit <= 0:
            return None

        percent = round(min(100.0, (used / limit) * 100), 1)
        return RollingUsage(used=used, limit=limit, percent=percent, reset_at=reset_at)
    except Exception:
        return None


def _weekly_usage() -> WeeklyUsage:
    """Sum tokens and cost for Claude sources since Monday 00:00 UTC."""
    now = datetime.utcnow()
    monday = now - timedelta(days=now.weekday(), hours=now.hour, minutes=now.minute, seconds=now.second, microseconds=now.microsecond)
    claude_sources = ("claude", "claude-code", "claude-cloud")

    db = SessionLocal()
    try:
        row = (
            db.query(
                func.coalesce(func.sum(Request.input_tokens + Request.output_tokens), 0).label("tokens"),
                func.coalesce(func.sum(Request.cost), 0.0).label("cost"),
            )
            .filter(
                Request.source.in_(claude_sources),
                Request.timestamp >= monday,
            )
            .one()
        )
        return WeeklyUsage(tokens=int(row.tokens), cost=round(float(row.cost), 4))
    finally:
        db.close()


@router.get("/proxy-status")
def proxy_status():
    """Return Ollama proxy status and request count."""
    from app.services.ollama_proxy import get_proxy_status
    return get_proxy_status()


@router.get("/user", response_model=SystemUser)
def get_system_user():
    name = getpass.getuser()
    display_name = name.replace(".", " ").replace("_", " ").title()
    avatar_url = _find_windows_account_picture()
    return SystemUser(name=display_name, avatar_url=avatar_url)


@router.get("/usage", response_model=ClaudeUsageResponse)
def get_claude_usage():
    raw = fetch_claude_oauth_usage()
    rolling = _parse_rolling(raw)
    weekly = _weekly_usage()
    return ClaudeUsageResponse(rolling=rolling, weekly=weekly)
```

- [ ] **Step 3: Start the server and verify the endpoint**

```bash
cd apps/server && uvicorn app.main:app --port 8765 --reload
```

In a second terminal:
```bash
curl -s http://localhost:8765/api/system/usage | python -m json.tool
```

Expected (with OAuth creds present):
```json
{
  "rolling": {
    "used": 4100,
    "limit": 5000,
    "percent": 82.0,
    "reset_at": "2026-06-26T18:45:00Z"
  },
  "weekly": {
    "tokens": 23400,
    "cost": 1.2
  }
}
```

Expected (without OAuth creds):
```json
{
  "rolling": null,
  "weekly": { "tokens": 0, "cost": 0.0 }
}
```

If `rolling` fields are wrong, re-inspect the raw output from Step 1 and update `_parse_rolling` field paths.

- [ ] **Step 4: Commit**

```bash
git add apps/server/app/api/system.py
git commit -m "feat: add GET /api/system/usage endpoint with rolling + weekly Claude usage"
```

---

## Task 3: `useClaudeUsage` hook

**Files:**
- Modify: `apps/desktop/src/hooks/useMetrics.ts` (append to end of file)

**Interfaces:**
- Consumes: `api` from `@/lib/api` (already imported at top of file)
- Consumes: `useQuery` from `@tanstack/react-query` (already imported)
- Produces:
  ```typescript
  export interface ClaudeUsage {
    rolling: {
      used: number
      limit: number
      percent: number  // 0–100
      reset_at: string // ISO 8601
    } | null
    weekly: {
      tokens: number
      cost: number
    }
  }
  export function useClaudeUsage(): UseQueryResult<ClaudeUsage>
  ```

- [ ] **Step 1: Append the type and hook to `useMetrics.ts`**

Open `apps/desktop/src/hooks/useMetrics.ts` and append at the very end:

```typescript
export interface ClaudeUsage {
  rolling: {
    used: number
    limit: number
    percent: number
    reset_at: string
  } | null
  weekly: {
    tokens: number
    cost: number
  }
}

export function useClaudeUsage() {
  return useQuery<ClaudeUsage>({
    queryKey: ['system', 'usage'],
    queryFn: () => api.get('/api/system/usage'),
    staleTime: 60_000,
    refetchInterval: 60_000,
  })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/desktop && npx tsc --noEmit 2>&1 | grep useMetrics
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/hooks/useMetrics.ts
git commit -m "feat: add useClaudeUsage hook and ClaudeUsage type"
```

---

## Task 4: SystemWidget rewrite + app-shell motion fix

**Files:**
- Rewrite: `apps/desktop/src/components/SystemWidget.tsx`
- Fix: `apps/desktop/src/components/app-shell.tsx` (add missing `motion` import)

**Interfaces:**
- Consumes: `LiquidButton` from `@/components/ui/LiquidButton` (Task 1)
- Consumes: `useClaudeUsage`, `ClaudeUsage` from `@/hooks/useMetrics` (Task 3)
- Consumes: `Tooltip as TooltipPrimitive` from `@base-ui/react/tooltip`
- Consumes: `motion` from `motion/react`
- Consumes: `useThemeStore` from `@/stores/themeStore`
- Consumes: `cn` from `@/lib/utils`
- Produces: `export function SystemWidget({ className }: { className?: string })` — renders null when `data?.rolling` is null

- [ ] **Step 1: Fix the missing `motion` import in `app-shell.tsx`**

Open `apps/desktop/src/components/app-shell.tsx` and add this import after the existing imports:

```typescript
import { motion } from "motion/react";
```

The file currently uses `<motion.div>` on lines 55–62 but has no import for `motion`. Add it as the last import in the import block (after line 10 `import { useServerStatus } from "@/hooks/useServerStatus";`).

- [ ] **Step 2: Write the new `SystemWidget.tsx`**

Replace the entire contents of `apps/desktop/src/components/SystemWidget.tsx`:

```typescript
import React from 'react'
import { motion } from 'motion/react'
import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'
import { useClaudeUsage, type ClaudeUsage } from '@/hooks/useMetrics'
import { useThemeStore } from '@/stores/themeStore'
import { LiquidButton } from '@/components/ui/LiquidButton'
import { cn } from '@/lib/utils'

// ─── Battery bar ────────────────────────────────────────────────────────────

function batteryColor(percent: number): string {
  if (percent >= 90) return 'bg-red-400'
  if (percent >= 70) return 'bg-amber-400'
  return 'bg-emerald-400'
}

function BatteryBar({ percent }: { percent: number }) {
  return (
    <div className="w-1 h-5 rounded-full overflow-hidden bg-black/10 dark:bg-white/15">
      <motion.div
        className={cn('w-full rounded-full', batteryColor(percent))}
        style={{ transformOrigin: 'bottom', height: '100%' }}
        animate={{ scaleY: Math.max(0.02, percent / 100) }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
      />
    </div>
  )
}

// ─── Tooltip content ────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString()
}

function fmtCost(n: number): string {
  return n < 0.01 ? '<$0.01' : `$${n.toFixed(2)}`
}

function fmtResetTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

interface TooltipPanelProps {
  rolling: NonNullable<ClaudeUsage['rolling']>
  weekly: ClaudeUsage['weekly']
  dark: boolean
  open: boolean
}

function TooltipPanel({ rolling, weekly, dark, open }: TooltipPanelProps) {
  // Two-layer liquid glass — same shell as LiquidButton, rounded-2xl instead of rounded-full
  const outerStyle: React.CSSProperties = dark
    ? {
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 24%, rgba(255,255,255,0.08) 100%)',
        boxShadow:
          'inset 0px 4px 6.1px 0px rgba(255,255,255,0.08), 2px 23px 14px 0px rgba(0,0,0,0.08), 1px 10px 10px 0px rgba(0,0,0,0.10), 0px 3px 6px 0px rgba(0,0,0,0.08)',
        borderRadius: 18,
        padding: 2,
      }
    : {
        background:
          'linear-gradient(180deg, rgb(245,245,245) 0%, rgba(101,104,111,0.39) 24%, rgba(255,255,255,0.75) 100%)',
        boxShadow:
          'inset 0px 4px 6.1px 0px rgba(255,255,255,0.23), 2px 23px 14px 0px rgba(0,0,0,0.02), 1px 10px 10px 0px rgba(0,0,0,0.03), 0px 3px 6px 0px rgba(0,0,0,0.03)',
        borderRadius: 18,
        padding: 2,
      }

  const innerStyle: React.CSSProperties = {
    background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.6)',
    backdropFilter: 'blur(16px) saturate(180%)',
    borderRadius: 16,
  }

  const dividerStyle: React.CSSProperties = {
    borderColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
  }

  const labelStyle: React.CSSProperties = {
    textShadow: dark ? '0px 1px 0px rgba(0,0,0,0.4)' : '0px 1px 0px rgba(255,255,255,0.46)',
  }

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, scale: 0.92, filter: 'blur(6px)' },
        visible: { opacity: 1, scale: 1, filter: 'blur(0px)' },
      }}
      animate={open ? 'visible' : 'hidden'}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      style={outerStyle}
      className="w-60 select-none"
    >
      {/* Inner frosted layer — identical to LiquidButton's inner span */}
      <div style={innerStyle} className="px-4 py-3">

        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <img
            src={`${import.meta.env.BASE_URL}logos/claude.svg`}
            alt="Claude"
            className="size-4"
          />
          <span
            className={cn('text-xs font-semibold', dark ? 'text-white/90' : 'text-zinc-700')}
            style={labelStyle}
          >
            5-hr Window
          </span>
        </div>

        {/* Progress bar + percent */}
        <div className="flex items-center gap-2 mb-1">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-black/10 dark:bg-white/10">
            <div
              className={cn('h-full rounded-full transition-all duration-500', batteryColor(rolling.percent))}
              style={{ width: `${rolling.percent}%` }}
            />
          </div>
          <span className={cn('text-xs tabular-nums font-medium', dark ? 'text-white/80' : 'text-zinc-600')}>
            {rolling.percent.toFixed(0)}%
          </span>
        </div>

        {/* Token count */}
        <p className={cn('text-xs tabular-nums', dark ? 'text-white/50' : 'text-zinc-400')}>
          {fmt(rolling.used)} / {fmt(rolling.limit)} tokens
        </p>

        {/* Reset time */}
        {rolling.reset_at && (
          <p className={cn('text-xs mt-0.5', dark ? 'text-white/40' : 'text-zinc-400')}>
            Resets {fmtResetTime(rolling.reset_at)}
          </p>
        )}

        {/* Divider */}
        <div className="border-t my-2.5" style={dividerStyle} />

        {/* Weekly row */}
        <div className="flex items-center justify-between">
          <span className={cn('text-xs', dark ? 'text-white/50' : 'text-zinc-400')}>This week</span>
          <span className={cn('text-xs tabular-nums', dark ? 'text-white/70' : 'text-zinc-600')}>
            {fmt(weekly.tokens)} tok&nbsp;·&nbsp;{fmtCost(weekly.cost)}
          </span>
        </div>

      </div>
    </motion.div>
  )
}

// ─── Widget ─────────────────────────────────────────────────────────────────

export function SystemWidget({ className }: { className?: string }) {
  const { data } = useClaudeUsage()
  const resolved = useThemeStore((s) => s.resolved)
  const dark = resolved === 'dark'
  const [open, setOpen] = React.useState(false)

  if (!data?.rolling) return null

  return (
    <TooltipPrimitive.Provider>
      <TooltipPrimitive.Root open={open} onOpenChange={setOpen} delay={300}>
        <TooltipPrimitive.Trigger
          render={
            <LiquidButton dark={dark} className={className} aria-label="Claude usage">
              <img
                src={`${import.meta.env.BASE_URL}logos/claude.svg`}
                alt=""
                className="size-[18px]"
              />
              <BatteryBar percent={data.rolling.percent} />
            </LiquidButton>
          }
        />
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Positioner side="bottom" sideOffset={8} align="end">
            <TooltipPrimitive.Popup className="outline-none">
              <TooltipPanel
                rolling={data.rolling}
                weekly={data.weekly}
                dark={dark}
                open={open}
              />
            </TooltipPrimitive.Popup>
          </TooltipPrimitive.Positioner>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}
```

> **Note on `TooltipTrigger render` prop:** `@base-ui/react/tooltip` v1.x uses a `render` prop on `Trigger` to forward to a custom element — it merges the tooltip accessibility props into whatever element you pass. If `render` prop is not available on this version, use `asChild` pattern:
> ```tsx
> <TooltipPrimitive.Trigger asChild>
>   <LiquidButton dark={dark} className={className} aria-label="Claude usage">
>     ...
>   </LiquidButton>
> </TooltipPrimitive.Trigger>
> ```
> Check `@base-ui/react/tooltip` v1.6 docs if the build errors on the `render` prop.

- [ ] **Step 3: Verify TypeScript compiles with no errors**

```bash
cd apps/desktop && npx tsc --noEmit 2>&1
```

Expected: no output (zero errors). If you see errors about the `render` prop on `TooltipPrimitive.Trigger`, switch to the `asChild` pattern noted above.

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/components/SystemWidget.tsx apps/desktop/src/components/app-shell.tsx
git commit -m "feat: implement SystemWidget with liquid glass design + morph tooltip"
```

---

## Task 5: Visual smoke test

No automated UI tests exist. Verify visually.

- [ ] **Step 1: Start dev servers**

Terminal 1 — Python server:
```bash
cd apps/server && uvicorn app.main:app --port 8765 --reload
```

Terminal 2 — Vite dev server:
```bash
cd apps/desktop && npm run dev
```

- [ ] **Step 2: Check widget renders in header**

1. Open `http://localhost:5173` in browser
2. Confirm the Claude widget appears in the top-right header (between RefreshButton and ThemeToggle)
3. Confirm it is **absent** when the server returns `rolling: null` (can test by temporarily making `_parse_rolling` always return `None`)

- [ ] **Step 3: Check battery fill behavior**

1. Hover over the widget — tooltip should appear with blur-morph entry
2. The battery bar should reflect the `percent` value from the API (fill level correct)
3. Battery bar should be green (0–69%), amber (70–89%), or red (≥90%) based on current usage

- [ ] **Step 4: Check tooltip content**

Confirm tooltip shows:
- Claude icon + "5-hr Window" header
- Horizontal progress bar matching battery fill color
- Token count in `X / Y tokens` format with tabular numbers
- Reset time in `HH:MM AM/PM` format
- Weekly section: "This week · N tok · $X.XX"

- [ ] **Step 5: Check dark mode**

Toggle dark mode in the app. Confirm:
- Widget button uses dark gradient (near-transparent pill)
- Tooltip panel uses dark glass (dark background with subtle white border)
- Text colors adjust appropriately

- [ ] **Step 6: Final commit if any fixups were needed**

```bash
git add -A && git commit -m "fix: visual polish on SystemWidget after smoke test"
```

Only commit if you made changes — skip if no fixups were needed.
