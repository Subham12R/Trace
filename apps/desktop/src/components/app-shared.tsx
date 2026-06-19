import type { ReactNode } from "react";
import { LayoutDashboard, Activity, Settings, Plug } from "lucide-react";

export type SidebarNavItem = {
	title: string;
	path?: string;
	icon?: ReactNode;
	isActive?: boolean;
	subItems?: SidebarNavItem[];
};

export type SidebarNavGroup = {
	label: string;
	items: SidebarNavItem[];
};

function getHash() {
	return window.location.hash.replace("#", "") || "dashboard";
}

export const navGroups: SidebarNavGroup[] = [
	{
		label: "Overview",
		items: [
			{
				title: "Dashboard",
				path: "#/dashboard",
				icon: <LayoutDashboard className="size-4" />,
				isActive: getHash() === "dashboard",
			},
			{
				title: "Activity",
				path: "#/activity",
				icon: <Activity className="size-4" />,
				isActive: getHash() === "activity",
			},
		],
	},
	{
		label: "Configuration",
		items: [
			{
				title: "Providers",
				path: "#/providers",
				icon: <Plug className="size-4" />,
				isActive: getHash() === "providers",
			},
			{
				title: "Settings",
				path: "#/settings",
				icon: <Settings className="size-4" />,
				isActive: getHash() === "settings",
			},
		],
	},
];

export const navLinks: SidebarNavItem[] = [
	...navGroups.flatMap((group) =>
		group.items.flatMap((item) =>
			item.subItems?.length ? [item, ...item.subItems] : [item]
		)
	),
];
