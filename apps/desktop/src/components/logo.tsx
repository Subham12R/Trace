import type React from "react";

export const LogoIcon = (props: React.ComponentProps<"img">) => (
	<img
		src="/images/icon.png"
		alt="Trace"
		className="size-8 object-contain"
		{...props}
	/>
);

export const Logo = (props: React.ComponentProps<"img">) => (
	<img
		src="/images/banner.png"
		alt="Trace"
		className="h-6 object-contain"
		{...props}
	/>
);
