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

	return model;
}
