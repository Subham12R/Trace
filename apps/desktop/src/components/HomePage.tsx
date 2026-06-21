import { useMemo } from "react";
import { useMetrics, useProviders, useActiveSessions, useModels, useTrends, useQuota } from "@/hooks/useMetrics";
import { MessageSquare, Cpu, TrendingUp, Zap, User } from "lucide-react";
import { QuotaSection } from "./QuotaSection";
import { StreakChart } from "./StreakChart";
import { getStoredProfile } from "./OnboardingPage";
import { MiniSparkline } from "./MiniSparkline";
import { ProviderLogo } from "./ProviderLogo";
import { ModelBadge } from "./ModelBadge";
import { MotionCard } from "./MotionCard";
import { Skeleton } from "@/components/ui/skeleton";
import { extractModelName } from "@/lib/modelName";
import { useServerStore } from "@/stores/serverStore";

function greetingFor(hour: number): string {
	if (hour < 12) return "Good morning";
	if (hour < 18) return "Good afternoon";
	return "Good evening";
}

export function HomePage() {
	const { data: metrics, isLoading: metricsLoading } = useMetrics("today");
	const { data: providers, isLoading: providersLoading } = useProviders();
	const { data: activeSessions } = useActiveSessions();
	const { data: models, isLoading: modelsLoading } = useModels("today");
	const { data: trends } = useTrends("today", false);
	const { data: quotas } = useQuota();
	const serverStatus = useServerStore((s) => s.status);

	const showSkeleton = serverStatus !== 'online' || metricsLoading;
	const showModelSkeleton = serverStatus !== 'online' || modelsLoading;
	const showProviderSkeleton = serverStatus !== 'online' || providersLoading;

	const profile = useMemo(() => getStoredProfile(), []);
	const hasQuotas = quotas && quotas.length > 0;
	const now = new Date();
	const detectedProviders = providers?.filter((p) => p.installed) || [];
	const topModel = models?.[0];
	const topModels = (models || []).slice(0, 5);

	const firstName = profile.name ? profile.name.split(" ")[0] : "there";
	const dateLabel = now.toLocaleDateString(undefined, {
		weekday: "long",
		day: "numeric",
		month: "long",
		year: "numeric",
	});
	const maxModelCost = Math.max(...topModels.map((m) => m.cost), 0.0001);

	const { totalTokenSparkline, costSparkline } = useMemo(() => {
		if (!trends) {
			return { totalTokenSparkline: [], costSparkline: [] };
		}

		// 1. Generate buckets based on "today" (24 hourly buckets)
		const buckets = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));

		// 2. Aggregate trends by bucket
		const tokenMap: Record<string, number> = {};
		const costMap: Record<string, number> = {};

		trends.forEach((t) => {
			const b = t.bucket;
			tokenMap[b] = (tokenMap[b] || 0) + t.input_tokens + t.output_tokens;
			costMap[b] = (costMap[b] || 0) + t.cost;
		});

		// 3. Map buckets to aggregated values
		return {
			totalTokenSparkline: buckets.map((b) => tokenMap[b] || 0),
			costSparkline: buckets.map((b) => costMap[b] || 0),
		};
	}, [trends]);

	return (
		<div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
			{/* Greeting section (text-only) */}
			<div className="flex items-start justify-between gap-4 mb-6 lg:mb-8">
				<div>
					<p className="text-[11px] sm:text-xs font-medium uppercase tracking-[0.14em] text-[var(--app-muted)]">
						{dateLabel}
					</p>
					<div className="mt-5 sm:mt-6">
						<p className="text-sm sm:text-base text-[var(--app-muted)]">{greetingFor(now.getHours())},</p>
						<h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight mt-1 text-[var(--app-ink)] [overflow-wrap:anywhere]">
							{firstName}.
						</h1>
						<p className="mt-3 text-sm text-[var(--app-muted)] max-w-md">
							Here's a clear trace of your AI usage across{" "}
							{detectedProviders.length} connected {detectedProviders.length === 1 ? "tool" : "tools"}.
						</p>
					</div>
				</div>

				<div className="size-10 rounded-lg overflow-hidden border border-hairline bg-soft flex items-center justify-center shrink-0">
					{profile.avatar ? (
						<img src={profile.avatar} alt={profile.name} className="size-full object-cover" />
					) : (
						<User className="size-5 text-[var(--app-muted)]" />
					)}
				</div>
			</div>

			{/* Activity overview */}
			<div className="mb-2">
				<p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--app-muted)]">Activity Overview</p>
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 lg:mb-8">
				<AnalyticsBlock
					index={0}
					value={showSkeleton ? null : (metrics?.total_requests?.toLocaleString() ?? "0")}
					label="Total Requests"
					icon={<MessageSquare className="size-4 text-[var(--app-ink)]" />}
					subtitle={activeSessions && activeSessions.length > 0 ? `${activeSessions.length} active` : "No active sessions"}
					sparkline={totalTokenSparkline}
				/>
				<AnalyticsBlock
					index={1}
					value={showSkeleton ? null : (metrics ? `${((metrics.input_tokens + metrics.output_tokens) / 1000).toFixed(1)}k` : "0")}
					label="Total Tokens"
					icon={<Cpu className="size-4 text-[var(--app-ink)]" />}
					subtitle="Input + output combined"
					sparkline={totalTokenSparkline}
				/>
				<AnalyticsBlock
					index={2}
					value={showSkeleton ? null : `$${metrics?.total_cost?.toFixed(2) ?? "0.00"}`}
					label="Estimated Cost"
					icon={<TrendingUp className="size-4 text-[var(--app-ink)]" />}
					subtitle="Based on model pricing"
					sparkline={costSparkline}
				/>
				<AnalyticsBlock
					index={3}
					value={showProviderSkeleton ? null : detectedProviders.length.toString()}
					label="Active Providers"
					icon={<Zap className="size-4 text-[var(--app-ink)]" />}
					subtitle={topModel ? `Top: ${extractModelName(topModel.model)}` : "No model data"}
					sparkline={[]}
				/>
			</div>

			{/* Top Models + Provider Usage */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 lg:mb-8">
				{/* Top Models */}
				<MotionCard
					index={4}
					className="bg-[var(--app-soft)] rounded-2xl border-2 border-[var(--app-hairline)] p-4 sm:p-6 card-elevate card-depth"
				>
					<div className="flex items-center justify-between mb-4 sm:mb-5">
						<h2 className="text-base sm:text-lg font-semibold text-[var(--app-ink)]">Top Models</h2>
						<span className="text-[10px] sm:text-xs font-medium text-[var(--app-muted)] uppercase tracking-wide">By cost</span>
					</div>
					<div className="space-y-2.5">
						{showModelSkeleton ? (
							Array.from({ length: 4 }).map((_, i) => (
								<div key={i} className="flex items-center gap-3 rounded-lg border border-[var(--app-hairline)] bg-[var(--app-canvas)] p-2.5">
									<Skeleton className="size-8 rounded-lg shrink-0" />
									<div className="flex-1 space-y-1.5">
										<Skeleton className="h-3.5 w-32" />
										<Skeleton className="h-1.5 w-full rounded-full" />
									</div>
									<Skeleton className="h-5 w-12 shrink-0" />
								</div>
							))
						) : topModels.length === 0 ? (
							<p className="text-sm text-[var(--app-muted)]">No model usage yet.</p>
						) : (
							topModels.map((m) => (
								<div
									key={`${m.source}-${m.model}`}
									className="flex items-center gap-3 rounded-lg border border-[var(--app-hairline)] bg-[var(--app-canvas)] p-2.5"
								>
									<ModelBadge model={m.model} source={m.source} size="md" />
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium text-[var(--app-ink)] truncate">{extractModelName(m.model)}</p>
										<div className="mt-1.5 h-1.5 bg-[var(--app-hairline)] rounded-full overflow-hidden">
											<div
												className="h-full bg-[var(--app-ink)] rounded-full transition-all"
												style={{ width: `${(m.cost / maxModelCost) * 100}%` }}
											/>
										</div>
									</div>
									<div className="text-right shrink-0">
										<p className="text-sm font-semibold text-[var(--app-ink)]">${m.cost.toFixed(2)}</p>
										<p className="text-[10px] text-[var(--app-muted)]">{m.request_count.toLocaleString()} req</p>
									</div>
								</div>
							))
						)}
					</div>
				</MotionCard>

				{/* Provider Usage */}
				<MotionCard
					index={5}
					className="bg-[var(--app-soft)] rounded-2xl border-2 border-[var(--app-hairline)] p-4 sm:p-6 card-elevate card-depth"
				>
					<div className="flex items-center justify-between mb-4 sm:mb-5">
						<h2 className="text-base sm:text-lg font-semibold text-[var(--app-ink)]">Provider Usage</h2>
						<span className="text-[10px] sm:text-xs font-medium text-[var(--app-muted)] uppercase tracking-wide">
							{detectedProviders.length} detected
						</span>
					</div>
					<div className="space-y-3">
						{showProviderSkeleton ? (
							Array.from({ length: 3 }).map((_, i) => (
								<div key={i} className="flex items-center gap-3 rounded-lg border border-[var(--app-hairline)] bg-[var(--app-canvas)] p-2.5">
									<Skeleton className="size-8 rounded-lg shrink-0" />
									<div className="flex-1 space-y-1.5">
										<div className="flex items-center justify-between">
											<Skeleton className="h-3.5 w-24" />
											<Skeleton className="h-4 w-16 rounded-md" />
										</div>
										<Skeleton className="h-1.5 w-full rounded-full" />
									</div>
								</div>
							))
						) : detectedProviders.length === 0 ? (
							<p className="text-sm text-[var(--app-muted)]">No providers detected yet.</p>
						) : (
							detectedProviders.map((provider, i) => (
								<div
									key={provider.id}
									className="flex items-center gap-3 rounded-lg border border-[var(--app-hairline)] bg-[var(--app-canvas)] p-2.5"
								>
									<ProviderLogo provider={provider} size="md" />
									<div className="flex-1 min-w-0">
										<div className="flex items-center justify-between mb-1">
											<span className="text-sm font-medium text-[var(--app-ink)] capitalize truncate">{provider.name}</span>
											<span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[var(--app-ink)] text-[var(--app-canvas)] shrink-0">Connected</span>
										</div>
										<div className="h-1.5 bg-[var(--app-hairline)] rounded-full overflow-hidden">
											<div
												className="h-full bg-[var(--app-ink)] rounded-full transition-all"
												style={{ width: `${100 - i * 15}%` }}
											/>
										</div>
									</div>
								</div>
							))
						)}
					</div>
				</MotionCard>
			</div>

			{/* Insights grid */}
			<div className="mb-2">
				<p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--app-muted)]">Insights</p>
			</div>
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 lg:mb-8">
				{hasQuotas && (
					<div className="lg:col-span-2">
						<QuotaSection />
					</div>
				)}

				<MotionCard
					index={7}
					className={`bg-[var(--app-soft)] rounded-2xl border-2 border-[var(--app-hairline)] p-4 sm:p-6 card-elevate card-depth ${
						hasQuotas ? "lg:col-span-1" : "lg:col-span-3"
					}`}
				>
					<StreakChart />
				</MotionCard>
			</div>
		</div>
	);
}

