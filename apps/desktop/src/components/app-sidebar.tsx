import { useState, useEffect } from "react";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { navSections, isActive, type NavItem } from "@/components/app-shared";
import { getStoredProfile } from "./OnboardingPage";
import { useMemo } from "react";

/** Re-render nav on hash navigation so the active item stays in sync. */
function useActiveTick() {
	const [, setTick] = useState(0);
	useEffect(() => {
		const onHash = () => setTick((t) => t + 1);
		window.addEventListener("hashchange", onHash);
		return () => window.removeEventListener("hashchange", onHash);
	}, []);
}

function NavMenu({ items }: { items: NavItem[] }) {
	const { isMobile, setOpenMobile } = useSidebar();
	return (
		<SidebarMenu>
			{items.map((item) => (
				<SidebarMenuItem key={item.title}>
					<SidebarMenuButton
						render={<a href={item.path} onClick={() => isMobile && setOpenMobile(false)} />}
						isActive={isActive(item.path)}
						tooltip={item.title}
						className="rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-soft)] hover:text-[var(--app-ink)] data-[active]:!bg-[var(--app-ink)] data-[active]:!text-[var(--app-canvas)] data-[active]:hover:!bg-[var(--app-ink)]"
					>
						{item.icon}
						<span className="font-medium tracking-tight">{item.title}</span>
					</SidebarMenuButton>
				</SidebarMenuItem>
			))}
		</SidebarMenu>
	);
}

export function AppSidebar() {
	useActiveTick();
	const profile = useMemo(() => getStoredProfile(), []);

	const initials = profile.name
		? profile.name
				.split(" ")
				.map((n) => n[0])
				.slice(0, 2)
				.join("")
				.toUpperCase()
		: "T";

	return (
		<Sidebar collapsible="icon" className="border-r border-[var(--app-hairline)] bg-[var(--app-canvas)]">
			<SidebarHeader className="py-5">
				<div className="flex items-center gap-2.5 px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
					<img src="/images/icon.png" alt="Trace" className="size-10 group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:ml-2 object-contain bg-[#111]/20 rounded-xl shrink-0" />
					
					<div className="flex flex-col leading-[1.1]">
								<span className="text-xl font-semibold tracking-tight text-[var(--app-ink)] group-data-[collapsible=icon]:hidden">
						Trace
					</span>
					
						<span className="text-xs text-[var(--app-muted)]  tracking-tighter font-medium group-data-[collapsible=icon]:hidden">
							AI Observability
						</span>

					</div>
				
				</div>
			</SidebarHeader>

			<SidebarContent className="gap-5 px-2">
				{navSections.map((section) => (
					<SidebarGroup key={section.label} className="p-0">
						<SidebarGroupLabel className="text-[10px] font-semibold tracking-wider text-[var(--app-muted)] px-2 py-1 group-data-[collapsible=icon]:hidden">
							{section.label}
						</SidebarGroupLabel>
						<SidebarGroupContent>
							<NavMenu items={section.items} />
						</SidebarGroupContent>
					</SidebarGroup>
				))}
			</SidebarContent>

			<SidebarFooter className="pb-4 px-2">
				<a
					href="#/profile"
					className="group flex items-center gap-3 rounded-xl p-2.5 border border-[var(--app-hairline)] bg-[var(--app-soft)] hover:border-[var(--app-muted)]/30 transition-colors w-full group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:border-none group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:justify-center"
				>
					<div className="size-9 group-data-[collapsible=icon]:size-8 rounded-full bg-[var(--app-ink)] flex items-center justify-center shrink-0 overflow-hidden">
						{profile.avatar ? (
							<img src={profile.avatar} alt={profile.name} className="size-full object-cover" />
						) : (
							<span className="text-xs font-semibold text-[var(--app-canvas)] group-data-[collapsible=icon]:text-[10px]">{initials}</span>
						)}
					</div>
					<div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
						<p className="text-sm font-medium text-[var(--app-ink)] truncate">{profile.name || "Trace User"}</p>
						<p className="text-[11px] text-[var(--app-muted)] truncate">local@trace.app</p>
					</div>
				</a>
			</SidebarFooter>
		</Sidebar>
	);
}
