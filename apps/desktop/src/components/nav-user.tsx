"use client";

import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, LogOut } from "lucide-react";

const user = {
	name: "User",
	email: "local@trace.app",
	avatar: "/images/icon.png",
};

export function NavUser() {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger>
				<Avatar className="size-8 cursor-pointer border border-border">
					<AvatarImage src={user.avatar} />
					<AvatarFallback className="bg-accent text-accent-foreground text-xs">
						{user.name.charAt(0)}
					</AvatarFallback>
				</Avatar>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuLabel className="flex items-center gap-3">
					<Avatar className="size-10 border border-border">
						<AvatarImage src={user.avatar} />
						<AvatarFallback className="bg-accent text-accent-foreground">
							{user.name.charAt(0)}
						</AvatarFallback>
					</Avatar>
					<div>
						<p className="font-medium text-foreground">{user.name}</p>
						<p className="text-muted-foreground text-xs">{user.email}</p>
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem>
					<a href="#settings" className="flex items-center gap-2 cursor-pointer">
						<Settings className="size-4" />
						Settings
					</a>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem className="text-destructive cursor-pointer">
					<LogOut className="size-4" />
					Quit Trace
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