function AnalyticsBlock({
	value,
	label,
	icon,
	subtitle,
	index,
	sparkline,
}: {
	value: string | null;
	label: string;
	icon: React.ReactNode;
	subtitle: string;
	index: number;
	sparkline: number[];
}) {
	return (
		<MotionCard
			index={index}
			className="bg-[var(--app-soft)] rounded-2xl border-2 border-[var(--app-hairline)] p-4 sm:p-5 card-elevate card-depth flex flex-col"
		>
			<div className="flex items-center justify-between mb-3">
				<span className="text-[10px] sm:text-xs font-medium text-[var(--app-muted)] uppercase tracking-wide">{label}</span>
				<span className="inline-flex items-center justify-center size-7 rounded-md bg-[var(--app-canvas)] border border-[var(--app-hairline)]">
					{icon}
				</span>
			</div>
			{value === null ? (
				<Skeleton className="h-8 w-20 mt-1" />
			) : (
				<div className="text-2xl sm:text-3xl font-semibold text-[var(--app-ink)] tracking-tight">{value}</div>
			)}
			<p className="text-[10px] sm:text-xs text-[var(--app-muted)] mt-1 truncate">{subtitle}</p>
			{sparkline.length > 1 && (
				<div className="mt-3 pt-3 border-t border-[var(--app-hairline)]">
					<MiniSparkline data={sparkline} />
				</div>
			)}
		</MotionCard>
	);
}
