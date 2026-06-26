# Claude Usage Widget — Design Spec
**Date:** 2026-06-26
**Status:** Approved

---

## Goal

Add a compact Claude usage widget to the app header that shows the 5-hour rolling window utilization at a glance (battery bar) and detailed stats on hover (glass tooltip). Data is sourced from Claude Code's existing OAuth credentials — no new auth required.

---

## Scope

| In scope | Out of scope |
|---|---|
| `SystemWidget.tsx` rewrite | Electron tray changes |
| `/api/system/usage` endpoint | New auth/credential flows |
| Glass tooltip with rolling + weekly + reset | Per-model breakdown |
| Battery bar (color-coded) | Settings for custom limits |

---

## UI Design

### Header widget (button, ~44px wide × 36px tall)

```
┌──────────────┐
│  [◎][║]      │   ◎ = Claude SVG (18px)
│              │   ║ = battery bar, flush right of icon, no gap
└──────────────┘
```

- **Layout:** `flex items-center gap-1.5` — icon on left, bar immediately right
- **Icon:** `<img src="/logos/claude.svg" className="size-[18px]" />`
- **Battery bar:** 4px wide × 20px tall vertical pill
  - Outer track: `w-1 h-5 rounded-full bg-white/10 dark:bg-white/5 overflow-hidden`
  - Inner fill: `w-full rounded-full origin-bottom transition-transform duration-500`
    - Animated via `scaleY(percent / 100)` with `transform-origin: bottom`
  - Fill color thresholds:
    - 0–69 %: `bg-emerald-400`
    - 70–89 %: `bg-amber-400`
    - ≥ 90 %: `bg-red-400`
- **Button shell:** `rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors flex items-center gap-1.5 px-2`
- Renders `null` when `rolling` is null (OAuth creds missing — silent hide)

### Glass tooltip (macOS frosted-glass style)

Appears on hover, auto-positioned by `@base-ui/react/tooltip`.

**Visual treatment:**
```
backdrop-blur-xl
bg-white/70 dark:bg-zinc-900/70
border border-white/30 dark:border-white/10
shadow-xl shadow-black/10 dark:shadow-black/40
rounded-2xl px-4 py-3 w-60
```

**Layout:**
```
┌────────────────────────────────────────┐
│ [◎]  5-hr Window                       │  ← icon + label (xs semibold)
│                                        │
│  ████████████░░░░  82%                 │  ← h-1.5 progress bar + pct
│  4,100 / 5,000 tokens                  │  ← xs muted
│  Resets 3:45 PM                        │  ← xs muted
│  ──────────────────────────────────    │  ← divider
│  This week   23,400 tok  ·  $1.20      │  ← xs
└────────────────────────────────────────┘
```

- All numbers: `tabular-nums`
- Muted text: `text-foreground/60`
- Progress bar fill color matches battery thresholds
- Divider: `border-t border-white/20 dark:border-white/10 my-2`

---

## Data

### Type + hook (added to `useMetrics.ts`)

```ts
export interface ClaudeUsage {
  rolling: {
    used: number       // tokens used in current 5-hr window
    limit: number      // window token limit
    percent: number    // 0–100
    reset_at: string   // ISO 8601
  } | null             // null = no OAuth creds found
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

### Python endpoint (`apps/server/app/api/system.py`)

`GET /usage`:

1. **Rolling:** Call `fetch_claude_oauth_usage()`. Parse response to extract `used`, `limit`, `percent`, `reset_at`. Return `null` rolling if call fails or creds absent.
2. **Weekly:** Query `requests` table:
   ```sql
   SELECT SUM(input_tokens + output_tokens), SUM(cost)
   FROM requests
   WHERE source IN ('claude', 'claude-code', 'claude-cloud')
     AND timestamp >= <Monday 00:00 UTC of current week>
   ```

**Response models:**
```python
class RollingUsage(BaseModel):
    used: int
    limit: int
    percent: float
    reset_at: str

class WeeklyUsage(BaseModel):
    tokens: int
    cost: float

class ClaudeUsageResponse(BaseModel):
    rolling: RollingUsage | None
    weekly: WeeklyUsage
```

---

## Component Structure

### `SystemWidget.tsx` — full rewrite

```
SystemWidget(className?)
  → if no data.rolling: return null
  └─ TooltipProvider
       └─ Tooltip
            ├─ TooltipTrigger (asChild)
            │    └─ <button className={cn(buttonStyles, className)}>
            │         ├─ <img> claude.svg
            │         └─ <BatteryBar percent={data.rolling.percent} />
            └─ TooltipContent (glass classes, side="bottom")
                 ├─ RollingSection (used, limit, percent, reset_at)
                 └─ WeeklySection (tokens, cost)
```

- `BatteryBar`: presentational only, no state
- Uses `@/components/ui/tooltip` (existing) — no new tooltip lib
- Uses `@/lib/utils` `cn` — removes inline duplicate from broken file
- No internal `motion` wrapper — parent `motion.div` in `app-shell.tsx` handles animation

---

## Files Changed

| File | Change |
|---|---|
| `apps/desktop/src/components/SystemWidget.tsx` | Complete rewrite |
| `apps/desktop/src/hooks/useMetrics.ts` | Add `useClaudeUsage` + `ClaudeUsage` type |
| `apps/server/app/api/system.py` | Add `GET /usage` endpoint |

**No changes to:** `app-shell.tsx`, `main.ts`, or any other file.

---

## Constraints

- Widget hides silently when OAuth creds absent (`null` rolling → `return null`)
- Tooltip only renders when data is available (no loading states shown)
- Glass uses only Tailwind utilities — `backdrop-blur-xl`, `bg-white/70`, etc.
- Battery fill animates via CSS `scaleY` + `transform-origin: bottom`
- Weekly boundary: Monday 00:00 UTC (matches Trace's existing `range=week` logic)
