"""
Local cloud account service.

Handles JWT token storage, device registration, and data sync to the
Trace Cloud backend (TRACE_CLOUD_URL). All network calls are best-effort
— errors are logged and swallowed so the local app always stays functional.
"""
import os
import platform
import sys
from datetime import datetime
from typing import Optional

from app.services.auth import get_credential, delete_credential

CLOUD_API = os.environ.get("TRACE_CLOUD_URL", "https://trace.monostack.in")


def get_cloud_token() -> Optional[str]:
    return get_credential("trace-cloud")


def register_device(token: str) -> bool:
    """POST device info to CLOUD_API/devices/register."""
    try:
        import httpx
        from app.services.auth import set_credential
        with httpx.Client(timeout=10) as c:
            r = c.post(
                f"{CLOUD_API}/devices/register",
                json={
                    "name": platform.node(),
                    "platform": sys.platform,
                    "version": "0.5.0",
                },
                headers={"Authorization": f"Bearer {token}"},
            )
            if r.is_success:
                try:
                    data = r.json()
                    device_id = data.get("id")
                    if device_id:
                        set_credential("trace-cloud-device-id", device_id)
                except Exception as ex:
                    print(f"[CloudAccount] failed to parse/store device id: {ex}")
            return r.is_success
    except Exception as e:
        print(f"[CloudAccount] register_device error: {e}")
        return False


def sync_to_cloud(token: str):
    """Batch-push all unsynced Request rows (cloud_synced_at IS NULL) to CLOUD_API/sync/push."""
    from app.core.database import SessionLocal
    from app.models.models import Request

    import httpx
    BATCH = 500

    db = SessionLocal()
    try:
        with httpx.Client(timeout=15) as c:
            while True:
                rows = (
                    db.query(Request)
                    .filter(Request.cloud_synced_at.is_(None))
                    .limit(BATCH)
                    .all()
                )
                if not rows:
                    break

                def _iso(dt):
                    if not dt:
                        return None
                    s = dt.isoformat()
                    return s if (s.endswith("Z") or "+" in s) else s + "Z"

                payload = [
                    {
                        "source": (r.source or "unknown")[:100],
                        "model": (r.model[:200] if r.model else None),
                        "timestamp": _iso(r.timestamp),
                        "session_id": (r.session_id[:128] if r.session_id else None),
                        "input_tokens": min(10_000_000, max(0, int(r.input_tokens or 0))),
                        "output_tokens": min(10_000_000, max(0, int(r.output_tokens or 0))),
                        "cache_read_tokens": min(10_000_000, max(0, int(r.cache_read_tokens or 0))),
                        "cache_write_tokens": min(10_000_000, max(0, int(r.cache_write_tokens or 0))),
                        "cost": min(100.0, max(0.0, float(r.cost or 0.0))),
                        "project": (r.project[:500] if r.project else None),
                        "branch": (r.branch[:500] if r.branch else None),
                        "latency_ms": (min(3_600_000, max(0, int(r.latency_ms))) if r.latency_ms is not None else None),
                    }
                    for r in rows
                ]

                headers = {"Authorization": f"Bearer {token}"}
                device_id = get_credential("trace-cloud-device-id")
                if device_id:
                    headers["X-Device-Id"] = device_id

                resp = c.post(
                    f"{CLOUD_API}/sync/push",
                    json=payload,
                    headers=headers,
                )
                if not resp.is_success:
                    print(f"[CloudAccount] sync/push returned {resp.status_code}, aborting batch")
                    break

                now = datetime.utcnow()
                for r in rows:
                    r.cloud_synced_at = now
                db.commit()
    except Exception as e:
        print(f"[CloudAccount] sync_to_cloud error: {e}")
        db.rollback()
    finally:
        db.close()


def get_cloud_account(token: str) -> Optional[dict]:
    """Fetch account info from CLOUD_API/account."""
    try:
        import httpx
        with httpx.Client(timeout=10) as c:
            r = c.get(
                f"{CLOUD_API}/account",
                headers={"Authorization": f"Bearer {token}"},
            )
            return r.json() if r.is_success else None
    except Exception as e:
        print(f"[CloudAccount] get_cloud_account error: {e}")
        return None
