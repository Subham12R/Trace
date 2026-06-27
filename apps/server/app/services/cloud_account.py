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

                payload = [
                    {
                        "source": r.source,
                        "model": r.model,
                        "timestamp": r.timestamp.isoformat() if r.timestamp else None,
                        "session_id": r.session_id,
                        "input_tokens": r.input_tokens,
                        "output_tokens": r.output_tokens,
                        "cache_read_tokens": r.cache_read_tokens,
                        "cache_write_tokens": r.cache_write_tokens,
                        "cost": r.cost,
                        "project": r.project,
                        "branch": r.branch,
                        "latency_ms": r.latency_ms,
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
