import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProviders } from "@/hooks/useMetrics";
import { CheckCircle, XCircle, Folder } from "lucide-react";

export function SettingsPage() {
	const { data: providers, isLoading } = useProviders();

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="font-serif text-2xl font-semibold text-foreground">Settings</h1>
				<p className="text-muted-foreground mt-1">Configure your AI CLI providers and preferences</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="font-serif">Providers</CardTitle>
					<CardDescription>
						Detected AI CLI tools on your system. Enable or disable providers to control which usage data is tracked.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-3">
					{isLoading ? (
						<div className="text-muted-foreground text-sm">Scanning for providers...</div>
					) : (
						providers?.map((provider) => (
							<div
								key={provider.id}
								className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
							>
								<div className="flex items-center gap-3">
									{provider.installed ? (
										<CheckCircle className="size-5 text-emerald-600" />
									) : (
										<XCircle className="size-5 text-muted-foreground/50" />
									)}
									<div>
										<div className="flex items-center gap-2">
											<span className="font-medium text-foreground">{provider.name}</span>
											{provider.installed ? (
												<Badge variant="default" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Detected</Badge>
											) : (
												<Badge variant="secondary" className="text-muted-foreground">Not Found</Badge>
											)}
										</div>
										<div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
											<Folder className="size-3" />
											{provider.defaults.join(", ")}
										</div>
									</div>
								</div>
								<div className="text-xs text-muted-foreground font-mono">
									{provider.env}
								</div>
							</div>
						))
					)}
				</CardContent>
			</Card>
		</div>
	);
}
