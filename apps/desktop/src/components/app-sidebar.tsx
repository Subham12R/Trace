import { cn } from "@/lib/utils";
import { mainNav, bottomNav } from "@/components/app-shared";
import { User } from "lucide-react";

export function AppSidebar() {
	return (
		<aside className="w-[220px] min-h-screen bg-[#f7f5f2] border-r border-[#e8e4df] flex flex-col fixed left-0 top-0">
			{/* App Name */}
			<div className="px-5 py-5">
				<h1 className="font-serif text-lg font-semibold text-[#2d2a26] tracking-tight">Trace</h1>
			</div>

			{/* Main Navigation */}
			<nav className="flex-1 px-3">
				<div className="space-y-0.5">
					{mainNav.map((item) => (
						<a
							key={item.title}
							href={item.path}
							className={cn(
								"flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
								item.isActive
									? "bg-[#e8e4df] text-[#2d2a26]"
									: "text-[#6b6560] hover:bg-[#edeae6] hover:text-[#2d2a26]"
							)}
						>
							{item.icon}
							<span>{item.title}</span>
						</a>
					))}
				</div>
			</nav>

			{/* Bottom Section */}
			<div className="px-3 pb-4 space-y-0.5">
				{bottomNav.map((item) => (
					<a
						key={item.title}
						href={item.path}
						className={cn(
							"flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
							item.isActive
								? "bg-[#e8e4df] text-[#2d2a26]"
								: "text-[#6b6560] hover:bg-[#edeae6] hover:text-[#2d2a26]"
						)}
					>
						{item.icon}
						<span>{item.title}</span>
					</a>
				))}

				{/* User Profile */}
				<a
					href="#profile"
					className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[#6b6560] hover:bg-[#edeae6] hover:text-[#2d2a26] transition-colors mt-2"
				>
					<User className="size-[18px]" />
					<span>Profile</span>
				</a>
			</div>
		</aside>
	);
}
