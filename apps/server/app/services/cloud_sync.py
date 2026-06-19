import json
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Any, Optional

import httpx

from app.services.auth import get_credential
from app.core.database import SessionLocal
from app.models.models import Request

ANTHROPIC_BASE_URL = "https://api.anthropic.com/v1"
OAUTH_USAGE_URL = "https://api.anthropic.com/api/oauth/usage"


def _anthropic_headers(api_key: str) -> Dict[str, str]:
    return {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }


def _get_anthropic_org_ids(client: httpx.Client, api_key: str) -> List[str]:
    """Try multiple endpoints to discover organization IDs."""
    endpoints = ["/organizations", "/me", "/account"]
    for endpoint in endpoints:
        try:
            response = client.get(
                f"{ANTHROPIC_BASE_URL}{endpoint}",
                headers=_anthropic_headers(api_key),
            )
            response.raise_for_status()
            data = response.json()

            # Try to extract org IDs from various response shapes
            if "organizations" in data:
                return [o.get("id") for o in data["organizations"] if o.get("id")]
            if "id" in data and isinstance(data["id"], str):
                return [data["id"]]
            if "organization" in data and data["organization"].get("id"):
                return [data["organization"]["id"]]
            if "memberships" in data:
                return [m.get("organization", {}).get("id") for m in data["memberships"] if m.get("organization", {}).get("id")]
        except Exception:
            continue
    return []


def fetch_anthropic_usage(start_date: Optional[str] = None, end_date: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Fetch usage data from Anthropic API and store in local DB.
    """
    api_key = get_credential("anthropic")
    if not api_key:
        return []

    if not end_date:
        end_date = datetime.utcnow().strftime("%Y-%m-%d")
    if not start_date:
        start_date = (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%d")

    try:
        with httpx.Client(timeout=30.0) as client:
            org_ids = _get_anthropic_org_ids(client, api_key)

            if not org_ids:
                print("[CloudSync] No Anthropic organizations found")
                return []

            all_usage = []
            for org_id in org_ids:
                usage_response = client.get(
                    f"{ANTHROPIC_BASE_URL}/organizations/{org_id}/usage",
                    headers=_anthropic_headers(api_key),
                    params={"start_date": start_date, "end_date": end_date},
                )
                usage_response.raise_for_status()
                usage_data = usage_response.json().get("data", [])
                all_usage.extend(usage_data)

            # Store in DB
            _store_anthropic_usage(all_usage)
            return all_usage
    except Exception as e:
        print(f"[CloudSync] Anthropic fetch error: {e}")
        return []


def _store_anthropic_usage(usage_data: List[Dict[str, Any]]):
    """Store Anthropic usage data in local SQLite as source='claude-cloud'."""
    db = SessionLocal()
    try:
        for item in usage_data:
            date_str = item.get("date") or item.get("timestamp")
            if not date_str:
                continue

            if isinstance(date_str, str):
                try:
                    timestamp = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                except ValueError:
                    timestamp = datetime.utcnow()
            else:
                timestamp = datetime.utcnow()

            db.add(Request(
                source="claude-cloud",
                session_id=f"anthropic-{date_str}-{item.get('model', 'unknown')}",
                timestamp=timestamp,
                model=item.get("model"),
                input_tokens=item.get("input_tokens", 0),
                output_tokens=item.get("output_tokens", 0),
                cache_read_tokens=item.get("cache_read_tokens", 0),
                cache_write_tokens=item.get("cache_creation_input_tokens", 0),
                cost=item.get("cost", 0.0),
                project=None,
                latency_ms=None,
            ))
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[CloudSync] Error storing Anthropic usage: {e}")
    finally:
        db.close()


def _load_claude_credentials() -> Optional[Dict[str, Any]]:
    """Read Claude Code OAuth credentials from ~/.claude/.credentials.json."""
    paths = [
        Path.home() / ".claude" / ".credentials.json",
        Path.home() / ".config" / "claude" / ".credentials.json",
    ]
    for path in paths:
        try:
            if not path.exists():
                continue
            data = json.loads(path.read_text(encoding="utf-8"))
            oauth = data.get("claudeAiOauth", {})
            access_token = oauth.get("accessToken")
            if access_token:
                return oauth
        except Exception as e:
            print(f"[CloudSync] Failed to read credentials from {path}: {e}")
    return None


def fetch_claude_oauth_usage() -> Optional[Dict[str, Any]]:
    """
    Fetch real quota/usage from Anthropic's OAuth endpoint using Claude Code's
    existing credentials. Mirrors what the `/usage` command shows.
    """
    creds = _load_claude_credentials()
    if not creds:
        print("[CloudSync] No Claude Code OAuth credentials found")
        return None

    access_token = creds.get("accessToken")
    if not access_token:
        return None

    try:
        with httpx.Client(timeout=15.0) as client:
            response = client.get(
                OAUTH_USAGE_URL,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "anthropic-beta": "oauth-2025-04-20",
                    "Content-Type": "application/json",
                },
            )
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as e:
        print(f"[CloudSync] Claude OAuth usage HTTP error: {e.response.status_code} {e.response.text[:200]}")
        return None
    except Exception as e:
        print(f"[CloudSync] Claude OAuth usage error: {e}")
        return None


def fetch_opencode_cloud_usage(start_date: Optional[str] = None, end_date: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Fetch usage data from OpenCode cloud API.
    Requires OPENCODE_CLOUD_TOKEN stored in keyring.
    """
    token = get_credential("opencode-cloud")
    if not token:
        return []

    # TODO: Implement actual OpenCode cloud API call when available
    return []
