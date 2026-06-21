import { useState, useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { HomePage } from "@/components/HomePage";
import { DetailedAnalysisPage } from "@/components/DetailedAnalysisPage";
import { ProviderAnalysisPage } from "@/components/ProviderAnalysisPage";
import { SettingsPage } from "@/components/SettingsPage";
import { ProfilePage } from "@/components/ProfilePage";
import { CustomizePage } from "@/components/CustomizePage";
import { AccountPage } from "@/components/AccountPage";
import { OnboardingPage, isOnboarded } from "@/components/OnboardingPage";
import { getHash } from "@/components/app-shared";
import { Toaster } from "@/components/ui/sonner";

export default function App() {
	const [page, setPage] = useState(getHash());
	const [onboarded, setOnboarded] = useState(isOnboarded());

	useEffect(() => {
		const handleHashChange = () => setPage(getHash());
		window.addEventListener("hashchange", handleHashChange);
		return () => window.removeEventListener("hashchange", handleHashChange);
	}, []);

	const renderPage = () => {
		switch (page) {
			case "home":
			case "dashboard":
				return <HomePage />;
			case "details":
			case "analysis":
				return <DetailedAnalysisPage />;
		case "providers":
			return <ProviderAnalysisPage />;
		case "customize":
			return <CustomizePage />;
		case "settings":
			return <SettingsPage />;
		case "profile":
			return <ProfilePage />;
		case "account":
			return <AccountPage />;
		default:
			return <HomePage />;
		}
	};

	if (!onboarded) {
		return (
			<>
				<OnboardingPage onComplete={() => setOnboarded(true)} />
				<Toaster />
			</>
		);
	}

	return (
		<>
			<AppShell>{renderPage()}</AppShell>
			<Toaster />
		</>
	);
}
