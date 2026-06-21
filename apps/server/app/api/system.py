import getpass
import os
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class SystemUser(BaseModel):
    name: str
    avatar_url: str | None = None


def _find_windows_account_picture() -> str | None:
    """Best-effort lookup of the Windows account picture."""
    appdata = os.environ.get("APPDATA")
    if not appdata:
        return None
    account_dir = Path(appdata) / "Microsoft" / "Windows" / "AccountPictures"
    if not account_dir.exists():
        return None
    # Prefer larger images (e.g., 448x448 or 192x192) over thumbnails.
    candidates = sorted(
        [p for p in account_dir.iterdir() if p.suffix.lower() in (".png", ".jpg", ".jpeg", ".bmp")],
        key=lambda p: p.stat().st_size,
        reverse=True,
    )
    if candidates:
        return candidates[0].as_uri()
    return None


@router.get("/proxy-status")
def proxy_status():
    """Return Ollama proxy status and request count."""
    from app.services.ollama_proxy import get_proxy_status
    return get_proxy_status()


@router.get("/user", response_model=SystemUser)
def get_system_user():
    name = getpass.getuser()
    # Title-case the raw username for display friendliness.
    display_name = name.replace(".", " ").replace("_", " ").title()
    avatar_url = _find_windows_account_picture()
    return SystemUser(name=display_name, avatar_url=avatar_url)
