import subprocess
from pathlib import Path
from functools import lru_cache


@lru_cache(maxsize=128)
def get_branch(path: str | None) -> str | None:
    """Return the current git branch for a directory, if any."""
    if not path:
        return None
    try:
        result = subprocess.run(
            ["git", "-C", str(Path(path)), "branch", "--show-current"],
            capture_output=True,
            text=True,
            timeout=3,
            check=False,
        )
        branch = result.stdout.strip()
        return branch if branch else None
    except Exception:
        return None
