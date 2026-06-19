import { create } from 'zustand'
import type { TimeRange, SourceView } from '@/types/metrics'

interface DashboardState {
  timeRange: TimeRange
  sourceView: SourceView
  autoRefresh: boolean
  showCost: boolean
  setTimeRange: (range: TimeRange) => void
  setSourceView: (view: SourceView) => void
  setAutoRefresh: (enabled: boolean) => void
  setShowCost: (show: boolean) => void
}

export const useDashboardStore = create<DashboardState>((set) => ({
  timeRange: 'today',
  sourceView: 'providers',
  autoRefresh: true,
  showCost: true,
  setTimeRange: (range) => set({ timeRange: range }),
  setSourceView: (view) => set({ sourceView: view }),
  setAutoRefresh: (enabled) => set({ autoRefresh: enabled }),
  setShowCost: (show) => set({ showCost: show }),
}))
