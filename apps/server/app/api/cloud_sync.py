from fastapi import APIRouter, Query
from typing import Optional

from app.services.cloud_sync import fetch_anthropic_usage, fetch_claude_oauth_usage, fetch_opencode_cloud_usage

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


@router.get("/claude")
def claude_oauth_usage():
    """Fetch real Claude Code quota via its OAuth session."""
    data = fetch_claude_oauth_usage()
    return {
        "provider": "claude-oauth",
        "data": data,
        "connected": data is not None,
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
