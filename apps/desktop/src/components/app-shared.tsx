import type { ReactNode } from "react";
import { Home, BarChart3, Settings } from "lucide-react";

export type NavItem = {
	title: string;
	path: string;
	icon: ReactNode;
	isActive?: boolean;
};

function getHash() {
	return window.location.hash.replace("#", "") || "home";
}

export const mainNav: NavItem[] = [
	{
		title: "Home",
		path: "#/home",
		icon: <Home className="size-[18px]" />,
		isActive: getHash() === "home" || getHash() === "dashboard",
	},
	{
		title: "Insights",
		path: "#/insights",
		icon: <BarChart3 className="size-[18px]" />,
		isActive: getHash() === "insights" || getHash() === "activity",
	},
];

export const bottomNav: NavItem[] = [
	{
		title: "Settings",
		path: "#/settings",
		icon: <Settings className="size-[18px]" />,
		isActive: getHash() === "settings" || getHash() === "providers",
	},
];
