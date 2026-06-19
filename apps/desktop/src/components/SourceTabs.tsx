import { useDashboardStore } from "@/stores/dashboardStore";
import { cn } from "@/lib/utils";
import type { SourceView } from "@/types/metrics";

const tabs: { key: SourceView; label: string }[] = [
	{ key: "providers", label: "By Provider" },
	{ key: "projects", label: "By Project" },
	{ key: "sessions", label: "By Session" },
];

export function SourceTabs() {
	const { sourceView, setSourceView } = useDashboardStore();

	return (
		<div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
			{tabs.map((tab) => (
				<button
					key={tab.key}
					onClick={() => setSourceView(tab.key)}
					className={cn(
						"px-3 py-1.5 text-sm rounded-md transition-colors font-medium",
						sourceView === tab.key
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
