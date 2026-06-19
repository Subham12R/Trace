import { useDashboardStore } from "@/stores/dashboardStore";
import { useMetrics, useProviders, useSessions, useTrends } from "@/hooks/useMetrics";
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { ProviderLogo } from "./ProviderLogo";
import { RefreshButton } from "./RefreshButton";
import { getProviderColor } from "@/lib/colors";

export function ProviderAnalysisPage() {
	const { timeRange, setTimeRange } = useDashboardStore();
	const { data: metrics } = useMetrics(timeRange);
	const { data: providers } = useProviders();
	const { data: providerSessions } = useSessions(timeRange, "providers");
	const { data: trends } = useTrends(timeRange, false);

	const detectedProviders = providers?.filter((p) => p.installed) || [];

	const chartData =
		providerSessions?.map((s) => ({
			name: s.source.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
			source: s.source,
			tokens: s.input_tokens + s.output_tokens,
			cost: s.cost,
			requests: s.request_count,
		})) || [];

	const trendsBySource =
		trends?.reduce((acc, point) => {
			if (!acc[point.source]) acc[point.source] = [];
			acc[point.source].push(point);
			return acc;
		}, {} as Record<string, typeof trends>) || {};

	const providerById = (id: string) => providers?.find((p) => p.id === id);
	const maxTokens = Math.max(...chartData.map((d) => d.tokens), 1);

	return (
		<div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
				<div>
					<h1 className="text-xl sm:text-2xl font-semibold text-[var(--app-ink)]">Provider Analysis</h1>
					<p className="text-sm text-[var(--app-muted)] mt-1">Usage breakdown per provider</p>
				</div>
				<RefreshButton />
			</div>

			{/* Range tabs */}
			<div className="flex gap-1 mb-6 lg:mb-8 bg-[var(--app-soft)] border border-[var(--app-hairline)] p-1 rounded-[12px] w-fit overflow-x-auto">
				{"today week month all".split(" ").map((range) => (
					<button
						key={range}
						onClick={() => setTimeRange(range as any)}
						className={cn(
							"px-4 py-1.5 text-sm rounded-[10px] font-medium transition-colors",
							timeRange === range ? "bg-[var(--app-canvas)] text-[var(--app-ink)] shadow-sm" : "text-[var(--app-muted)]"
						)}
					>
						{range === "today" && "Today"}
						{range === "week" && "Week"}
						{range === "month" && "Month"}
						{range === "all" && "All Time"}
					</button>
				))}
			</div>

			{/* Summary */}
			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 lg:mb-8">
				<div className="bg-[var(--app-soft)] rounded-[14px] border-2 border-[var(--app-hairline)] p-4 sm:p-5 card-depth">
					<p className="text-[10px] sm:text-xs font-medium text-[var(--app-muted)] uppercase tracking-wide">Providers</p>
					<p className="text-xl sm:text-2xl font-semibold text-[var(--app-ink)] mt-2">{detectedProviders.length}</p>
				</div>
				<div className="bg-[var(--app-soft)] rounded-[14px] border-2 border-[var(--app-hairline)] p-4 sm:p-5 card-depth">
					<p className="text-[10px] sm:text-xs font-medium text-[var(--app-muted)] uppercase tracking-wide">Messages</p>
					<p className="text-xl sm:text-2xl font-semibold text-[var(--app-ink)] mt-2">{metrics?.total_requests || 0}</p>
				</div>
				<div className="bg-[var(--app-soft)] rounded-[14px] border-2 border-[var(--app-hairline)] p-4 sm:p-5 card-depth">
					<p className="text-[10px] sm:text-xs font-medium text-[var(--app-muted)] uppercase tracking-wide">Input Tokens</p>
					<p className="text-xl sm:text-2xl font-semibold text-[var(--app-ink)] mt-2">{(metrics?.input_tokens || 0).toLocaleString()}</p>
				</div>
				<div className="bg-[var(--app-soft)] rounded-[14px] border-2 border-[var(--app-hairline)] p-4 sm:p-5 card-depth">
					<p className="text-[10px] sm:text-xs font-medium text-[var(--app-muted)] uppercase tracking-wide">Output Tokens</p>
					<p className="text-xl sm:text-2xl font-semibold text-[var(--app-ink)] mt-2">{(metrics?.output_tokens || 0).toLocaleString()}</p>
				</div>
				<div className="bg-[var(--app-soft)] rounded-[14px] border-2 border-[var(--app-hairline)] p-4 sm:p-5 card-depth">
					<p className="text-[10px] sm:text-xs font-medium text-[var(--app-muted)] uppercase tracking-wide">Cache Hit Rate</p>
					<p className="text-xl sm:text-2xl font-semibold text-[var(--app-ink)] mt-2">{metrics?.cache_hit_rate?.toFixed(0) || 0}%</p>
				</div>
			</div>

			{/* Provider Bar Chart */}
			<div className="bg-[var(--app-soft)] rounded-[14px] border-2 border-[var(--app-hairline)] p-4 sm:p-6 mb-6 lg:mb-8 card-depth">
				<h2 className="text-base sm:text-lg font-semibold text-[var(--app-ink)] mb-4">Tokens by Provider</h2>
				<div className="h-56 sm:h-64">
					{chartData.length > 0 ? (
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 24 }}>
								<CartesianGrid stroke="var(--app-hairline)" horizontal={false} />
								<XAxis type="number" hide />
								<YAxis
									dataKey="name"
									type="category"
									width={120}
									tick={{ fill: "var(--app-ink)", fontSize: 12 }}
									tickLine={false}
									axisLine={false}
								/>
								<Tooltip
									contentStyle={{
										backgroundColor: "var(--app-canvas)",
										border: "1px solid var(--app-hairline)",
										borderRadius: "8px",
									}}
									itemStyle={{
										color: "var(--app-ink)",
									}}
									labelStyle={{
										color: "var(--app-muted)",
									}}
								/>
								<Bar dataKey="tokens" radius={[0, 4, 4, 0]} barSize={24}>
									{chartData.map((entry, index) => (
										<Cell key={`cell-${index}`} fill={getProviderColor(entry.source, index)} />
									))}
								</Bar>
							</BarChart>
						</ResponsiveContainer>
					) : (
						<div className="flex items-center justify-center h-full text-sm text-[var(--app-muted)]">
							No provider data for this range
						</div>
					)}
				</div>
			</div>

			{/* Provider list with logos */}
			<div className="bg-[var(--app-soft)] rounded-[14px] border-2 border-[var(--app-hairline)] p-4 sm:p-6 mb-6 lg:mb-8 card-depth">
				<h2 className="text-base sm:text-lg font-semibold text-[var(--app-ink)] mb-4">Provider Breakdown</h2>
				<div className="space-y-4">
					{providerSessions
						?.sort((a, b) => b.input_tokens + b.output_tokens - (a.input_tokens + a.output_tokens))
						.map((s) => {
							const provider = providerById(s.source);
							const pct = ((s.input_tokens + s.output_tokens) / maxTokens) * 100;
							return (
								<div key={s.source} className="flex items-center gap-3 sm:gap-4">
									{provider && <ProviderLogo provider={provider} size="md" />}
									<div className="flex-1 min-w-0">
										<div className="flex items-center justify-between mb-1.5">
											<span className="text-sm font-medium text-[var(--app-ink)] capitalize truncate">{s.source}</span>
											<span className="text-xs text-[var(--app-muted)] whitespace-nowrap">
												{((s.input_tokens + s.output_tokens) / 1000).toFixed(1)}k tokens
											</span>
										</div>
										<div className="h-2 bg-[var(--app-canvas)] rounded-full overflow-hidden border border-[var(--app-hairline)]">
											<div
												className="h-full rounded-full transition-all"
												style={{ width: `${pct}%`, backgroundColor: getProviderColor(s.source) }}
											/>
										</div>
									</div>
								</div>
							);
						})}
					{(!providerSessions || providerSessions.length === 0) && (
						<p className="text-sm text-[var(--app-muted)]">No provider data for this range.</p>
					)}
				</div>
			</div>

			{/* Per-provider cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
				{providerSessions
					?.sort((a, b) => b.input_tokens + b.output_tokens - (a.input_tokens + a.output_tokens))
					.map((s) => {
						const providerTrends = trendsBySource[s.source] || [];
						const latest = providerTrends[providerTrends.length - 1];
						const provider = providerById(s.source);
						return (
							<div key={s.source} className="bg-[var(--app-soft)] rounded-[14px] border-2 border-[var(--app-hairline)] p-4 sm:p-5 card-depth">
								<div className="flex items-center justify-between mb-4">
									<div className="flex items-center gap-3">
										{provider && <ProviderLogo provider={provider} size="md" />}
										<h3 className="text-base font-semibold text-[var(--app-ink)] capitalize">{s.source}</h3>
									</div>
									<span className="text-xs text-[var(--app-muted)]">{latest?.bucket || ""}</span>
								</div>
								<div className="space-y-3">
									<div className="flex items-center justify-between">
										<span className="text-sm text-[var(--app-muted)]">Messages</span>
										<span className="text-sm font-medium text-[var(--app-ink)]">{s.request_count.toLocaleString()}</span>
									</div>
									<div className="flex items-center justify-between">
										<span className="text-sm text-[var(--app-muted)]">Tokens</span>
										<span className="text-sm font-medium text-[var(--app-ink)]">
											{((s.input_tokens + s.output_tokens) / 1000).toFixed(1)}k
										</span>
									</div>
									<div className="flex items-center justify-between">
										<span className="text-sm text-[var(--app-muted)]">Cost</span>
										<span className="text-sm font-medium text-[var(--app-ink)]">${s.cost.toFixed(2)}</span>
									</div>
								</div>
							</div>
						);
					})}
			</div>
		</div>
	);
}
