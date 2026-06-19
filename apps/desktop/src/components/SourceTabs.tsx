import React from 'react'
import { useDashboardStore } from '@/stores/dashboardStore'
import type { SourceView } from '@/types/metrics'

const tabs: { key: SourceView; label: string }[] = [
  { key: 'providers', label: 'By Provider' },
  { key: 'projects', label: 'By Project' },
  { key: 'sessions', label: 'By Session' },
]

export default function SourceTabs() {
  const { sourceView, setSourceView } = useDashboardStore()

  return (
    <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => setSourceView(tab.key)}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            sourceView === tab.key
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
