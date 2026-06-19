import React from 'react'
import type { MetricsSummary } from '@/types/metrics'

interface MetricCardProps {
  label: string
  value: string | number
  suffix?: string
}

function MetricCard({ label, value, suffix }: MetricCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center gap-1">
      <span className="text-muted text-xs uppercase tracking-wider">{label}</span>
      <span className="text-foreground text-2xl font-semibold">
        {value}
        {suffix && <span className="text-muted text-sm ml-0.5">{suffix}</span>}
      </span>
    </div>
  )
}

interface MetricGridProps {
  metrics: MetricsSummary | undefined
}

export default function MetricGrid({ metrics }: MetricGridProps) {
  if (!metrics) return null

  const cacheHitRate = metrics.cache_read_tokens + metrics.cache_write_tokens > 0
    ? Math.round(
        (metrics.cache_read_tokens / (metrics.cache_read_tokens + metrics.cache_write_tokens)) * 100
      )
    : 0

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      <MetricCard label="Cost" value={`$${metrics.total_cost.toFixed(2)}`} />
      <MetricCard label="Requests" value={metrics.total_requests} />
      <MetricCard label="Input Tokens" value={metrics.input_tokens.toLocaleString()} />
      <MetricCard label="Output Tokens" value={metrics.output_tokens.toLocaleString()} />
      <MetricCard label="Input Cache (Miss)" value={metrics.cache_write_tokens.toLocaleString()} />
      <MetricCard label="Input Cache (Hit)" value={metrics.cache_read_tokens.toLocaleString()} />
      <MetricCard label="Cache Hit Rate" value={`${cacheHitRate}%`} />
    </div>
  )
}
