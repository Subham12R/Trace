import { RefreshCw } from "lucide-react";
import { useRefresh } from "@/hooks/useMetrics";
import { cn } from "@/lib/utils";

export function RefreshButton({
	className,
	variant = "dark",
}: {
	className?: string;
	variant?: "dark" | "light" | "outline";
}) {
	const { mutate, isPending } = useRefresh();

	return (
		<button
			onClick={() => mutate()}
			disabled={isPending}
			className={cn(
				"inline-flex items-center gap-2 px-2.5 py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
				variant === "dark" && "bg-ink text-canvas hover:opacity-90",
				variant === "light" && "bg-canvas/10 text-canvas border border-canvas/20 hover:bg-canvas/20 backdrop-blur-sm",
				variant === "outline" && "border border-hairline bg-soft text-ink hover:border-muted/40",
				className
			)}
		>
			<RefreshCw className={cn("size-3.5 sm:size-4", isPending && "animate-spin")} />
			
		</button>
	);
}
