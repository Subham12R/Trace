import getpass
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import func

from app.core.database import SessionLocal
from app.models.models import Request
from app.services.cloud_sync import fetch_claude_oauth_usage

router = APIRouter()


class SystemUser(BaseModel):
    name: str
    avatar_url: str | None = None


class RollingUsage(BaseModel):
    used: int
    limit: int
    percent: float
    reset_at: str


class WeeklyUsage(BaseModel):
    tokens: int
    cost: float


class ClaudeUsageResponse(BaseModel):
    rolling: Optional[RollingUsage]
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


def _parse_rolling(raw: dict | None) -> Optional[RollingUsage]:
    """
    Parse the Claude OAuth usage response into RollingUsage.

    The real response shape (observed 2026-06):
      raw["five_hour"]["utilization"] -> float percent (0-100)
      raw["five_hour"]["resets_at"]   -> ISO 8601 string
    The session limit exposes only a utilization percentage, not absolute
    message counts, so used=percent and limit=100 faithfully represent the data.
    """
    if not raw or not isinstance(raw, dict):
        return None
    try:
        five_hour = raw.get("five_hour")
        if not five_hour or not isinstance(five_hour, dict):
            return None
        percent = five_hour.get("utilization")
        reset_at = five_hour.get("resets_at") or ""
        if percent is None:
            return None
        percent = float(percent)
        used = int(round(percent))
        limit = 100
        return RollingUsage(used=used, limit=limit, percent=round(percent, 1), reset_at=str(reset_at))
    except Exception:
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
    raw = fetch_claude_oauth_usage()
    rolling = _parse_rolling(raw)
    weekly = _weekly_usage()
    return ClaudeUsageResponse(rolling=rolling, weekly=weekly)
