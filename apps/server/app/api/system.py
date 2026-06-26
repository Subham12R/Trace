import getpass
import os
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import func

from app.core.database import SessionLocal
from app.models.models import Request

router = APIRouter()


class SystemUser(BaseModel):
    name: str
    avatar_url: str | None = None


class WeeklyUsage(BaseModel):
    tokens: int
    cost: float


class ClaudeUsageResponse(BaseModel):
    weekly: WeeklyUsage


def _find_windows_account_picture() -> str | None:
    """Best-effort lookup of the Windows account picture."""
    appdata = os.environ.get("APPDATA")
    if not appdata:
        return None
    account_dir = Path(appdata) / "Microsoft" / "Windows" / "AccountPictures"
    if not account_dir.exists():
        return None
    candidates = sorted(
        [p for p in account_dir.iterdir() if p.suffix.lower() in (".png", ".jpg", ".jpeg", ".bmp")],
        key=lambda p: p.stat().st_size,
        reverse=True,
    )
    if candidates:
        return candidates[0].as_uri()
    return None


def _weekly_usage() -> WeeklyUsage:
    """Sum tokens and cost for Claude sources since Monday 00:00 UTC."""
    now = datetime.utcnow()
    monday = now - timedelta(
        days=now.weekday(),
        hours=now.hour,
        minutes=now.minute,
        seconds=now.second,
        microseconds=now.microsecond,
    )
    claude_sources = ("claude", "claude-code", "claude-cloud")

    db = SessionLocal()
    try:
        row = (
            db.query(
                func.coalesce(func.sum(Request.input_tokens + Request.output_tokens), 0).label("tokens"),
                func.coalesce(func.sum(Request.cost), 0.0).label("cost"),
            )
            .filter(
                Request.source.in_(claude_sources),
                Request.timestamp >= monday,
            )
            .one()
        )
        return WeeklyUsage(tokens=int(row.tokens), cost=round(float(row.cost), 4))
    finally:
        db.close()


@router.get("/proxy-status")
def proxy_status():
    """Return Ollama proxy status and request count."""
    from app.services.ollama_proxy import get_proxy_status
    return get_proxy_status()


@router.get("/user", response_model=SystemUser)
def get_system_user():
    name = getpass.getuser()
    display_name = name.replace(".", " ").replace("_", " ").title()
    avatar_url = _find_windows_account_picture()
    return SystemUser(name=display_name, avatar_url=avatar_url)


@router.get("/usage", response_model=ClaudeUsageResponse)
def get_claude_usage():
    """Weekly Claude token/cost totals from the local DB.

    Quota windows (5-hour / weekly utilization) come from /api/metrics/quota,
    which owns the single cached OAuth call — this endpoint stays DB-only so we
    don't double up on the rate-limited OAuth usage API.
    """
    return ClaudeUsageResponse(weekly=_weekly_usage())
