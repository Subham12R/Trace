import { useState } from "react";
import type { ProviderInfo } from "@/hooks/useMetrics";

interface ProviderLogoProps {
	provider: ProviderInfo;
	size?: "sm" | "md" | "lg";
}

const sizeClasses = {
	sm: { box: "size-6 text-[8px]", pad: "" },
	md: { box: "size-8 text-[10px]", pad: "" },
	lg: { box: "size-10 text-xs", pad: "" },
};

export function ProviderLogo({ provider, size = "md" }: ProviderLogoProps) {
	const [failed, setFailed] = useState(false);
	const s = sizeClasses[size];

	if (provider.logo_url && !failed) {
		return (
			<img
				src={provider.logo_url}
				alt={provider.name}
				className={`${s.box} rounded-md object-cover shrink-0`}
				onError={() => setFailed(true)}
				loading="lazy"
			/>
		);
	}

	return (
		<div
			className={`${s.box} shrink-0 rounded-md bg-[#171717] flex items-center justify-center font-semibold text-[#fffbf7] uppercase`}
		>
			{provider.name.slice(0, 2)}
		</div>
	);
}
