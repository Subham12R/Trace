import { useEffect } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useThemeStore } from "@/stores/themeStore";
import { ThemeToggle } from "./ThemeToggle";
import { RefreshButton } from "./RefreshButton";
import { SystemWidget } from "./SystemWidget";
import { UpdateBanner } from "./UpdateBanner";
import { OfflineBanner } from "./OfflineBanner";
import { useServerStatus } from "@/hooks/useServerStatus";
import { motion } from "motion/react";

const ACCENT_GLOWS: Record<string, string> = {
	ink: "from-neutral-500/[0.04] via-transparent to-neutral-700/[0.04] dark:from-neutral-900/15 dark:to-neutral-950/15",
	rose: "from-rose-500/[0.06] via-transparent to-orange-500/[0.05] dark:from-rose-900/10 dark:to-orange-950/10",
	sky: "from-sky-500/[0.06] via-transparent to-indigo-500/[0.05] dark:from-sky-900/10 dark:to-indigo-950/10",
	emerald: "from-emerald-500/[0.06] via-transparent to-teal-500/[0.05] dark:from-emerald-900/10 dark:to-teal-950/10",
	violet: "from-violet-500/[0.06] via-transparent to-fuchsia-500/[0.05] dark:from-violet-900/10 dark:to-fuchsia-950/10",
	amber: "from-amber-500/[0.06] via-transparent to-yellow-500/[0.05] dark:from-amber-900/10 dark:to-yellow-950/10",
	slate: "from-slate-500/[0.06] via-transparent to-zinc-500/[0.05] dark:from-slate-900/10 dark:to-zinc-950/10",
	ocean: "from-cyan-500/[0.06] via-transparent to-blue-500/[0.05] dark:from-cyan-900/10 dark:to-blue-950/10",
};

export function AppShell({ children }: { children: React.ReactNode }) {
	const initTheme = useThemeStore((s) => s.init);
	const accent = useThemeStore((s) => s.accent) || "ink";
	const gradientClass = ACCENT_GLOWS[accent] || ACCENT_GLOWS.ink;

	useEffect(() => {
		initTheme();
	}, [initTheme]);

	useServerStatus();

	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset className="bg-[var(--app-canvas)] relative">
				{/* Ambient accent backdrop tone */}
				<div className={`absolute inset-0 bg-gradient-to-br ${gradientClass} pointer-events-none z-0`} />

				{/* Fine noise texture overlay */}
				<div className="absolute inset-0 bg-noise opacity-[0.015] dark:opacity-[0.025] pointer-events-none z-0 mix-blend-overlay" />

				{/* Top bar with collapse/menu trigger */}
				<header id="app-headbar" className="app-headbar sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-[var(--app-hairline)] bg-[var(--app-canvas)]/85 backdrop-blur-md px-3 sm:px-4">
					<div className="flex items-center gap-2">
						<SidebarTrigger className="text-[var(--app-muted)] hover:text-[var(--app-ink)]" />
						<div className="lg:hidden flex items-center gap-2">
							<img src={`${import.meta.env.BASE_URL}images/icon.png`} alt="Trace" className="size-6 rounded-md" />
							<span className="text-base font-semibold text-[var(--app-ink)]">Trace</span>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<RefreshButton variant="outline" className="size-9 p-0 flex items-center justify-center" />
						<motion.div
							className="relative group"
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.98 }}
						>
							<SystemWidget className="size-9 p-0 flex items-center justify-center" />
						</motion.div>
						<ThemeToggle compact />
					</div>
				</header>
				<UpdateBanner />
				<OfflineBanner />
				<div className="min-h-[calc(100svh-3.5rem)] relative z-10">{children}</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
