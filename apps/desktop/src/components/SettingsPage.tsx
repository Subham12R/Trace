import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProviders, useAuthStatus, connectProvider, disconnectProvider } from "@/hooks/useMetrics";
import { XCircle, Folder, Cloud, Lock, Eye, EyeOff } from "lucide-react";
import { ProviderLogo } from "./ProviderLogo";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

const CLOUD_PROVIDERS = [
  {
    id: "anthropic",
    name: "Claude Code (Anthropic)",
    description: "Fetch hourly and weekly usage from Anthropic API",
  },
  {
    id: "opencode-cloud",
    name: "OpenCode Cloud",
    description: "Sync usage data from OpenCode cloud account",
  },
];

export function SettingsPage() {
	const { data: providers, isLoading } = useProviders();
	const { data: authStatus, isLoading: authLoading } = useAuthStatus();
	const queryClient = useQueryClient();

	return (
		<div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
			<div className="mb-6 lg:mb-8">
				<h1 className="text-xl sm:text-2xl font-semibold text-[var(--app-ink)]">Settings</h1>
				<p className="text-sm text-[var(--app-muted)] mt-1">Configure providers and cloud sync</p>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
				{/* Local Providers */}
				<Card className="border-2 border-[var(--app-hairline)] bg-[var(--app-soft)] p-4 rounded-[14px] card-depth">
					<CardHeader>
						<CardTitle className="text-lg font-semibold text-[var(--app-ink)]">Local Providers</CardTitle>
						<CardDescription className="text-[var(--app-muted)]">AI CLI tools detected on your system</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-2 mt-4">
						{isLoading ? (
							<p className="text-sm text-[var(--app-muted)]">Scanning...</p>
						) : (
							providers?.map((provider) => (
								<div
									key={provider.id}
									className="flex items-center justify-between p-3 rounded-[10px] border border-[var(--app-hairline)] bg-[var(--app-canvas)] hover:bg-[var(--app-soft)] transition-colors animate-fade-in"
								>
									<div className="flex items-center gap-3">
										{provider.installed ? (
											<ProviderLogo provider={provider} size="sm" />
										) : (
											<XCircle className="size-4 text-[var(--app-muted)]/65" />
										)}
										<div>
											<div className="flex items-center gap-2">
												<span className="text-sm font-medium text-[var(--app-ink)]">{provider.name}</span>
												{provider.installed ? (
													<Badge className="bg-[var(--app-ink)] text-[var(--app-canvas)] hover:bg-[var(--app-ink)] text-[10px]">Detected</Badge>
												) : (
													<Badge variant="secondary" className="bg-[var(--app-soft)] text-[var(--app-muted)] text-[10px]">Not Found</Badge>
												)}
											</div>
											<div className="flex items-center gap-1 text-[11px] text-[var(--app-muted)] mt-0.5">
												<Folder className="size-3" />
												{provider.defaults[0]}
											</div>
										</div>
									</div>
								</div>
							))
						)}
					</CardContent>
				</Card>

				{/* Cloud Sync */}
				<Card className="border-2 border-[var(--app-hairline)] bg-[var(--app-soft)] p-4 rounded-[14px] card-depth">
					<CardHeader>
						<CardTitle className="text-lg font-semibold text-[var(--app-ink)]">Cloud Sync</CardTitle>
						<CardDescription className="text-[var(--app-muted)]">Connect accounts for real-time usage data</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-3 mt-4">
						<div className="p-4 bg-[var(--app-canvas)] border border-[var(--app-hairline)] rounded-[10px]">
							<div className="flex items-center gap-2 mb-2">
								<Lock className="size-4 text-[var(--app-ink)]" />
								<span className="text-sm font-medium text-[var(--app-ink)]">Secure Storage</span>
							</div>
							<p className="text-xs text-[var(--app-muted)]">
								API keys are stored securely in your OS keychain. Claude Code usage can also be synced via OAuth credentials.
							</p>
						</div>

						{authLoading ? (
							<p className="text-sm text-[var(--app-muted)]">Loading...</p>
						) : (
							CLOUD_PROVIDERS.map((provider) => (
								<CloudProviderCard
									key={provider.id}
									provider={provider}
									connected={authStatus?.[provider.id]?.connected || false}
									onRefresh={() => queryClient.invalidateQueries({ queryKey: ['auth', 'status'] })}
								/>
							))
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

function CloudProviderCard({
	provider,
	connected,
	onRefresh,
}: {
	provider: { id: string; name: string; description: string };
	connected: boolean;
	onRefresh: () => void;
}) {
	const [key, setKey] = useState("");
	const [showKey, setShowKey] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleConnect = async () => {
		if (!key.trim()) return;
		setIsSubmitting(true);
		try {
			await connectProvider(provider.id, key.trim());
			setKey("");
			onRefresh();
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDisconnect = async () => {
		setIsSubmitting(true);
		try {
			await disconnectProvider(provider.id);
			onRefresh();
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="p-4 rounded-[10px] border border-[var(--app-hairline)] bg-[var(--app-canvas)]">
			<div className="flex items-start justify-between mb-3">
				<div className="flex items-center gap-3">
					<Cloud className="size-4 text-[var(--app-ink)]" />
					<div>
						<p className="text-sm font-medium text-[var(--app-ink)]">{provider.name}</p>
						<p className="text-[11px] text-[var(--app-muted)]">{provider.description}</p>
					</div>
				</div>
				{connected ? (
					<Badge className="bg-[var(--app-ink)] text-[var(--app-canvas)] hover:bg-[var(--app-ink)] text-[10px]">Connected</Badge>
				) : (
					<Badge variant="secondary" className="bg-[var(--app-soft)] text-[var(--app-muted)] text-[10px]">Disconnected</Badge>
				)}
			</div>

			{connected ? (
				<button
					onClick={handleDisconnect}
					disabled={isSubmitting}
					className="px-3 py-1.5 text-xs rounded-full font-medium bg-[var(--app-soft)] text-[var(--app-ink)] hover:bg-[var(--app-hairline)] transition-colors disabled:opacity-50"
				>
					{isSubmitting ? "Disconnecting..." : "Disconnect"}
				</button>
			) : (
				<div className="flex gap-2">
					<div className="relative flex-1">
						<input
							type={showKey ? "text" : "password"}
							value={key}
							onChange={(e) => setKey(e.target.value)}
							placeholder={`Enter ${provider.name} API key`}
							className="w-full px-3 py-1.5 pr-8 text-xs rounded-[10px] border border-[var(--app-hairline)] bg-[var(--app-canvas)] text-[var(--app-ink)] placeholder:text-[var(--app-muted)]/60 focus:outline-none focus:border-[var(--app-ink)]"
						/>
						<button
							type="button"
							onClick={() => setShowKey(!showKey)}
							className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--app-muted)] hover:text-[var(--app-ink)]"
						>
							{showKey ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
						</button>
					</div>
					<button
						onClick={handleConnect}
						disabled={isSubmitting || !key.trim()}
						className="px-4 py-1.5 text-xs rounded-full font-medium bg-[var(--app-ink)] text-[var(--app-canvas)] hover:bg-[var(--app-ink)]/90 transition-colors disabled:opacity-50"
					>
						{isSubmitting ? "Connecting..." : "Connect"}
					</button>
				</div>
			)}
		</div>
	);
}
