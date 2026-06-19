const PROVIDER_COLORS: Record<string, string> = {
	claude: "#d97757", // Warm rust / terracotta
	anthropic: "#d97757",
	openai: "#10a37f", // OpenAI emerald green
	gemini: "#4285f4", // Gemini blue
	gemma: "#f2a900", // Gemma amber / gold
	kimi: "#ff9d00", // Moonshot / Kimi orange
	moonshot: "#ff9d00",
	meta: "#0467df", // Meta blue
	llama: "#0467df",
	mistral: "#fa520f", // Mistral orange
	deepseek: "#4d6bfe", // DeepSeek blue
	qwen: "#615ced", // Qwen purple
	opencode: "#a855f7", // OpenCode purple
	ollama: "#858585", // Ollama grey
	perplexity: "#20808d", // Perplexity teal
	groq: "#f59e0b", // Groq amber
	cursor: "#00bcd4", // Cursor — bright cyan
	antigravity: "#34a853", // Antigravity — Google green
	codex: "#10a37f", // OpenAI Codex — same as OpenAI
	copilot: "#6e40c9", // GitHub Copilot purple
	geminicode: "#4285f4",
};

const FALLBACK_COLORS = [
	"#d97757", // Warm rust
	"#10a37f", // Emerald
	"#4285f4", // Blue
	"#a855f7", // Purple
	"#ec4899", // Pink
	"#06b6d4", // Cyan
	"#f59e0b", // Amber
	"#14b8a6", // Teal
	"#6366f1", // Indigo
];

export function getProviderColor(provider: string | null | undefined, index: number = 0): string {
	if (!provider) return FALLBACK_COLORS[index % FALLBACK_COLORS.length];
	const key = provider.toLowerCase().trim();
	if (PROVIDER_COLORS[key]) {
		return PROVIDER_COLORS[key];
	}
	// Try fuzzy matching
	for (const [name, color] of Object.entries(PROVIDER_COLORS)) {
		if (key.includes(name) || name.includes(key)) {
			return color;
		}
	}
	return FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}
