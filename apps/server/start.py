import os
import sys

# Ensure app is importable
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app
import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("TRACE_PORT", 8765))
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")
