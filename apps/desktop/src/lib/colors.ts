// Charts are grayscale. These mid-range zinc shades read on both the light
// and dark canvases, and the ramp keeps multiple series distinguishable.
const GRAYSCALE = [
	"#52525b", // zinc-600
	"#a1a1aa", // zinc-400
	"#3f3f46", // zinc-700
	"#71717a", // zinc-500
	"#d4d4d8", // zinc-300
	"#646464",
	"#b8b8b8",
	"#8a8a8a",
];

function hashIndex(s: string): number {
	let h = 0;
	for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
	return h;
}

export function getProviderColor(provider: string | null | undefined, index: number = 0): string {
	// Use the series index when given (multi-series charts); otherwise derive a
	// stable shade from the provider name so single bars still vary per provider.
	const i = index > 0 ? index : hashIndex(provider ?? "");
	return GRAYSCALE[i % GRAYSCALE.length];
}
