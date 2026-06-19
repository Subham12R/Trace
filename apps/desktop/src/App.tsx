import { useState, useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/app-shell";
import { Dashboard } from "@/components/Dashboard";
import { SettingsPage } from "@/components/SettingsPage";

function getHash() {
	return window.location.hash.replace("#", "") || "dashboard";
}

export default function App() {
	const [page, setPage] = useState(getHash());

	useEffect(() => {
		const handleHashChange = () => setPage(getHash());
		window.addEventListener("hashchange", handleHashChange);
		return () => window.removeEventListener("hashchange", handleHashChange);
	}, []);

	return (
		<TooltipProvider>
			<AppShell>
				{page === "settings" || page === "providers" ? (
					<SettingsPage />
				) : (
					<Dashboard />
				)}
			</AppShell>
		</TooltipProvider>
	);
}
