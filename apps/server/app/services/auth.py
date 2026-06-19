import keyring
from typing import Optional

SERVICE_NAME = "trace-ai"


def get_credential(provider: str) -> Optional[str]:
    """Retrieve stored API key/token for a provider."""
    try:
        return keyring.get_password(SERVICE_NAME, provider)
    except Exception:
        return None


def set_credential(provider: str, credential: str) -> bool:
    """Store API key/token for a provider."""
    try:
        keyring.set_password(SERVICE_NAME, provider, credential)
        return True
    except Exception:
        return False


def delete_credential(provider: str) -> bool:
    """Delete stored credential for a provider."""
    try:
        keyring.delete_password(SERVICE_NAME, provider)
        return True
    except Exception:
        return False


def has_credential(provider: str) -> bool:
    return get_credential(provider) is not None
