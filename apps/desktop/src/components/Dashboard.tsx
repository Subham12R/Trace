import { useDashboardStore } from "@/stores/dashboardStore";
import { useMetrics, useTrends, useSessions, useActiveSessions } from "@/hooks/useMetrics";
import { Card, CardContent } from "@/components/ui/card";
import { TimeTabs } from "@/components/TimeTabs";
import { SourceTabs } from "@/components/SourceTabs";
import { UsageBarChart } from "@/components/UsageBarChart";
import { SessionTable } from "@/components/SessionTable";
import { ActiveIndicator } from "@/components/ActiveIndicator";
import { WelcomeBanner } from "@/components/WelcomeBanner";
import { Button } from "@/components/ui/button";
import { RefreshCw, DollarSign, Hash } from "lucide-react";

export function Dashboard() {
	const { timeRange, sourceView, autoRefresh, showCost, setAutoRefresh, setShowCost } =
		useDashboardStore();

	const { data: metrics, isLoading: metricsLoading } = useMetrics(timeRange);
	const { data: trends } = useTrends(timeRange, showCost);
	const { data: sessions } = useSessions(timeRange, sourceView);
	const { data: activeSessions } = useActiveSessions();

	return (
		<div className="flex flex-col gap-6">
			{/* Welcome Banner */}
			<WelcomeBanner />

			{/* Controls */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<TimeTabs />
					<ActiveIndicator sessions={activeSessions} />
				</div>
				<div className="flex items-center gap-2">
					<Button
						size="sm"
						variant={showCost ? "default" : "outline"}
						onClick={() => setShowCost(!showCost)}
						className="gap-1.5"
					>
						{showCost ? <DollarSign className="size-3.5" /> : <Hash className="size-3.5" />}
						{showCost ? "Cost" : "Tokens"}
					</Button>
					<Button
						size="sm"
						variant={autoRefresh ? "default" : "outline"}
						onClick={() => setAutoRefresh(!autoRefresh)}
						className="gap-1.5"
					>
						<RefreshCw className={`size-3.5 ${autoRefresh ? "animate-spin" : ""}`} />
						Auto
					</Button>
				</div>
			</div>

			{/* KPI Cards */}
			{metricsLoading && !metrics ? (
				<div className="text-muted-foreground text-sm">Loading metrics...</div>
			) : (
				<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
					<Card>
						<CardContent className="p-4 flex flex-col items-center justify-center gap-1">
							<div className="text-muted-foreground text-xs uppercase tracking-wider">Cost</div>
							<div className="text-2xl font-semibold text-foreground">${metrics?.total_cost.toFixed(2)}</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="p-4 flex flex-col items-center justify-center gap-1">
							<div className="text-muted-foreground text-xs uppercase tracking-wider">Requests</div>
							<div className="text-2xl font-semibold text-foreground">{metrics?.total_requests}</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="p-4 flex flex-col items-center justify-center gap-1">
							<div className="text-muted-foreground text-xs uppercase tracking-wider">Input</div>
							<div className="text-2xl font-semibold text-foreground">{metrics?.input_tokens.toLocaleString()}</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="p-4 flex flex-col items-center justify-center gap-1">
							<div className="text-muted-foreground text-xs uppercase tracking-wider">Output</div>
							<div className="text-2xl font-semibold text-foreground">{metrics?.output_tokens.toLocaleString()}</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="p-4 flex flex-col items-center justify-center gap-1">
							<div className="text-muted-foreground text-xs uppercase tracking-wider">Cache Miss</div>
							<div className="text-2xl font-semibold text-foreground">{metrics?.cache_write_tokens.toLocaleString()}</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="p-4 flex flex-col items-center justify-center gap-1">
							<div className="text-muted-foreground text-xs uppercase tracking-wider">Cache Hit</div>
							<div className="text-2xl font-semibold text-foreground">{metrics?.cache_read_tokens.toLocaleString()}</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="p-4 flex flex-col items-center justify-center gap-1">
							<div className="text-muted-foreground text-xs uppercase tracking-wider">Hit Rate</div>
							<div className="text-2xl font-semibold text-foreground">{metrics?.cache_hit_rate}%</div>
						</CardContent>
					</Card>
				</div>
			)}

			{/* Bar Chart */}
			<UsageBarChart data={trends} showCost={showCost} />

			{/* Source Tabs + Table */}
			<div className="flex flex-col gap-4">
				<SourceTabs />
				<SessionTable data={sessions} />
			</div>
		</div>
	);
}
