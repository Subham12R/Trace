import { useDashboardStore } from "@/stores/dashboardStore";
import { cn } from "@/lib/utils";
import type { TimeRange } from "@/types/metrics";

const tabs: { key: TimeRange; label: string }[] = [
	{ key: "today", label: "Today" },
	{ key: "week", label: "This Week" },
	{ key: "month", label: "This Month" },
	{ key: "all", label: "All Time" },
];

export function TimeTabs() {
	const { timeRange, setTimeRange } = useDashboardStore();

	return (
		<div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
			{tabs.map((tab) => (
				<button
					key={tab.key}
					onClick={() => setTimeRange(tab.key)}
					className={cn(
						"px-3 py-1.5 text-sm rounded-md transition-colors font-medium",
						timeRange === tab.key
							? "bg-primary text-primary-foreground shadow-sm"
							: "text-muted-foreground hover:text-foreground"
					)}
				>
					{tab.label}
				</button>
			))}
		</div>
	);
}
