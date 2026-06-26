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
	src: string | null;
	accent: string;
	family: string;
}

const NEUTRAL = "#171717";
const B = import.meta.env.BASE_URL;

/** Matched against the lowercased model name, in order. First hit wins. */
const MODEL_RULES: ArtRule[] = [
	{ test: /(claude|anthropic|sonnet|opus|haiku)/, src: `${B}logos/claude.png`, accent: "#d97757", family: "Anthropic" },
	{ test: /(gpt|chatgpt|davinci|codex|^o[1-9]|-o[1-9]|openai)/, src: `${B}logos/openai.svg`, accent: "#10a37f", family: "OpenAI" },
	{ test: /(gemini)/, src: `${B}logos/gemini.svg`, accent: "#4285f4", family: "Gemini" },
	{ test: /(gemma)/, src: `${B}logos/gemma.png`, accent: "#f2a900", family: "Gemma" },
	{ test: /(kimi|moonshot)/, src: `${B}logos/kimi.png`, accent: "#ff9d00", family: "Moonshot" },
	{ test: /(llama|meta-)/, src: `${B}logos/meta.svg`, accent: "#0467df", family: "Meta" },
	{ test: /(mistral|mixtral|codestral|ministral)/, src: `${B}logos/mistral.svg`, accent: "#fa520f", family: "Mistral" },
	{ test: /(deepseek)/, src: `${B}logos/deepseek.svg`, accent: "#4d6bfe", family: "DeepSeek" },
	{ test: /(qwen|tongyi)/, src: `${B}logos/qwen.png`, accent: "#615ced", family: "Qwen" },
	{ test: /(grok|xai)/, src: `${B}logos/xai.svg`, accent: NEUTRAL, family: "xAI" },
	{ test: /(perplexity|sonar)/, src: `${B}logos/perplexity.svg`, accent: "#20808d", family: "Perplexity" },
	{ test: /(copilot)/, src: `${B}logos/github.svg`, accent: "#6e40c9", family: "Copilot" },
	{ test: /(cursor)/, src: `${B}logos/cursor.png`, accent: "#00bcd4", family: "Cursor" },
	{ test: /(antigravity)/, src: `${B}logos/antigravity.jpg`, accent: "#34a853", family: "Antigravity" },
	{ test: /(codellama)/, src: `${B}logos/meta.svg`, accent: "#0467df", family: "CodeLlama" },
	{ test: /(phi[\d]?)/, src: null, accent: "#0078d4", family: "Microsoft Phi" },
	{ test: /(falcon)/, src: null, accent: "#ff6b35", family: "Falcon" },
	{ test: /(starcoder)/, src: null, accent: "#ffd700", family: "StarCoder" },
	{ test: /(command-r)/, src: null, accent: "#39a7d0", family: "Cohere" },
];

/** Fallback by provider/source id when the model name carries no family signal. */
const SOURCE_RULES: Record<string, ArtRule> = {
	claude: { test: /./, src: `${B}logos/claude.png`, accent: "#d97757", family: "Anthropic" },
	codex: { test: /./, src: `${B}logos/openai.svg`, accent: "#10a37f", family: "OpenAI" },
	copilot: { test: /./, src: `${B}logos/github.svg`, accent: "#6e40c9", family: "Copilot" },
	gemini: { test: /./, src: `${B}logos/gemini.svg`, accent: "#4285f4", family: "Gemini" },
	ollama: { test: /./, src: `${B}logos/ollama.svg`, accent: NEUTRAL, family: "Ollama" },
	qwen: { test: /./, src: `${B}logos/qwen.png`, accent: "#615ced", family: "Qwen" },
	kimi: { test: /./, src: `${B}logos/kimi.png`, accent: "#ff9d00", family: "Moonshot" },
	cursor: { test: /./, src: `${B}logos/cursor.png`, accent: "#00bcd4", family: "Cursor" },
	antigravity: { test: /./, src: `${B}logos/antigravity.jpg`, accent: "#34a853", family: "Antigravity" },
};

const DEFAULT_ART: ModelArt = { src: null, accent: NEUTRAL, family: "Model" };

export function getModelArt(model: string | null | undefined, source?: string | null): ModelArt {
	// Local / HuggingFace model paths (e.g. "models/llm/models/…", "org/repo")
	// carry no brand signal of their own — badge them with the Hugging Face art.
	const raw = (typeof model === "string" ? model : "").toLowerCase();
	if (/models\/llm\/models\//.test(raw) || raw.includes("huggingface")) {
		return { src: `${B}logos/hugging.png`, accent: "#ffd21e", family: "Hugging Face" };
	}

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
