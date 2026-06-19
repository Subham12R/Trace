import { extractModelName } from "@/lib/modelName";

export interface ModelArt {
	/** Public path to the brand logo, or null when no art is available. */
	src: string | null;
	/** Brand accent used for the badge ring / tint. */
	accent: string;
	/** Short human label for the model family. */
	family: string;
}

interface ArtRule {
	test: RegExp;
	src: string;
	accent: string;
	family: string;
}

const NEUTRAL = "#171717";

/** Matched against the lowercased model name, in order. First hit wins. */
const MODEL_RULES: ArtRule[] = [
	{ test: /(claude|anthropic|sonnet|opus|haiku)/, src: "/logos/claude.png", accent: "#d97757", family: "Anthropic" },
	{ test: /(gpt|chatgpt|davinci|codex|^o[1-9]|-o[1-9]|openai)/, src: "/logos/openai.svg", accent: "#10a37f", family: "OpenAI" },
	{ test: /(gemini)/, src: "/logos/gemini.svg", accent: "#4285f4", family: "Gemini" },
	{ test: /(gemma)/, src: "/logos/gemma.png", accent: "#f2a900", family: "Gemma" },
	{ test: /(kimi|moonshot)/, src: "/logos/kimi.png", accent: "#ff9d00", family: "Moonshot" },
	{ test: /(llama|meta-)/, src: "/logos/meta.svg", accent: "#0467df", family: "Meta" },
	{ test: /(mistral|mixtral|codestral|ministral)/, src: "/logos/mistral.svg", accent: "#fa520f", family: "Mistral" },
	{ test: /(deepseek)/, src: "/logos/deepseek.svg", accent: "#4d6bfe", family: "DeepSeek" },
	{ test: /(qwen|tongyi)/, src: "/logos/qwen.png", accent: "#615ced", family: "Qwen" },
	{ test: /(grok|xai)/, src: "/logos/xai.svg", accent: NEUTRAL, family: "xAI" },
	{ test: /(perplexity|sonar)/, src: "/logos/perplexity.svg", accent: "#20808d", family: "Perplexity" },
	{ test: /(copilot)/, src: "/logos/github.svg", accent: "#6e40c9", family: "Copilot" },
	{ test: /(cursor)/, src: "/logos/cursor.png", accent: "#00bcd4", family: "Cursor" },
	{ test: /(antigravity)/, src: "/logos/antigravity.jpg", accent: "#34a853", family: "Antigravity" },
];

/** Fallback by provider/source id when the model name carries no family signal. */
const SOURCE_RULES: Record<string, ArtRule> = {
	claude: { test: /./, src: "/logos/claude.png", accent: "#d97757", family: "Anthropic" },
	codex: { test: /./, src: "/logos/openai.svg", accent: "#10a37f", family: "OpenAI" },
	copilot: { test: /./, src: "/logos/github.svg", accent: "#6e40c9", family: "Copilot" },
	gemini: { test: /./, src: "/logos/gemini.svg", accent: "#4285f4", family: "Gemini" },
	ollama: { test: /./, src: "/logos/ollama.svg", accent: NEUTRAL, family: "Ollama" },
	qwen: { test: /./, src: "/logos/qwen.png", accent: "#615ced", family: "Qwen" },
	kimi: { test: /./, src: "/logos/kimi.png", accent: "#ff9d00", family: "Moonshot" },
	cursor: { test: /./, src: "/logos/cursor.png", accent: "#00bcd4", family: "Cursor" },
	antigravity: { test: /./, src: "/logos/antigravity.jpg", accent: "#34a853", family: "Antigravity" },
};

const DEFAULT_ART: ModelArt = { src: null, accent: NEUTRAL, family: "Model" };

export function getModelArt(model: string | null | undefined, source?: string | null): ModelArt {
	const name = extractModelName(model).toLowerCase();

	for (const rule of MODEL_RULES) {
		if (rule.test.test(name)) {
			return { src: rule.src, accent: rule.accent, family: rule.family };
		}
	}

	if (source) {
		const fallback = SOURCE_RULES[source.toLowerCase()];
		if (fallback) {
			return { src: fallback.src, accent: fallback.accent, family: fallback.family };
		}
	}

	return DEFAULT_ART;
}

/** First two meaningful characters for a monogram fallback. */
export function modelMonogram(model: string | null | undefined): string {
	const name = extractModelName(model).replace(/[^a-z0-9]/gi, "");
	return (name.slice(0, 2) || "?").toUpperCase();
}
