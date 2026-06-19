import React from 'react'
import type { ActiveSession } from '@/types/metrics'

interface ActiveIndicatorProps {
  sessions: ActiveSession[] | undefined
}

export default function ActiveIndicator({ sessions }: ActiveIndicatorProps) {
  if (!sessions || sessions.length === 0) return null

  return (
    <div className="flex items-center gap-3">
      {sessions.map((s) => (
        <div
          key={`${s.source}-${s.session_id}`}
          className="flex items-center gap-1.5 bg-card border border-border rounded-full px-3 py-1"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
          </span>
          <span className="text-xs text-foreground capitalize">{s.source}</span>
        </div>
      ))}
    </div>
  )
}
