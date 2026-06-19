import { useDashboardStore } from "@/stores/dashboardStore";
import { useTrends, useSessions } from "@/hooks/useMetrics";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";
import { cn } from "@/lib/utils";

export function ActivityPage() {
	const { timeRange, setTimeRange, showCost, setShowCost } = useDashboardStore();
	const { data: trends } = useTrends(timeRange, showCost);
	const { data: sessions } = useSessions(timeRange, "sessions");

	const sessionData = sessions?.slice(0, 20).map((s) => ({
		name: s.session_id.slice(0, 10) + "...",
		tokens: s.input_tokens + s.output_tokens,
		cost: Math.round(s.cost * 100) / 100,
	})) || [];

	const colors = ["#8b7355", "#a08060", "#6b8e6b", "#b89a7a", "#7a9a9a", "#c4a882"];
	const sources = Array.from(new Set(trends?.map((t) => t.source) || []));

	return (
		<div className="p-8 max-w-6xl">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="font-serif text-2xl font-semibold text-[#2d2a26]">Activity</h1>
					<p className="text-sm text-[#6b6560] mt-1">Track your token usage and session activity</p>
				</div>
				<button
					onClick={() => setShowCost(!showCost)}
					className={cn(
						"px-3 py-1.5 text-xs rounded-lg font-medium transition-colors",
						showCost ? "bg-[#8b7355] text-white" : "bg-[#e8e4df] text-[#6b6560]"
					)}
				>
					{showCost ? "Cost ($)" : "Tokens"}
				</button>
			</div>

			<div className="flex gap-1 mb-8 bg-[#f0ece6] p-1 rounded-lg w-fit">
				{(["today", "week", "month", "all"] as const).map((range) => (
					<button
						key={range}
						onClick={() => setTimeRange(range)}
						className={cn(
							"px-4 py-1.5 text-sm rounded-md font-medium transition-colors",
							timeRange === range ? "bg-white text-[#2d2a26] shadow-sm" : "text-[#6b6560]"
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
				<div className="bg-white rounded-xl border border-[#e8e4df] p-6">
					<h3 className="font-serif text-lg font-semibold text-[#2d2a26] mb-6">Token Usage Trends</h3>
					<ResponsiveContainer width="100%" height={300}>
						<AreaChart data={trends || []}>
							<defs>
								<linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
									<stop offset="5%" stopColor="#8b7355" stopOpacity={0.08} />
									<stop offset="95%" stopColor="#8b7355" stopOpacity={0} />
								</linearGradient>
							</defs>
							<CartesianGrid strokeDasharray="3 3" stroke="#f0ece6" vertical={false} />
							<XAxis dataKey="bucket" tick={{ fill: "#6b6560", fontSize: 12 }} axisLine={false} tickLine={false} />
							<YAxis tick={{ fill: "#6b6560", fontSize: 12 }} axisLine={false} tickLine={false} />
							<Tooltip
								contentStyle={{ backgroundColor: "#fff", border: "1px solid #e8e4df", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", padding: "12px" }}
								itemStyle={{ color: "#2d2a26", fontSize: "13px" }}
								labelStyle={{ color: "#6b6560", fontSize: "12px", marginBottom: "4px" }}
							/>
							<Legend wrapperStyle={{ paddingTop: "16px" }} iconType="circle" iconSize={8} />
							{sources.map((source, i) => (
								<Area key={source} type="monotone" dataKey={source} stroke={colors[i % colors.length]} fill={i === 0 ? "url(#grad)" : "transparent"} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
							))}
						</AreaChart>
					</ResponsiveContainer>
				</div>

				<div className="bg-white rounded-xl border border-[#e8e4df] p-6">
					<h3 className="font-serif text-lg font-semibold text-[#2d2a26] mb-6">Session Activity</h3>
					<ResponsiveContainer width="100%" height={300}>
						<LineChart data={sessionData}>
							<CartesianGrid strokeDasharray="3 3" stroke="#f0ece6" vertical={false} />
							<XAxis dataKey="name" tick={{ fill: "#6b6560", fontSize: 10 }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" height={50} />
							<YAxis tick={{ fill: "#6b6560", fontSize: 12 }} axisLine={false} tickLine={false} />
							<Tooltip
								contentStyle={{ backgroundColor: "#fff", border: "1px solid #e8e4df", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", padding: "12px" }}
								itemStyle={{ color: "#2d2a26", fontSize: "13px" }}
							/>
							<Line type="monotone" dataKey="tokens" stroke="#8b7355" strokeWidth={2} dot={{ r: 3, fill: "#8b7355" }} activeDot={{ r: 5 }} />
							<Line type="monotone" dataKey="cost" stroke="#6b8e6b" strokeWidth={2} dot={{ r: 3, fill: "#6b8e6b" }} activeDot={{ r: 5 }} />
							<Legend />
						</LineChart>
					</ResponsiveContainer>
				</div>
			</div>

			<div className="mt-6 bg-white rounded-xl border border-[#e8e4df] overflow-hidden">
				<div className="px-6 py-4 border-b border-[#e8e4df]">
					<h3 className="font-serif text-lg font-semibold text-[#2d2a26]">Recent Sessions</h3>
				</div>
				<div className="divide-y divide-[#f0ece6]">
					{sessions?.slice(0, 10).map((session) => (
						<div key={session.session_id} className="px-6 py-3 flex items-center justify-between hover:bg-[#faf9f7] transition-colors">
							<div className="flex items-center gap-3">
								<span className="text-sm font-medium text-[#2d2a26] capitalize">{session.source}</span>
								<span className="text-xs text-[#6b6560] font-mono">{session.session_id.slice(0, 16)}...</span>
							</div>
							<div className="flex items-center gap-6 text-sm">
								<span className="text-[#6b6560]">{session.request_count} reqs</span>
								<span className="text-[#6b6560]">{(session.input_tokens + session.output_tokens).toLocaleString()} tokens</span>
								<span className="text-[#8b7355] font-medium">${session.cost.toFixed(2)}</span>
							</div>
						</div>
					)) || (
						<div className="px-6 py-8 text-center text-sm text-[#6b6560]">No sessions found for this time range</div>
					)}
				</div>
			</div>
		</div>
	);
}
