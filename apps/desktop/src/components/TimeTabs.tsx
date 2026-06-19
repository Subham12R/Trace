import React from 'react'
import { useDashboardStore } from '@/stores/dashboardStore'
import type { TimeRange } from '@/types/metrics'

const tabs: { key: TimeRange; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'all', label: 'All Time' },
]

export default function TimeTabs() {
  const { timeRange, setTimeRange } = useDashboardStore()

  return (
    <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => setTimeRange(tab.key)}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            timeRange === tab.key
              ? 'bg-foreground/10 text-foreground font-medium'
              : 'text-muted hover:text-foreground'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
