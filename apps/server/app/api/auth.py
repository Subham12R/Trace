from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.auth import get_credential, set_credential, delete_credential, has_credential

router = APIRouter()

ALLOWED_PROVIDERS = {"anthropic", "opencode-cloud", "trace-cloud"}

CREDENTIAL_VALIDATORS = {
    "anthropic": lambda k: k.startswith("sk-ant-") and len(k) > 20,
    "opencode-cloud": lambda k: len(k) > 10,
    "trace-cloud": lambda k: len(k) > 10,
}


class CredentialInput(BaseModel):
    provider: str
    credential: str


@router.get("/status")
def auth_status():
    """Return authentication status for all cloud-syncable providers."""
    providers = ["anthropic", "opencode-cloud", "trace-cloud"]
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
    validator = CREDENTIAL_VALIDATORS.get(provider)
    if validator and not validator(data.credential):
        raise HTTPException(status_code=400, detail="Invalid credential format")
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
