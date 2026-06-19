from abc import ABC, abstractmethod
from pathlib import Path
from typing import Iterator, Dict, Any


class BaseParser(ABC):
    @abstractmethod
    def parse(self, file_path: Path) -> Iterator[Dict[str, Any]]:
        """Yield normalized request records from the file."""
        pass

    @abstractmethod
    def can_parse(self, file_path: Path) -> bool:
        """Return True if this parser can handle the given file."""
        pass
