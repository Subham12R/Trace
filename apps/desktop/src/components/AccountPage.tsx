import { useState, useEffect } from "react";
import { Cloud, LogOut, RefreshCw, CheckCircle } from "lucide-react";
import { useCloudAccount } from "@/hooks/useMetrics";
import { api } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const CLOUD_LOGIN_URL = import.meta.env.VITE_TRACE_CLOUD_URL
  ? `${import.meta.env.VITE_TRACE_CLOUD_URL}/auth/login`
  : "https://cloud.trace.app/auth/login";

export function AccountPage() {
	const { data: account, isLoading } = useCloudAccount();
	const [isBusy, setIsBusy] = useState(false);
	const queryClient = useQueryClient();

	// Listen for the OAuth callback token from Electron
	useEffect(() => {
		if (!window.electronAPI?.onCloudAuthCallback) return;
		const unsubscribe = window.electronAPI.onCloudAuthCallback(async (token: string) => {
			try {
				await api.post("/api/cloud/token", { credential: token });
				queryClient.invalidateQueries({ queryKey: ["cloud", "account"] });
				toast.success("Trace Cloud connected");
			} catch {
				toast.error("Failed to store cloud token");
			}
		});
		return unsubscribe;
	}, [queryClient]);

	const handleLogin = () => {
		if (window.electronAPI?.openCloudLogin) {
			window.electronAPI.openCloudLogin(CLOUD_LOGIN_URL);
		} else {
			window.open(CLOUD_LOGIN_URL, "_blank");
		}
	};

	const handleLogout = async () => {
		setIsBusy(true);
		try {
			await api.post("/api/cloud/logout", {});
			queryClient.invalidateQueries({ queryKey: ["cloud", "account"] });
			toast.success("Logged out of Trace Cloud");
		} catch {
			toast.error("Logout failed");
		} finally {
			setIsBusy(false);
		}
	};

	const handleSync = async () => {
		setIsBusy(true);
		try {
			await api.post("/api/cloud/sync", {});
			toast.success("Sync triggered");
		} catch {
			toast.error("Sync failed");
		} finally {
			setIsBusy(false);
		}
	};

	return (
		<div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
			<div className="mb-6 lg:mb-8">
				<h1 className="text-xl sm:text-2xl font-semibold text-[var(--app-ink)]">Account</h1>
				<p className="text-sm text-[var(--app-muted)] mt-1">Manage your Trace Cloud connection</p>
			</div>

			<div className="bg-[var(--app-soft)] rounded-2xl border-2 border-[var(--app-hairline)] p-6 card-depth">
				{isLoading ? (
					<p className="text-sm text-[var(--app-muted)]">Loading…</p>
				) : account?.logged_in ? (
					<div className="space-y-4">
						<div className="flex items-start justify-between">
							<div className="flex items-center gap-3">
								<div className="size-10 rounded-full bg-[var(--app-ink)] flex items-center justify-center">
									<Cloud className="size-5 text-[var(--app-canvas)]" />
								</div>
								<div>
									<p className="text-sm font-semibold text-[var(--app-ink)]">{account.name || "Trace Cloud"}</p>
									<p className="text-xs text-[var(--app-muted)]">{account.email ?? ""}</p>
								</div>
							</div>
							<Badge className="bg-[var(--app-ink)] text-[var(--app-canvas)] hover:bg-[var(--app-ink)] text-[10px] flex items-center gap-1">
								<CheckCircle className="size-3" />
								Connected
							</Badge>
						</div>

						<div className="flex gap-2 pt-2">
							<button
								onClick={handleSync}
								disabled={isBusy}
								className="flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-full font-medium bg-[var(--app-soft)] text-[var(--app-ink)] hover:bg-[var(--app-hairline)] transition-colors disabled:opacity-50 border border-[var(--app-hairline)]"
							>
								<RefreshCw className="size-3" />
								{isBusy ? "Syncing…" : "Sync now"}
							</button>
							<button
								onClick={handleLogout}
								disabled={isBusy}
								className="flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-full font-medium bg-[var(--app-soft)] text-[var(--app-muted)] hover:bg-[var(--app-hairline)] transition-colors disabled:opacity-50 border border-[var(--app-hairline)]"
							>
								<LogOut className="size-3" />
								{isBusy ? "Logging out…" : "Logout"}
							</button>
						</div>
					</div>
				) : (
					<div className="flex flex-col items-center gap-4 py-6 text-center">
						<div className="size-14 rounded-2xl bg-[var(--app-canvas)] border-2 border-[var(--app-hairline)] flex items-center justify-center">
							<Cloud className="size-7 text-[var(--app-muted)]" />
						</div>
						<div>
							<p className="text-sm font-semibold text-[var(--app-ink)]">Connect to Trace Cloud</p>
							<p className="text-xs text-[var(--app-muted)] mt-1 max-w-xs">
								Sync your usage data to the cloud to access it from the web dashboard and across devices.
							</p>
						</div>
						<button
							onClick={handleLogin}
							className="px-6 py-2 text-sm rounded-full font-medium bg-[var(--app-ink)] text-[var(--app-canvas)] hover:bg-[var(--app-ink)]/90 transition-colors"
						>
							Login with Trace Cloud
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
