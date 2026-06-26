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

#### Liquid glass button shell (LiquidButton-derived)

Outer wrapper — the gradient pill border:
```css
background: linear-gradient(180deg,
  rgb(245,245,245) 0%,
  rgba(101,104,111,0.39) 24%,
  rgba(255,255,255,0.75) 100%
);
box-shadow:
  inset 0px 4px 6.1px 0px rgba(255,255,255,0.23),
  2px 23px 14px 0px rgba(0,0,0,0.02),
  1px 10px 10px 0px rgba(0,0,0,0.03),
  0px 3px 6px 0px rgba(0,0,0,0.03);
border-radius: 9999px;   /* rounded-full */
padding: 2px;
```

Inner span — the frosted fill:
```css
background: rgba(255,255,255,0.6);
backdrop-filter: blur(8px);
border-radius: 9999px;
padding: 4px 8px;       /* tight, to stay compact */
```

Dark mode adaptation:
```css
/* outer */
background: linear-gradient(180deg,
  rgba(255,255,255,0.12) 0%,
  rgba(255,255,255,0.04) 24%,
  rgba(255,255,255,0.08) 100%
);
/* inner */
background: rgba(255,255,255,0.07);
```

#### Battery bar — morph fill animation

- **Icon:** `<img src="/logos/claude.svg" className="size-[18px]" />`
- Outer track: `w-1 h-5 rounded-full overflow-hidden` with `bg-black/10 dark:bg-white/10`
- Inner fill: framer-motion `<motion.div>` animated with spring:
  ```ts
  animate={{ scaleY: percent / 100 }}
  style={{ transformOrigin: "bottom" }}
  transition={{ type: "spring", stiffness: 120, damping: 20 }}
  ```
- Fill color thresholds (plain Tailwind class swap, not animated):
  - 0–69 %: `bg-emerald-400`
  - 70–89 %: `bg-amber-400`
  - ≥ 90 %: `bg-red-400`
- Renders `null` when `rolling` is null (OAuth creds missing — silent hide)

### Liquid glass tooltip (macOS-style)

Appears on hover, auto-positioned by `@base-ui/react/tooltip`.

#### Entry transition — blur-morph

The tooltip popup uses framer-motion `AnimatePresence` (or CSS `@keyframes`) for a morph-style entry:
```ts
initial:  { opacity: 0, scale: 0.92, filter: "blur(6px)" }
animate:  { opacity: 1, scale: 1,    filter: "blur(0px)" }
exit:     { opacity: 0, scale: 0.94, filter: "blur(4px)" }
transition: { type: "spring", stiffness: 300, damping: 28 }
```
> Note: `@base-ui/react/tooltip` renders via portal — apply these classes to the `TooltipContent` wrapper div inside the popup, not to the portal itself.

#### Visual treatment

Outer panel — same liquid glass shell as the button:
```css
background: linear-gradient(160deg,
  rgba(255,255,255,0.72) 0%,
  rgba(255,255,255,0.48) 100%
);
backdrop-filter: blur(20px) saturate(180%);
border: 1px solid rgba(255,255,255,0.5);
box-shadow:
  inset 0px 1px 0px rgba(255,255,255,0.6),
  0px 8px 32px rgba(0,0,0,0.08),
  0px 2px 8px rgba(0,0,0,0.04);
border-radius: 16px;   /* rounded-2xl */
```

Dark mode:
```css
background: linear-gradient(160deg,
  rgba(30,30,35,0.82) 0%,
  rgba(20,20,25,0.72) 100%
);
border: 1px solid rgba(255,255,255,0.10);
box-shadow:
  inset 0px 1px 0px rgba(255,255,255,0.06),
  0px 8px 32px rgba(0,0,0,0.40);
```

#### Content layout (240px wide, `px-4 py-3`)

```
┌────────────────────────────────────────┐
│ [◎]  5-hr Window                       │  ← icon + label (xs semibold, text-shadow)
│                                        │
│  ████████████░░░░  82%                 │  ← h-1.5 rounded-full bar + pct
│  4,100 / 5,000 tokens                  │  ← xs muted (text-foreground/55)
│  Resets 3:45 PM                        │  ← xs muted
│  ──────────────────────────────────    │  ← rgba(0,0,0,0.08) divider
│  This week   23,400 tok  ·  $1.20      │  ← xs
└────────────────────────────────────────┘
```

- All numbers: `tabular-nums`
- Label text: `text-shadow: 0px 1px 0px rgba(255,255,255,0.46)` (matches LiquidButton)
- Progress bar track: `bg-black/10 dark:bg-white/10`; fill uses same color thresholds as battery
- Divider: inline style `borderColor: rgba(0,0,0,0.08)` / dark `rgba(255,255,255,0.08)`

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

1. **Rolling:** Call `fetch_claude_oauth_usage()`. The raw JSON shape from `https://api.anthropic.com/api/oauth/usage` is not documented internally — parse defensively by inspecting the actual response at implementation time and extracting `used`, `limit`, `percent`, `reset_at` with safe fallbacks. Return `rolling = None` if the call fails, returns unexpected shape, or creds are absent.
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
| `apps/desktop/src/components/ui/LiquidButton.tsx` | New shared component (from provided snippet) |
| `apps/desktop/src/hooks/useMetrics.ts` | Add `useClaudeUsage` + `ClaudeUsage` type |
| `apps/server/app/api/system.py` | Add `GET /usage` endpoint |

**No changes to:** `app-shell.tsx`, `main.ts`, or any other file.

**Dependencies already present:** `framer-motion` (used elsewhere in the app — no new package needed).

---

## Constraints

- Widget hides silently when OAuth creds absent (`null` rolling → `return null`)
- Tooltip only renders when data is available (no loading states shown)
- Liquid glass uses inline `style` props for gradient/shadow (Tailwind can't express multi-stop inline gradients with dynamic opacity); structural layout still uses Tailwind
- Battery fill uses framer-motion spring (`stiffness: 120, damping: 20`) on `scaleY` with `transformOrigin: "bottom"`
- Tooltip entry uses blur-morph spring (`stiffness: 300, damping: 28`) — applied to content wrapper inside the `@base-ui` portal
- `LiquidButton` is a standalone component in `ui/` for potential reuse; `SystemWidget` uses it as the trigger
- Weekly boundary: Monday 00:00 UTC (matches Trace's existing `range=week` logic)
