PRICING_TABLE = {
    # Anthropic
    "claude-sonnet-4-20250514": {"input": 3.0, "output": 15.0, "cache_read": 0.3, "cache_write": 3.75},
    "claude-sonnet-4-20250514": {"input": 3.0, "output": 15.0, "cache_read": 0.3, "cache_write": 3.75},
    "claude-3-5-sonnet": {"input": 3.0, "output": 15.0, "cache_read": 0.3, "cache_write": 3.75},
    "claude-3-opus": {"input": 15.0, "output": 75.0, "cache_read": 1.5, "cache_write": 18.75},
    "claude-3-haiku": {"input": 0.25, "output": 1.25, "cache_read": 0.03, "cache_write": 0.3},

    # OpenAI
    "gpt-4o": {"input": 5.0, "output": 15.0, "cache_read": 2.5, "cache_write": 5.0},
    "gpt-4o-mini": {"input": 0.15, "output": 0.6, "cache_read": 0.075, "cache_write": 0.15},
    "o3-mini": {"input": 1.1, "output": 4.4, "cache_read": 0.55, "cache_write": 1.1},
    "o1": {"input": 15.0, "output": 60.0, "cache_read": 7.5, "cache_write": 15.0},

    # Google
    "gemini-2.5-pro": {"input": 1.25, "output": 10.0, "cache_read": 0.0, "cache_write": 0.0},
    "gemini-2.5-flash": {"input": 0.15, "output": 0.6, "cache_read": 0.0, "cache_write": 0.0},
    "gemini-1.5-pro": {"input": 1.25, "output": 5.0, "cache_read": 0.0, "cache_write": 0.0},

    # Fallback
    "default": {"input": 1.0, "output": 3.0, "cache_read": 0.0, "cache_write": 0.0},
}


def calculate_cost(model: str | None, input_tokens: int, output_tokens: int, cache_read: int, cache_write: int) -> float:
    if not model:
        rates = PRICING_TABLE["default"]
    else:
        rates = PRICING_TABLE.get(model.lower(), PRICING_TABLE["default"])
        # Try partial match
        if rates is PRICING_TABLE["default"]:
            for key, rate in PRICING_TABLE.items():
                if key != "default" and key in model.lower():
                    rates = rate
                    break

    # Rates are per 1M tokens
    cost = (
        (input_tokens / 1_000_000) * rates["input"] +
        (output_tokens / 1_000_000) * rates["output"] +
        (cache_read / 1_000_000) * rates["cache_read"] +
        (cache_write / 1_000_000) * rates["cache_write"]
    )
    return round(cost, 6)
