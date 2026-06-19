import { Sun, Moon, Monitor } from "lucide-react";
import { useThemeStore } from "@/stores/themeStore";
import { cn } from "@/lib/utils";

const options = [
	{ id: "light" as const, icon: Sun, label: "Light" },
	{ id: "dark" as const, icon: Moon, label: "Dark" },
	{ id: "system" as const, icon: Monitor, label: "System" },
];

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
	const { mode, setMode } = useThemeStore();

	if (compact) {
		const active = options.find((o) => o.id === mode) || options[2];
		const Icon = active.icon;
		return (
			<button
				onClick={() => {
					const idx = options.findIndex((o) => o.id === mode);
					setMode(options[(idx + 1) % options.length].id);
				}}
				className="inline-flex items-center justify-center size-9 rounded-lg border border-[var(--app-hairline)] bg-[var(--app-soft)] text-[var(--app-ink)] hover:border-[var(--app-muted)]/40 transition-colors"
				aria-label="Toggle theme"
			>
				<Icon className="size-4" />
			</button>
		);
	}

	return (
		<div className="inline-flex items-center gap-1 rounded-lg border border-[var(--app-hairline)] bg-[var(--app-soft)] p-1">
			{options.map((option) => {
				const Icon = option.icon;
				const active = mode === option.id;
				return (
					<button
						key={option.id}
						onClick={() => setMode(option.id)}
						className={cn(
							"flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
							active
								? "bg-[var(--app-ink)] text-[var(--app-canvas)]"
								: "text-[var(--app-muted)] hover:text-[var(--app-ink)]"
						)}
					>
						<Icon className="size-3.5" />
						<span>{option.label}</span>
					</button>
				);
			})}
		</div>
	);
}
