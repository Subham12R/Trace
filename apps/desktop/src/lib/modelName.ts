export function extractModelName(model: string | null | undefined): string {
	if (!model) return "unknown";
	if (typeof model !== "string") return String(model);

	// Some backends store model as a JSON string like {"id":"kimi-k2.6",...}
	if (model.startsWith("{") && model.endsWith("}")) {
		try {
			const parsed = JSON.parse(model);
			if (parsed && typeof parsed === "object") {
				return parsed.id || parsed.name || model;
			}
		} catch {
			// fall through
		}
	}

	// Local / HuggingFace style paths, e.g. "models/llm/models/Qwen2.5-7B" or
	// "meta-llama/Llama-3-8B" — show the final path segment as the name.
	if (model.includes("/")) {
		const segment = model.split("/").filter(Boolean).pop();
		if (segment) return segment;
	}

	return model;
}
