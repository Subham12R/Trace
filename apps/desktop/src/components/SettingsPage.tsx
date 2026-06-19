import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProviders, useAuthStatus, connectProvider, disconnectProvider } from "@/hooks/useMetrics";
import { CheckCircle, XCircle, Folder, Cloud, Lock, Eye, EyeOff } from "lucide-react";
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
		<div className="p-8 max-w-6xl">
			<div className="mb-8">
				<h1 className="font-serif text-2xl font-semibold text-[#2d2a26]">Settings</h1>
				<p className="text-sm text-[#6b6560] mt-1">Configure providers and cloud sync</p>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Local Providers */}
				<Card className="border-[#e8e4df] bg-white">
					<CardHeader>
						<CardTitle className="font-serif text-lg">Local Providers</CardTitle>
						<CardDescription>AI CLI tools detected on your system</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-2">
						{isLoading ? (
							<p className="text-sm text-[#6b6560]">Scanning...</p>
						) : (
							providers?.map((provider) => (
								<div
									key={provider.id}
									className="flex items-center justify-between p-3 rounded-lg border border-[#f0ece6] hover:bg-[#faf9f7] transition-colors"
								>
									<div className="flex items-center gap-3">
										{provider.installed ? (
											<CheckCircle className="size-4 text-emerald-600" />
										) : (
											<XCircle className="size-4 text-[#c4bdb5]" />
										)}
										<div>
											<div className="flex items-center gap-2">
												<span className="text-sm font-medium text-[#2d2a26]">{provider.name}</span>
												{provider.installed ? (
													<Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 text-[10px]">Detected</Badge>
												) : (
													<Badge variant="secondary" className="text-[#9a9590] text-[10px]">Not Found</Badge>
												)}
											</div>
											<div className="flex items-center gap-1 text-[11px] text-[#9a9590] mt-0.5">
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
				<Card className="border-[#e8e4df] bg-white">
					<CardHeader>
						<CardTitle className="font-serif text-lg">Cloud Sync</CardTitle>
						<CardDescription>Connect accounts for real-time usage data</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-3">
						<div className="p-4 bg-[#f5f3ef] rounded-lg">
							<div className="flex items-center gap-2 mb-2">
								<Lock className="size-4 text-[#8b7355]" />
								<span className="text-sm font-medium text-[#2d2a26]">Secure Storage</span>
							</div>
							<p className="text-xs text-[#6b6560]">
								API keys are stored securely in your OS keychain. Claude Code usage requires cloud sync because Pro accounts do not store token counts locally.
							</p>
						</div>

						{authLoading ? (
							<p className="text-sm text-[#6b6560]">Loading...</p>
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
		<div className="p-4 rounded-lg border border-[#f0ece6]">
			<div className="flex items-start justify-between mb-3">
				<div className="flex items-center gap-3">
					<Cloud className="size-4 text-[#8b7355]" />
					<div>
						<p className="text-sm font-medium text-[#2d2a26]">{provider.name}</p>
						<p className="text-[11px] text-[#9a9590]">{provider.description}</p>
					</div>
				</div>
				{connected ? (
					<Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 text-[10px]">Connected</Badge>
				) : (
					<Badge variant="secondary" className="text-[#9a9590] text-[10px]">Disconnected</Badge>
				)}
			</div>

			{connected ? (
				<button
					onClick={handleDisconnect}
					disabled={isSubmitting}
					className="px-3 py-1.5 text-xs rounded-md font-medium bg-[#f0ece6] text-[#6b6560] hover:bg-[#e8e4df] transition-colors disabled:opacity-50"
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
							className="w-full px-3 py-1.5 pr-8 text-xs rounded-md border border-[#e8e4df] bg-white text-[#2d2a26] placeholder:text-[#b5afa8] focus:outline-none focus:border-[#8b7355]"
						/>
						<button
							type="button"
							onClick={() => setShowKey(!showKey)}
							className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9a9590] hover:text-[#6b6560]"
						>
							{showKey ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
						</button>
					</div>
					<button
						onClick={handleConnect}
						disabled={isSubmitting || !key.trim()}
						className="px-3 py-1.5 text-xs rounded-md font-medium bg-[#8b7355] text-white hover:bg-[#7a6548] transition-colors disabled:opacity-50"
					>
						{isSubmitting ? "Connecting..." : "Connect"}
					</button>
				</div>
			)}
		</div>
	);
}
