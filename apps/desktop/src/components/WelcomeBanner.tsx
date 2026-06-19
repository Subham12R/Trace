import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/logo";

export function WelcomeBanner() {
	return (
		<Card className="bg-gradient-to-r from-[#f5f0e8] to-[#faf6f0] border-[#e8e0d4]">
			<CardContent className="flex items-center gap-6 py-6">
				<div className="shrink-0">
					<Logo className="h-12 w-auto opacity-80" />
				</div>
				<div className="flex flex-col gap-1">
					<h2 className="font-serif text-xl font-semibold text-foreground">
						Welcome to Trace
					</h2>
					<p className="text-sm text-muted-foreground max-w-md">
						Your personal AI CLI usage dashboard. Monitor tokens, costs, and trends across all your coding assistants.
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
