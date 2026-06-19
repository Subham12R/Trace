from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.auth import get_credential, set_credential, delete_credential, has_credential

router = APIRouter()

ALLOWED_PROVIDERS = {"anthropic", "opencode-cloud"}


class CredentialInput(BaseModel):
    provider: str
    credential: str


@router.get("/status")
def auth_status():
    """Return authentication status for all cloud-syncable providers."""
    providers = ["anthropic", "opencode-cloud"]
    return {
        provider: {
            "connected": has_credential(provider),
            "provider": provider,
        }
        for provider in providers
    }


@router.get("/{provider}/status")
def provider_status(provider: str):
    return {
        "provider": provider,
        "connected": has_credential(provider),
    }


@router.post("/{provider}/connect")
def connect_provider(provider: str, data: CredentialInput):
    if provider not in ALLOWED_PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")
    success = set_credential(provider, data.credential)
    return {
        "provider": provider,
        "connected": success and has_credential(provider),
    }


@router.delete("/{provider}/disconnect")
def disconnect_provider(provider: str):
    if provider not in ALLOWED_PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")
    success = delete_credential(provider)
    return {
        "provider": provider,
        "connected": not has_credential(provider) if success else True,
    }
