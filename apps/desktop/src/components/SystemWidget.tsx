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
            {weekly.tokens.toLocaleString()} tok&nbsp;·&nbsp;{fmtCost(weekly.cost)}
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
    <TooltipPrimitive.Provider delay={300}>
      <TooltipPrimitive.Root open={open} onOpenChange={(val) => setOpen(val)}>
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
