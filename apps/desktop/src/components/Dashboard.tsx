import { useDashboardStore } from '@/stores/dashboardStore'
import { useMetrics, useTrends, useSessions, useActiveSessions } from '@/hooks/useMetrics'
import MetricGrid from '@/components/MetricCard'
import TimeTabs from '@/components/TimeTabs'
import SourceTabs from '@/components/SourceTabs'
import UsageBarChart from '@/components/UsageBarChart'
import SessionTable from '@/components/SessionTable'
import ActiveIndicator from '@/components/ActiveIndicator'
import { RefreshCw, DollarSign, Hash } from 'lucide-react'

export default function Dashboard() {
  const { timeRange, sourceView, autoRefresh, showCost, setAutoRefresh, setShowCost } =
    useDashboardStore()

  const { data: metrics, isLoading: metricsLoading } = useMetrics(timeRange)
  const { data: trends } = useTrends(timeRange, showCost)
  const { data: sessions } = useSessions(timeRange, sourceView)
  const { data: activeSessions } = useActiveSessions()

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-foreground">Trace</h1>
          <ActiveIndicator sessions={activeSessions} />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCost(!showCost)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
              showCost
                ? 'bg-accent/10 border-accent text-accent'
                : 'bg-card border-border text-muted hover:text-foreground'
            }`}
          >
            {showCost ? <DollarSign size={14} /> : <Hash size={14} />}
            {showCost ? 'Dollars' : 'Tokens'}
          </button>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
              autoRefresh
                ? 'bg-accent/10 border-accent text-accent'
                : 'bg-card border-border text-muted hover:text-foreground'
            }`}
          >
            <RefreshCw size={14} className={autoRefresh ? 'animate-spin' : ''} />
            Auto Refresh
          </button>
        </div>
      </div>

      {/* Time Tabs */}
      <div className="mb-4">
        <TimeTabs />
      </div>

      {/* KPI Cards */}
      <div className="mb-6">
        {metricsLoading && !metrics ? (
          <div className="text-muted text-sm">Loading metrics...</div>
        ) : (
          <MetricGrid metrics={metrics} />
        )}
      </div>

      {/* Bar Chart */}
      <div className="mb-6">
        <UsageBarChart data={trends} showCost={showCost} />
      </div>

      {/* Source Tabs + Table */}
      <div className="mb-4">
        <SourceTabs />
      </div>
      <SessionTable data={sessions} />
    </div>
  )
}
