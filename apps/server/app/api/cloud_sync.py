from fastapi import APIRouter, Query
from typing import Optional

from app.services.cloud_sync import fetch_anthropic_usage, fetch_opencode_cloud_usage

router = APIRouter()


@router.get("/anthropic")
def anthropic_usage(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
):
    """Fetch Claude Code / Anthropic API usage."""
    data = fetch_anthropic_usage(start_date, end_date)
    return {
        "provider": "anthropic",
        "data": data,
        "count": len(data),
    }


@router.get("/opencode")
def opencode_usage(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
):
    """Fetch OpenCode cloud usage."""
    data = fetch_opencode_cloud_usage(start_date, end_date)
    return {
        "provider": "opencode-cloud",
        "data": data,
        "count": len(data),
    }
