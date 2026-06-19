def get_time_bucket_expr(range: str) -> str:
    """Return SQLite strftime format for time bucketing."""
    if range == "today":
        return "%H"  # hour
    elif range == "week":
        return "%Y-%m-%d"  # day
    elif range == "month":
        return "%Y-%m-%d"  # day
    else:
        return "%Y-%m"  # month
