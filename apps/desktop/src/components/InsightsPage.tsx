import { useState } from "react";
import { useMetrics, useProviders, useActiveSessions } from "@/hooks/useMetrics";
import { useDashboardStore } from "@/stores/dashboardStore";
import { cn } from "@/lib/utils";
import { AlertCircle, Zap, MessageSquare, Cpu, TrendingUp } from "lucide-react";

export function InsightsPage() {
	const [activeTab, setActiveTab] = useState<"usage" | "providers">("usage");
	const { timeRange } = useDashboardStore();
	const { data: metrics } = useMetrics(timeRange);
	const { data: providers } = useProviders();
	const { data: activeSessions } = useActiveSessions();

	const detectedProviders = providers?.filter((p) => p.installed) || [];

	return (
		<div className="p-8 max-w-6xl">
			{/* Header */}
			<div className="mb-6">
				<h1 className="font-serif text-2xl font-semibold text-[#2d2a26]">Insights</h1>
			</div>

			{/* Cloud Sync Alert */}
			<div className="mb-6 p-4 bg-[#f0ece6] rounded-xl border border-[#e0d9d0]">
				<div className="flex items-start gap-3">
					<AlertCircle className="size-5 text-[#8b7355] mt-0.5 shrink-0" />
					<div>
						<p className="text-sm font-medium text-[#2d2a26]">
							Enable <span className="underline cursor-pointer">Cloud Sync</span> for more reliable insights
						</p>
						<p className="text-xs text-[#6b6560] mt-0.5">
							Your usage stats may not be as accurate without Cloud Sync enabled for Claude Code and OpenCode.
						</p>
					</div>
				</div>
			</div>

			{/* Tabs */}
			<div className="flex gap-6 mb-8 border-b border-[#e8e4df]">
				<button
					onClick={() => setActiveTab("usage")}
					className={cn(
						"pb-3 text-sm font-medium transition-colors border-b-2",
						activeTab === "usage"
							? "border-[#2d2a26] text-[#2d2a26]"
							: "border-transparent text-[#6b6560] hover:text-[#2d2a26]"
					)}
				>
					Your Usage
				</button>
				<button
					onClick={() => setActiveTab("providers")}
					className={cn(
						"pb-3 text-sm font-medium transition-colors border-b-2",
						activeTab === "providers"
							? "border-[#2d2a26] text-[#2d2a26]"
							: "border-transparent text-[#6b6560] hover:text-[#2d2a26]"
					)}
				>
					By Provider
				</button>
			</div>

			{/* Metric Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
				<MetricCard
					value={metrics?.total_requests?.toString() || "0"}
					label="TOTAL REQUESTS"
					icon={<MessageSquare className="size-4 text-[#8b7355]" />}
					subtitle={`${detectedProviders.length} active providers`}
				/>
				<MetricCard
					value={metrics ? `${((metrics.input_tokens + metrics.output_tokens) / 1000).toFixed(1)}k` : "0"}
					label="TOTAL TOKENS"
					icon={<Cpu className="size-4 text-[#8b7355]" />}
					subtitle="Input + Output combined"
				/>
				<MetricCard
					value={`$${metrics?.total_cost?.toFixed(2) || "0.00"}`}
					label="ESTIMATED COST"
					icon={<TrendingUp className="size-4 text-[#8b7355]" />}
					subtitle="Based on model pricing"
				/>
			</div>

			{/* Usage Breakdown */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Provider Usage */}
				<div className="bg-[#f5f3ef] rounded-xl p-6">
					<div className="flex items-center justify-between mb-6">
						<h3 className="font-serif text-lg font-semibold text-[#2d2a26]">Provider Usage</h3>
						<span className="text-xs text-[#6b6560] uppercase tracking-wider">
							Total Apps Used | {detectedProviders.length}
						</span>
					</div>

					<div className="space-y-4">
						{detectedProviders.length === 0 ? (
							<p className="text-sm text-[#6b6560]">No providers detected yet.</p>
						) : (
							detectedProviders.map((provider) => (
								<div key={provider.id}>
									<div className="flex items-center justify-between mb-1.5">
										<div className="flex items-center gap-2">
											<Zap className="size-4 text-[#8b7355]" />
											<span className="text-sm font-medium text-[#2d2a26] capitalize">
												{provider.name}
											</span>
										</div>
										<span className="text-xs text-[#6b6560]">
											{provider.defaults[0]}
										</span>
									</div>
									<div className="h-2 bg-[#e8e4df] rounded-full overflow-hidden">
										<div
											className="h-full bg-[#8b7355] rounded-full transition-all"
											style={{ width: "100%" }}
										/>
									</div>
								</div>
							))
						)}
					</div>
				</div>

				{/* Activity Calendar */}
				<div className="bg-[#f5f3ef] rounded-xl p-6">
					<div className="flex items-center justify-between mb-6">
						<h3 className="font-serif text-lg font-semibold text-[#2d2a26]">
							{activeSessions && activeSessions.length > 0 ? `${activeSessions.length} Active Session${activeSessions.length > 1 ? "s" : ""}` : "No Active Sessions"}
						</h3>
						<span className="text-xs text-[#6b6560] uppercase tracking-wider">
							Real-time
						</span>
					</div>

					{activeSessions && activeSessions.length > 0 ? (
						<div className="space-y-3">
							{activeSessions.map((session) => (
								<div
									key={session.session_id}
									className="flex items-center gap-3 p-3 bg-white rounded-lg border border-[#e8e4df]"
								>
									<div className="relative flex h-2.5 w-2.5">
										<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
										<span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium text-[#2d2a26] capitalize">
											{session.source}
										</p>
										<p className="text-xs text-[#6b6560] truncate">
											{session.model || "Unknown model"}
										</p>
									</div>
								</div>
							))}
						</div>
					) : (
						<div className="text-center py-8">
							<p className="text-sm text-[#6b6560]">No active sessions detected</p>
							<p className="text-xs text-[#8b8078] mt-1">
								Start using your AI CLI tools to see activity here
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

function MetricCard({
	value,
	label,
	icon,
	subtitle,
}: {
	value: string;
	label: string;
	icon: React.ReactNode;
	subtitle: string;
}) {
	return (
		<div className="bg-[#f5f3ef] rounded-xl p-6">
			<div className="flex items-center justify-between mb-4">
				<span className="text-xs text-[#6b6560] uppercase tracking-wider font-medium">
					{label}
				</span>
				{icon}
			</div>
			<div className="text-4xl font-serif font-semibold text-[#2d2a26] tracking-tight">
				{value}
			</div>
			<p className="text-xs text-[#8b8078] mt-2">{subtitle}</p>
		</div>
	);
}
