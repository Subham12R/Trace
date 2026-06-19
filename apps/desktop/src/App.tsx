import { useState, useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { AppSidebar } from "@/components/app-sidebar";
import { InsightsPage } from "@/components/InsightsPage";
import { ActivityPage } from "@/components/ActivityPage";
import { SettingsPage } from "@/components/SettingsPage";

function getHash() {
	return window.location.hash.replace("#", "") || "home";
}

export default function App() {
	const [page, setPage] = useState(getHash());

	useEffect(() => {
		const handleHashChange = () => setPage(getHash());
		window.addEventListener("hashchange", handleHashChange);
		return () => window.removeEventListener("hashchange", handleHashChange);
	}, []);

	return (
		<AppShell>
			<div className="flex">
				<AppSidebar />
				<main className="flex-1 ml-[220px] min-h-screen">
					{page === "home" || page === "dashboard" ? (
						<InsightsPage />
					) : page === "insights" || page === "activity" ? (
						<ActivityPage />
					) : (
						<SettingsPage />
					)}
				</main>
			</div>
		</AppShell>
	);
}
