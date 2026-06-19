import { useDashboardStore } from "@/stores/dashboardStore";
import { useTrends, useSessions } from "@/hooks/useMetrics";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";
import { cn } from "@/lib/utils";
import { getProviderColor } from "@/lib/colors";

export function ActivityPage() {
	const { timeRange, setTimeRange, showCost } = useDashboardStore();
	const { data: trends } = useTrends(timeRange, showCost);
	const { data: sessions } = useSessions(timeRange, "sessions");

	const sessionData = sessions?.slice(0, 20).map((s) => ({
		name: s.session_id.slice(0, 10) + "...",
		tokens: s.input_tokens + s.output_tokens,
		cost: Math.round(s.cost * 100) / 100,
	})) || [];

	const sources = Array.from(new Set(trends?.map((t) => t.source) || []));

	return (
		<div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-xl sm:text-2xl font-semibold text-[var(--app-ink)]">Activity</h1>
					<p className="text-sm text-[var(--app-muted)] mt-1">Track your token usage and session activity</p>
				</div>
			</div>

			<div className="flex gap-1 mb-6 lg:mb-8 bg-[var(--app-soft)] border border-[var(--app-hairline)] p-1 rounded-[12px] w-fit overflow-x-auto">
				{(["today", "week", "month", "all"] as const).map((range) => (
					<button
						key={range}
						onClick={() => setTimeRange(range)}
						className={cn(
							"px-4 py-1.5 text-sm rounded-[10px] font-medium transition-colors whitespace-nowrap",
							timeRange === range ? "bg-[var(--app-canvas)] text-[var(--app-ink)] shadow-sm" : "text-[var(--app-muted)]"
						)}
					>
						{range === "today" && "Today"}
						{range === "week" && "This Week"}
						{range === "month" && "This Month"}
						{range === "all" && "All Time"}
					</button>
				))}
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div className="bg-[var(--app-soft)] rounded-[14px] border-2 border-[var(--app-hairline)] p-4 sm:p-6 card-depth">
					<h3 className="text-base sm:text-lg font-semibold text-[var(--app-ink)] mb-4">Token Usage Trends</h3>
					<div className="h-56 sm:h-64">
						<ResponsiveContainer width="100%" height="100%">
							<AreaChart data={trends || []}>
								<defs>
									{sources.map((source, i) => {
										const color = getProviderColor(source, i);
										return (
											<linearGradient key={source} id={`grad-${source}`} x1="0" y1="0" x2="0" y2="1">
												<stop offset="5%" stopColor={color} stopOpacity={0.15} />
												<stop offset="95%" stopColor={color} stopOpacity={0} />
											</linearGradient>
										);
									})}
								</defs>
								<CartesianGrid stroke="var(--app-hairline)" vertical={false} />
								<XAxis dataKey="bucket" tick={{ fill: "var(--app-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
								<YAxis tick={{ fill: "var(--app-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
								<Tooltip
									contentStyle={{
										backgroundColor: "var(--app-canvas)",
										border: "1px solid var(--app-hairline)",
										borderRadius: "8px",
										boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
										padding: "12px",
									}}
									itemStyle={{ color: "var(--app-ink)", fontSize: "13px" }}
									labelStyle={{ color: "var(--app-muted)", fontSize: "12px", marginBottom: "4px" }}
								/>
								<Legend wrapperStyle={{ paddingTop: "16px" }} iconType="circle" iconSize={8} />
								{sources.map((source, i) => (
									<Area
										key={source}
										type="monotone"
										dataKey={source}
										stroke={getProviderColor(source, i)}
										fill={`url(#grad-${source})`}
										strokeWidth={2}
										dot={false}
										activeDot={{ r: 4 }}
									/>
								))}
							</AreaChart>
						</ResponsiveContainer>
					</div>
				</div>

				<div className="bg-[var(--app-soft)] rounded-[14px] border-2 border-[var(--app-hairline)] p-4 sm:p-6 card-depth">
					<h3 className="text-base sm:text-lg font-semibold text-[var(--app-ink)] mb-4">Session Activity</h3>
					<div className="h-56 sm:h-64">
						<ResponsiveContainer width="100%" height="100%">
							<LineChart data={sessionData}>
								<CartesianGrid stroke="var(--app-hairline)" vertical={false} />
								<XAxis dataKey="name" tick={{ fill: "var(--app-muted)", fontSize: 10 }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" height={50} />
								<YAxis tick={{ fill: "var(--app-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
								<Tooltip
									contentStyle={{
										backgroundColor: "var(--app-canvas)",
										border: "1px solid var(--app-hairline)",
										borderRadius: "8px",
										boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
										padding: "12px",
									}}
									itemStyle={{ color: "var(--app-ink)", fontSize: "13px" }}
									labelStyle={{ color: "var(--app-muted)", fontSize: "12px", marginBottom: "4px" }}
								/>
								<Line type="monotone" dataKey="tokens" stroke="#8b7355" strokeWidth={2} dot={{ r: 3, fill: "#8b7355" }} activeDot={{ r: 5 }} />
								<Line type="monotone" dataKey="cost" stroke="#6b8e6b" strokeWidth={2} dot={{ r: 3, fill: "#6b8e6b" }} activeDot={{ r: 5 }} />
								<Legend />
							</LineChart>
						</ResponsiveContainer>
					</div>
				</div>
			</div>

			<div className="mt-6 bg-[var(--app-soft)] rounded-[14px] border-2 border-[var(--app-hairline)] overflow-hidden card-depth">
				<div className="px-6 py-4 border-b border-[var(--app-hairline)]">
					<h3 className="text-base sm:text-lg font-semibold text-[var(--app-ink)]">Recent Sessions</h3>
				</div>
				<div className="divide-y divide-[var(--app-hairline)] bg-[var(--app-canvas)]">
					{sessions?.slice(0, 10).map((session) => (
						<div key={session.session_id} className="px-6 py-3 flex items-center justify-between hover:bg-[var(--app-soft)] transition-colors">
							<div className="flex items-center gap-3">
								<span className="text-sm font-medium text-[var(--app-ink)] capitalize">{session.source}</span>
								<span className="text-xs text-[var(--app-muted)] font-mono">{session.session_id.slice(0, 16)}...</span>
							</div>
							<div className="flex items-center gap-6 text-sm">
								<span className="text-[var(--app-muted)]">{session.request_count} reqs</span>
								<span className="text-[var(--app-muted)]">{(session.input_tokens + session.output_tokens).toLocaleString()} tokens</span>
								<span className="text-[#8b7355] font-medium">${session.cost.toFixed(2)}</span>
							</div>
						</div>
					)) || (
						<div className="px-6 py-8 text-center text-sm text-[var(--app-muted)]">No sessions found for this time range</div>
					)}
				</div>
			</div>
		</div>
	);
}
