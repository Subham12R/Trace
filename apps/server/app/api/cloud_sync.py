import threading
from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional

from app.services.cloud_sync import fetch_anthropic_usage, fetch_claude_oauth_usage, fetch_opencode_cloud_usage
from app.services.auth import set_credential, delete_credential

router = APIRouter()


class TokenInput(BaseModel):
    credential: str


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


# ── Trace Cloud account / sync endpoints ──────────────────────────────────────

@router.get("/account")
def cloud_account():
    """Return cloud account info if a JWT is stored, else {logged_in: false}."""
    from app.services.cloud_account import get_cloud_token, get_cloud_account
    token = get_cloud_token()
    if not token:
        return {"logged_in": False}
    info = get_cloud_account(token)
    if not info:
        return {"logged_in": False}
    return {"logged_in": True, **info}


@router.post("/token")
def store_cloud_token(data: TokenInput):
    """Store a JWT received from the Trace Cloud OAuth callback."""
    from app.services.cloud_account import register_device
    success = set_credential("trace-cloud", data.credential)
    if success:
        threading.Thread(target=register_device, args=(data.credential,), daemon=True).start()
    return {"stored": success}


@router.post("/logout")
def cloud_logout():
    """Remove the locally stored Trace Cloud JWT."""
    success = delete_credential("trace-cloud")
    return {"logged_out": success}


@router.post("/sync")
def trigger_sync():
    """Manually push unsynced rows to Trace Cloud."""
    from app.services.cloud_account import get_cloud_token, sync_to_cloud
    token = get_cloud_token()
    if not token:
        return {"error": "not logged in"}
    threading.Thread(target=sync_to_cloud, args=(token,), daemon=True).start()
    return {"triggered": True}
