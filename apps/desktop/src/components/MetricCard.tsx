import { cn } from "@/lib/utils";

export function MetricCard({ children, className }: { children: React.ReactNode; className?: string }) {
	return (
		<div className={cn(
			"bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center gap-1",
			className
		)}>
			{children}
		</div>
	);
}
